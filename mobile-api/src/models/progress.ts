import pool from '../config/database';
import { StudySession, StudyStats, FSRSCard, ReviewInput, CurationKind } from '../../../shared/types';
import { gradeCard } from '../utils/scheduler';

// Mirrors deck.ts ACCESSIBLE_DECK_IDS_SQL. $1 = user_id, $2 = restaurant_id.
const ACCESSIBLE_DECK_IDS_SQL = `
  SELECT d.id
  FROM decks d
  WHERE d.restaurant_id = $2
    AND (
      EXISTS (
        SELECT 1 FROM user_deck_access uda
        WHERE uda.user_id = $1 AND uda.deck_id = d.id
      )
      OR EXISTS (
        SELECT 1 FROM role_deck_access rda
        JOIN student_role_assignments sra ON sra.role_id = rda.role_id
        WHERE sra.user_id = $1 AND rda.deck_id = d.id
      )
    )
`;

export class ProgressModel {
  /**
   * Create a new study session. Caller must verify the deck or curation
   * kind is valid in the student's restaurant before calling. Exactly one
   * of deckId / curationKind must be set.
   */
  static async createStudySession(
    userId: string,
    target: { deckId: string; curationKind?: undefined } | { deckId?: undefined; curationKind: CurationKind },
  ): Promise<StudySession> {
    const query = `
      INSERT INTO study_sessions (user_id, deck_id, curation_kind)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, deck_id, curation_kind, cards_studied, correct_answers, average_rating
    `;

    const result = await pool.query(query, [
      userId,
      target.deckId ?? null,
      target.curationKind ?? null,
    ]);
    return mapSessionRow(result.rows[0]);
  }

  /**
   * End a study session
   */
  static async endStudySession(sessionId: string, stats: {
    cardsStudied: number;
    correctAnswers: number;
    averageRating: number;
  }): Promise<StudySession | null> {
    const query = `
      UPDATE study_sessions
      SET cards_studied = $2, correct_answers = $3, average_rating = $4
      WHERE id = $1
      RETURNING id, user_id, deck_id, curation_kind, cards_studied, correct_answers, average_rating
    `;

    const result = await pool.query(query, [
      sessionId,
      stats.cardsStudied,
      stats.correctAnswers,
      stats.averageRating
    ]);

    return result.rows[0] ? mapSessionRow(result.rows[0]) : null;
  }

  /**
   * Verify a card belongs to a deck in the given restaurant. Used by route
   * layer before recording an FSRS review against a card.
   */
  static async cardInRestaurant(cardId: string, restaurantId: string): Promise<boolean> {
    const query = `
      SELECT 1
      FROM cards c
      JOIN decks d ON d.id = c.deck_id
      WHERE c.id = $1 AND d.restaurant_id = $2
    `;
    const result = await pool.query(query, [cardId, restaurantId]);
    return result.rows.length > 0;
  }

  /**
   * Submit a card review and update FSRS data. Caller must verify the cardId
   * belongs to the student's restaurant before calling.
   */
  static async submitReview(userId: string, review: ReviewInput, sessionId?: string): Promise<FSRSCard> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get current FSRS card data
      let fsrsCard = await this.getFSRSCard(userId, review.cardId, client);

      // Calculate next review using FSRS
      const reviewResult = gradeCard(userId, fsrsCard, review.rating as 1 | 2 | 3 | 4);

      // Update or insert FSRS data
      const upsertQuery = `
        INSERT INTO fsrs_cards (
          card_id, user_id, difficulty, stability, retrievability, grade,
          lapses, reps, state, last_review, next_review, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, NOW())
        ON CONFLICT (card_id, user_id)
        DO UPDATE SET
          difficulty = $3,
          stability = $4,
          retrievability = $5,
          grade = $6,
          lapses = $7,
          reps = $8,
          state = $9,
          last_review = NOW(),
          next_review = $10,
          updated_at = NOW()
        RETURNING *
      `;

      const fsrsResult = await client.query(upsertQuery, [
        review.cardId,
        userId,
        reviewResult.difficulty,
        reviewResult.stability,
        reviewResult.retrievability,
        reviewResult.grade,
        reviewResult.lapses,
        reviewResult.reps,
        reviewResult.state,
        reviewResult.nextReview
      ]);

