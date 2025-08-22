import pool from '../config/database';
import { StudySession, StudyStats, FSRSCard, ReviewInput } from '../../../shared/types';
import { FSRS, Rating } from '../utils/fsrs';

export class ProgressModel {
  private static fsrs = new FSRS();

  /**
   * Create a new study session
   */
  static async createStudySession(userId: string, deckId: string): Promise<StudySession> {
    const query = `
      INSERT INTO study_sessions (user_id, deck_id)
      VALUES ($1, $2)
      RETURNING id, user_id, deck_id, cards_studied, correct_answers, average_rating
    `;
    
    const result = await pool.query(query, [userId, deckId]);
    return result.rows[0];
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
      RETURNING id, user_id, deck_id, cards_studied, correct_answers, average_rating
    `;
    
    const result = await pool.query(query, [
      sessionId,
      stats.cardsStudied,
      stats.correctAnswers,
      stats.averageRating
    ]);
    
    return result.rows[0] || null;
  }

  /**
   * Submit a card review and update FSRS data
   */
  static async submitReview(userId: string, review: ReviewInput, sessionId?: string): Promise<FSRSCard> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current FSRS card data
      let fsrsCard = await this.getFSRSCard(userId, review.cardId, client);
      
      // Calculate next review using FSRS
      const reviewResult = this.fsrs.next(fsrsCard, review.rating as Rating);
      
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
      return fsrsResult.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get user's study statistics
   */
  static async getStudyStats(userId: string): Promise<StudyStats> {
    const totalCardsQuery = `
      SELECT COUNT(DISTINCT fc.card_id) as total
      FROM fsrs_cards fc
      JOIN cards c ON fc.card_id = c.id
      JOIN decks d ON c.deck_id = d.id
      WHERE fc.user_id = $1 AND d.is_public = true
    `;

    const stateCountsQuery = `
      SELECT 
        fc.state,
        COUNT(*) as count
      FROM fsrs_cards fc
      JOIN cards c ON fc.card_id = c.id
      JOIN decks d ON c.deck_id = d.id
      WHERE fc.user_id = $1 AND d.is_public = true
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
      SELECT COUNT(*) as new_cards
      FROM cards c
      JOIN decks d ON c.deck_id = d.id
      LEFT JOIN fsrs_cards fc ON c.id = fc.card_id AND fc.user_id = $1
      WHERE d.is_public = true AND fc.card_id IS NULL
    `;

    const [totalResult, statesResult, dailyResult, newResult] = await Promise.all([
      pool.query(totalCardsQuery, [userId]),
      pool.query(stateCountsQuery, [userId]),
      pool.query(dailyStatsQuery, [userId]),
      pool.query(newCardsQuery, [userId])
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
   * Get user's recent study sessions
   */
  static async getRecentSessions(userId: string, limit: number = 10): Promise<StudySession[]> {
    const query = `
      SELECT 
        ss.id,
        ss.user_id,
        ss.deck_id,
        ss.cards_studied,
        ss.correct_answers,
        ss.average_rating,
        d.title as deck_title
      FROM study_sessions ss
      JOIN decks d ON ss.deck_id = d.id
      WHERE ss.user_id = $1 AND ss.cards_studied > 0
      ORDER BY ss.id DESC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [userId, limit]);
    return result.rows;
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
      return result.rows[0];
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