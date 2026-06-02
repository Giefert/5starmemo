import pool from '../config/database';
import { StudentDeck, StudyCardData, StudyCardSearchResult, Card, FSRSCard } from '../../../shared/types';

// SQL predicate selecting deck IDs the student can see in their restaurant.
// A student has access iff a direct grant (user_deck_access) exists OR they
// belong to a role with a grant (role_deck_access). Two placeholders are
// expected: $1 = user_id, $2 = restaurant_id.
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

export class DeckModel {
  /**
   * Get all decks the student has been granted access to within their
   * restaurant — either individually or via a role they belong to.
   */
  static async getAvailableDecks(userId: string, restaurantId: string): Promise<StudentDeck[]> {
    const query = `
      WITH accessible AS (${ACCESSIBLE_DECK_IDS_SQL})
      SELECT
        d.id,
        d.title,
        d.description,
        d.deck_type,
        COUNT(c.id) as card_count,
        COUNT(CASE
          WHEN fc.card_id IS NULL OR fc.state IN ('new', 'learning') THEN 1
        END) as weak_cards,
        COUNT(CASE
          WHEN fc.state = 'relearning'
            OR (fc.state = 'review' AND fc.stability < 21)
          THEN 1
        END) as learning_cards,
        COUNT(CASE
          WHEN fc.state = 'review' AND fc.stability >= 21 THEN 1
        END) as mastered_cards,
        MIN(CASE WHEN fc.next_review > NOW() THEN fc.next_review END) as next_review_at
      FROM decks d
      LEFT JOIN cards c ON d.id = c.deck_id
      LEFT JOIN fsrs_cards fc ON c.id = fc.card_id AND fc.user_id = $1
      WHERE d.id IN (SELECT id FROM accessible)
      GROUP BY d.id, d.title, d.description, d.deck_type
      ORDER BY LOWER(d.title) ASC
    `;

    const result = await pool.query(query, [userId, restaurantId]);

    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      deckType: row.deck_type,
      cardCount: parseInt(row.card_count) || 0,
      masteredCards: parseInt(row.mastered_cards) || 0,
      learningCards: parseInt(row.learning_cards) || 0,
      weakCards: parseInt(row.weak_cards) || 0,
      nextReviewAt: row.next_review_at
    }));
  }

  /**
   * Search the student's accessible decks by deck title or by values stored in
   * the cards' restaurant_data JSON. This intentionally searches card content
   * without exposing full card payloads just to filter the Study deck list.
   */
  static async searchAvailableDeckIds(
    userId: string,
    restaurantId: string,
    search: string
  ): Promise<string[]> {
    const query = `
      WITH accessible AS (${ACCESSIBLE_DECK_IDS_SQL})
      SELECT DISTINCT d.id
      FROM decks d
      LEFT JOIN cards c ON c.deck_id = d.id
      WHERE d.id IN (SELECT id FROM accessible)
        AND (
          d.title ILIKE $3
          OR EXISTS (
            SELECT 1
            FROM jsonb_each_text(c.restaurant_data) AS field(key, value)
            WHERE field.value ILIKE $3
          )
        )
      ORDER BY d.id ASC
    `;

    const result = await pool.query(query, [userId, restaurantId, `%${search}%`]);
    return result.rows.map(row => row.id);
  }

  /**
   * Search individual cards the student can access. Used by the mobile Custom
   * deck builder; access stays scoped to the same deck grants as Study.
   */
  static async searchAvailableCards(
    userId: string,
    restaurantId: string,
    search: string,
    limit: number = 30
  ): Promise<StudyCardSearchResult[]> {
    const query = `
      WITH accessible AS (${ACCESSIBLE_DECK_IDS_SQL})
      SELECT
        c.id,
        c.deck_id,
        c.image_url,
        c.card_order,
        c.restaurant_data,
        c.created_at,
        c.updated_at,
        d.title as deck_title,
        fc.id as fsrs_id,
        fc.difficulty,
        fc.stability,
        fc.retrievability,
        fc.grade,
        fc.lapses,
        fc.reps,
        fc.state,
        fc.last_review,
        fc.next_review,
        fc.created_at as fsrs_created_at,
        fc.updated_at as fsrs_updated_at
      FROM cards c
      JOIN decks d ON d.id = c.deck_id
      LEFT JOIN fsrs_cards fc ON c.id = fc.card_id AND fc.user_id = $1
      WHERE d.id IN (SELECT id FROM accessible)
        AND (
          d.title ILIKE $3
          OR c.restaurant_data::text ILIKE $3
        )
      ORDER BY
        LOWER(COALESCE(c.restaurant_data->>'itemName', '')) ASC,
        LOWER(d.title) ASC
      LIMIT $4
    `;

    const result = await pool.query(query, [userId, restaurantId, `%${search}%`, limit]);
    return result.rows.map(row => {
      const cardData = rowToStudyCard(row, userId);
      return {
        cardId: row.id,
        deckId: row.deck_id,
        deckTitle: row.deck_title,
        itemName: cardData.card.restaurantData?.itemName || 'Untitled Card',
        cardData
      };
    });
  }

  /**
   * Hydrate selected cards for local Custom deck sessions. Missing or
   * inaccessible card ids are omitted rather than exposed.
   */
  static async getAvailableCardsByIds(
    userId: string,
    restaurantId: string,
    cardIds: string[]
  ): Promise<StudyCardData[]> {
    if (cardIds.length === 0) return [];

    const query = `
      WITH accessible AS (${ACCESSIBLE_DECK_IDS_SQL})
      SELECT
        c.id,
        c.deck_id,
        c.image_url,
        c.card_order,
        c.restaurant_data,
        c.created_at,
        c.updated_at,
        fc.id as fsrs_id,
        fc.difficulty,
        fc.stability,
        fc.retrievability,
        fc.grade,
        fc.lapses,
        fc.reps,
        fc.state,
        fc.last_review,
        fc.next_review,
        fc.created_at as fsrs_created_at,
        fc.updated_at as fsrs_updated_at
      FROM cards c
      JOIN decks d ON d.id = c.deck_id
      LEFT JOIN fsrs_cards fc ON c.id = fc.card_id AND fc.user_id = $1
      WHERE d.id IN (SELECT id FROM accessible)
        AND c.id = ANY($3::uuid[])
      ORDER BY array_position($3::uuid[], c.id)
    `;

    const result = await pool.query(query, [userId, restaurantId, cardIds]);
    return result.rows.map(row => rowToStudyCard(row, userId));
  }

  /**
   * Get deck with cards for studying. Restaurant scope enforced via deck.
   *
   * mode='full' returns every card in the deck, in random order (a browse/cram
   * pass with no recall priority).
   * mode='recommended' (default) returns cards FSRS thinks the student should
   * work on now: anything due (next_review <= NOW), plus anything not-yet-
   * mastered (no FSRS row, or state in new/learning/relearning, or review
   * state with stability < 21 days). Mastered cards scheduled in the future
   * are skipped. These are ordered by FSRS urgency — overdue cards first
   * (oldest due date ≈ lowest retrievability), new/unseen cards treated as
   * due-now and mixed in at that boundary, not-yet-due cards last — with
   * RANDOM() breaking ties so the order isn't a fixed sequence each session.
   */
  static async getDeckForStudy(
    deckId: string,
    userId: string,
    restaurantId: string,
    mode: 'recommended' | 'full' = 'full'
  ): Promise<StudyCardData[]> {
    const recommendedFilter = `
      AND (
        fc.card_id IS NULL
        OR fc.state IN ('new', 'learning', 'relearning')
        OR (fc.state = 'review' AND fc.stability < 21)
        OR fc.next_review <= NOW()
      )
    `;

    // 'recommended' leans on FSRS: most-urgent (lowest retrievability) first,
    // RANDOM() only as a tiebreaker. 'full' is a plain shuffle.
    const orderBy =
      mode === 'recommended'
        ? `ORDER BY COALESCE(fc.next_review, NOW()) ASC, RANDOM()`
        : `ORDER BY RANDOM()`;

    const query = `
      SELECT
        c.id,
        c.deck_id,
        c.image_url,
        c.card_order,
        c.restaurant_data,
        c.created_at,
        c.updated_at,
        fc.id as fsrs_id,
        fc.difficulty,
        fc.stability,
        fc.retrievability,
        fc.grade,
        fc.lapses,
        fc.reps,
        fc.state,
        fc.last_review,
        fc.next_review,
        fc.created_at as fsrs_created_at,
        fc.updated_at as fsrs_updated_at
      FROM cards c
      JOIN decks d ON d.id = c.deck_id
      LEFT JOIN fsrs_cards fc ON c.id = fc.card_id AND fc.user_id = $2
      WHERE c.deck_id = $1 AND d.restaurant_id = $3
      ${mode === 'recommended' ? recommendedFilter : ''}
      ${orderBy}
    `;

    const result = await pool.query(query, [deckId, userId, restaurantId]);

    return result.rows.map(row => {
      const card: Card = {
        id: row.id,
        deckId: row.deck_id,
        imageUrl: row.image_url || undefined,
        order: row.card_order,
        restaurantData: row.restaurant_data || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      const fsrsData: FSRSCard = row.fsrs_id ? {
        id: row.fsrs_id,
        cardId: row.id,
        userId: userId,
        difficulty: parseFloat(row.difficulty) || 0,
        stability: parseFloat(row.stability) || 0,
        retrievability: parseFloat(row.retrievability) || 0,
        grade: parseInt(row.grade) || 0,
        lapses: parseInt(row.lapses) || 0,
        reps: parseInt(row.reps) || 0,
        state: row.state || 'new',
        lastReview: row.last_review,
        nextReview: row.next_review || new Date(),
        createdAt: row.fsrs_created_at || new Date(),
        updatedAt: row.fsrs_updated_at || new Date()
      } : {
        id: '',
        cardId: row.id,
        userId: userId,
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

      return {
        card,
        fsrsData,
        isNew: !row.fsrs_id
      };
    });
  }

  /**
   * Get cards due for review across every deck the student currently has
   * access to in their restaurant.
   */
  static async getCardsForReview(userId: string, restaurantId: string, limit: number = 50): Promise<StudyCardData[]> {
    const query = `
      WITH accessible AS (${ACCESSIBLE_DECK_IDS_SQL})
      SELECT
        c.id,
        c.deck_id,
        c.image_url,
        c.card_order,
        c.restaurant_data,
        c.created_at,
        c.updated_at,
        fc.id as fsrs_id,
        fc.difficulty,
        fc.stability,
        fc.retrievability,
        fc.grade,
        fc.lapses,
        fc.reps,
        fc.state,
        fc.last_review,
        fc.next_review,
        fc.created_at as fsrs_created_at,
        fc.updated_at as fsrs_updated_at,
        d.title as deck_title
      FROM fsrs_cards fc
      JOIN cards c ON fc.card_id = c.id
      JOIN decks d ON c.deck_id = d.id
      WHERE fc.user_id = $1
        AND fc.next_review <= NOW()
        AND d.id IN (SELECT id FROM accessible)
      ORDER BY fc.next_review ASC, c.card_order ASC
      LIMIT $3
    `;

    const result = await pool.query(query, [userId, restaurantId, limit]);

    return result.rows.map(row => {
      const card: Card = {
        id: row.id,
        deckId: row.deck_id,
        imageUrl: row.image_url || undefined,
        order: row.card_order,
        restaurantData: row.restaurant_data || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      const fsrsData: FSRSCard = {
        id: row.fsrs_id,
        cardId: row.id,
        userId: userId,
        difficulty: parseFloat(row.difficulty),
        stability: parseFloat(row.stability),
        retrievability: parseFloat(row.retrievability),
        grade: parseInt(row.grade),
        lapses: parseInt(row.lapses),
        reps: parseInt(row.reps),
        state: row.state,
        lastReview: row.last_review,
        nextReview: row.next_review,
        createdAt: row.fsrs_created_at,
        updatedAt: row.fsrs_updated_at
      };

      return {
        card,
        fsrsData,
        isNew: false
      };
    });
  }

  /**
   * Check that the deck exists, lives in the student's restaurant, and the
   * student has been granted access (directly or via a role).
   */
  static async isDeckAvailable(deckId: string, userId: string, restaurantId: string): Promise<boolean> {
    const query = `
      SELECT 1
      FROM decks d
      WHERE d.id = $3
        AND d.restaurant_id = $2
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

    const result = await pool.query(query, [userId, restaurantId, deckId]);
    return result.rows.length > 0;
  }
}

function rowToStudyCard(row: any, userId: string): StudyCardData {
  const card: Card = {
    id: row.id,
    deckId: row.deck_id,
    imageUrl: row.image_url || undefined,
    order: row.card_order,
    restaurantData: row.restaurant_data || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

  const fsrsData: FSRSCard = row.fsrs_id ? {
    id: row.fsrs_id,
    cardId: row.id,
    userId,
    difficulty: parseFloat(row.difficulty) || 0,
    stability: parseFloat(row.stability) || 0,
    retrievability: parseFloat(row.retrievability) || 0,
    grade: parseInt(row.grade) || 0,
    lapses: parseInt(row.lapses) || 0,
    reps: parseInt(row.reps) || 0,
    state: row.state || 'new',
    lastReview: row.last_review,
    nextReview: row.next_review || new Date(),
    createdAt: row.fsrs_created_at || new Date(),
    updatedAt: row.fsrs_updated_at || new Date()
  } : {
    id: '',
    cardId: row.id,
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

  return {
    card,
    fsrsData,
    isNew: !row.fsrs_id
  };
}