      // Record the review
      if (sessionId) {
        await client.query(`
          INSERT INTO card_reviews (session_id, card_id, fsrs_card_id, rating)
          VALUES ($1, $2, $3, $4)
        `, [sessionId, review.cardId, fsrsResult.rows[0].id, review.rating]);
      }

      await client.query('COMMIT');
      return mapFSRSRow(fsrsResult.rows[0], userId);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get user's study statistics (scoped to the student's restaurant).
   */
  static async getStudyStats(userId: string, restaurantId: string): Promise<StudyStats> {
    const totalCardsQuery = `
      WITH accessible AS (${ACCESSIBLE_DECK_IDS_SQL})
      SELECT COUNT(DISTINCT fc.card_id) as total
      FROM fsrs_cards fc
      JOIN cards c ON fc.card_id = c.id
      WHERE fc.user_id = $1 AND c.deck_id IN (SELECT id FROM accessible)
    `;

    const stateCountsQuery = `
      WITH accessible AS (${ACCESSIBLE_DECK_IDS_SQL})
      SELECT
        fc.state,
        COUNT(*) as count
      FROM fsrs_cards fc
      JOIN cards c ON fc.card_id = c.id
      WHERE fc.user_id = $1 AND c.deck_id IN (SELECT id FROM accessible)
      GROUP BY fc.state
    `;

    const dailyStatsQuery = `
      SELECT
        COUNT(DISTINCT cr.card_id) as studied,
        COUNT(CASE WHEN cr.rating >= 3 THEN 1 END) as correct
      FROM card_reviews cr
      JOIN study_sessions ss ON cr.session_id = ss.id
      WHERE ss.user_id = $1
    `;

    const newCardsQuery = `
      WITH accessible AS (${ACCESSIBLE_DECK_IDS_SQL})
      SELECT COUNT(*) as new_cards
      FROM cards c
      LEFT JOIN fsrs_cards fc ON c.id = fc.card_id AND fc.user_id = $1
      WHERE c.deck_id IN (SELECT id FROM accessible) AND fc.card_id IS NULL
    `;

    const [totalResult, statesResult, dailyResult, newResult] = await Promise.all([
      pool.query(totalCardsQuery, [userId, restaurantId]),
      pool.query(stateCountsQuery, [userId, restaurantId]),
      pool.query(dailyStatsQuery, [userId]),
      pool.query(newCardsQuery, [userId, restaurantId])
    ]);

    const states = statesResult.rows.reduce((acc: any, row: any) => {
      acc[row.state] = parseInt(row.count);
      return acc;
    }, {});

    return {
      totalCards: parseInt(totalResult.rows[0]?.total || '0'),
      newCards: parseInt(newResult.rows[0]?.new_cards || '0'),
      learningCards: (states.learning || 0) + (states.relearning || 0),
      reviewCards: states.review || 0,
      masteredCards: 0, // Could add logic for mastered cards
      dailyStats: {
        studied: parseInt(dailyResult.rows[0]?.studied || '0'),
        correct: parseInt(dailyResult.rows[0]?.correct || '0'),
        streak: 0 // TODO: implement streak calculation
      }
    };
  }

  /**
   * Get user's recent study sessions (scoped to caller's restaurant).
   * Includes both deck-tab and bulletin sessions; the deck join is left
   * outer so curation sessions (deck_id NULL) still surface.
   */
  static async getRecentSessions(userId: string, restaurantId: string, limit: number = 10): Promise<StudySession[]> {
    const query = `
      SELECT
        ss.id,
        ss.user_id,
        ss.deck_id,
        ss.curation_kind,
        ss.cards_studied,
        ss.correct_answers,
        ss.average_rating
      FROM study_sessions ss
      LEFT JOIN decks d ON ss.deck_id = d.id
      WHERE ss.user_id = $1
        AND ss.cards_studied > 0
        AND (d.restaurant_id = $2 OR ss.deck_id IS NULL)
      ORDER BY ss.created_at DESC
      LIMIT $3
    `;

    const result = await pool.query(query, [userId, restaurantId, limit]);
    return result.rows.map(mapSessionRow);
  }

  /**
   * Delete FSRS progress for the student. If deckIds is omitted, resets all
   * decks in the student's restaurant; otherwise restricts to the given
   * decks (also scoped to the restaurant so a student can't touch another
   * tenant's data). Returns the number of fsrs_cards rows removed.
   */
  static async resetFsrs(
    userId: string,
    restaurantId: string,
    deckIds?: string[],
  ): Promise<number> {
    if (deckIds && deckIds.length === 0) {
      return 0;
    }

    const params: any[] = [userId, restaurantId];
    let deckFilter = '';
    if (deckIds && deckIds.length > 0) {
      params.push(deckIds);
      deckFilter = 'AND d.id = ANY($3::uuid[])';
    }

    const query = `
      DELETE FROM fsrs_cards fc
      USING cards c, decks d
      WHERE fc.user_id = $1
        AND fc.card_id = c.id
        AND c.deck_id = d.id
        AND d.restaurant_id = $2
        ${deckFilter}
    `;

    const result = await pool.query(query, params);
    return result.rowCount ?? 0;
  }

  /**
   * Verify a card is curated in the given kind for the caller's restaurant
   * (either directly as a card target, or via a deck target whose deck
   * contains the card). Used to gate review submissions for curation-mode
   * sessions, where the deck is not the sole source of allowed cards.
   */
  static async cardInCuration(
    cardId: string,
    restaurantId: string,
    kind: CurationKind,
  ): Promise<boolean> {
    const query = `
      SELECT 1
        FROM cards c
        JOIN decks d ON d.id = c.deck_id
       WHERE c.id = $1
         AND d.restaurant_id = $2
         AND EXISTS (
           SELECT 1 FROM restaurant_curations rc
            WHERE rc.restaurant_id = $2
              AND rc.kind = $3
              AND (
                (rc.target_type = 'card' AND rc.target_id = c.id) OR
                (rc.target_type = 'deck' AND rc.target_id = c.deck_id)
              )
         )
       LIMIT 1
    `;
    const result = await pool.query(query, [cardId, restaurantId, kind]);
    return result.rows.length > 0;
  }

  /**
   * Get FSRS card data for a user and card
   */
  private static async getFSRSCard(userId: string, cardId: string, client: any = pool): Promise<FSRSCard> {
    const query = `
      SELECT *
      FROM fsrs_cards
      WHERE user_id = $1 AND card_id = $2
    `;

    const result = await client.query(query, [userId, cardId]);

    if (result.rows.length > 0) {
      return mapFSRSRow(result.rows[0], userId);
    }

    // Return default new card data
    return {
      id: '',
      cardId,
      userId,
      difficulty: 0,
      stability: 0,
      retrievability: 0,
      grade: 0,
      lapses: 0,
      reps: 0,
      state: 'new',
      lastReview: undefined,
      nextReview: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}

function mapFSRSRow(row: any, userId: string): FSRSCard {
  return {
    id: row.id,
    cardId: row.card_id,
    userId: row.user_id ?? userId,
    difficulty: parseFloat(row.difficulty) || 0,
    stability: parseFloat(row.stability) || 0,
    retrievability: parseFloat(row.retrievability) || 0,
    grade: parseInt(row.grade) || 0,
    lapses: parseInt(row.lapses) || 0,
    reps: parseInt(row.reps) || 0,
    state: row.state || 'new',
    lastReview: row.last_review ?? undefined,
    nextReview: row.next_review || new Date(),
    createdAt: row.created_at || new Date(),
    updatedAt: row.updated_at || new Date()
  };
}

function mapSessionRow(row: any): StudySession {
  return {
    id: row.id,
    userId: row.user_id,
    deckId: row.deck_id ?? null,
    curationKind: row.curation_kind ?? null,
    cardsStudied: row.cards_studied ?? 0,
    correctAnswers: row.correct_answers ?? 0,
    averageRating: row.average_rating === null || row.average_rating === undefined
      ? 0
      : parseFloat(row.average_rating),
  };
}
