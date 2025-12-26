import pool from '../config/database';
import { StudentDeck, StudyCardData, Card, FSRSCard } from '../../../shared/types';
import { transformImageUrl } from '../utils/urlTransform';

export class DeckModel {
  /**
   * Get all available decks for students (public decks only)
   */
  static async getAvailableDecks(userId: string): Promise<StudentDeck[]> {
    const query = `
      SELECT
        d.id,
        d.title,
        d.description,
        d.is_featured,
        COUNT(c.id) as card_count,
        COUNT(CASE WHEN fc.state = 'new' OR fc.card_id IS NULL THEN 1 END) as new_cards,
        COUNT(CASE WHEN fc.state IN ('learning', 'review', 'relearning') AND fc.next_review <= NOW() THEN 1 END) as review_cards,
        MIN(CASE WHEN fc.next_review > NOW() THEN fc.next_review END) as next_review_at
      FROM decks d
      LEFT JOIN cards c ON d.id = c.deck_id
      LEFT JOIN fsrs_cards fc ON c.id = fc.card_id AND fc.user_id = $1
      WHERE d.is_public = true
      GROUP BY d.id, d.title, d.description, d.is_featured
      ORDER BY d.is_featured DESC, d.created_at DESC
    `;

    const result = await pool.query(query, [userId]);

    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      isFeatured: row.is_featured,
      cardCount: parseInt(row.card_count) || 0,
      newCards: parseInt(row.new_cards) || 0,
      reviewCards: parseInt(row.review_cards) || 0,
      nextReviewAt: row.next_review_at
    }));
  }

  /**
   * Get deck with cards for studying
   */
  static async getDeckForStudy(deckId: string, userId: string): Promise<StudyCardData[]> {
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
      LEFT JOIN fsrs_cards fc ON c.id = fc.card_id AND fc.user_id = $2
      WHERE c.deck_id = $1
      ORDER BY c.card_order ASC, c.created_at ASC
    `;

    const result = await pool.query(query, [deckId, userId]);

    return result.rows.map(row => {
      const card: Card = {
        id: row.id,
        deckId: row.deck_id,
        imageUrl: transformImageUrl(row.image_url),
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
   * Get cards due for review
   */
  static async getCardsForReview(userId: string, limit: number = 50): Promise<StudyCardData[]> {
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
        fc.updated_at as fsrs_updated_at,
        d.title as deck_title
      FROM fsrs_cards fc
      JOIN cards c ON fc.card_id = c.id
      JOIN decks d ON c.deck_id = d.id
      WHERE fc.user_id = $1
        AND fc.next_review <= NOW()
        AND d.is_public = true
      ORDER BY fc.next_review ASC, c.card_order ASC
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);

    return result.rows.map(row => {
      const card: Card = {
        id: row.id,
        deckId: row.deck_id,
        imageUrl: transformImageUrl(row.image_url),
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
   * Check if deck exists and is public
   */
  static async isDeckAvailable(deckId: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count
      FROM decks
      WHERE id = $1 AND is_public = true
    `;
    
    const result = await pool.query(query, [deckId]);
    return parseInt(result.rows[0].count) > 0;
  }
}