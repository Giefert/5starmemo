import pool from '../config/database';
import { Deck, CreateDeckInput, UpdateDeckInput, DeckWithStats } from '../../../shared/types';

// Helper function to safely parse restaurant data
function parseRestaurantData(data: any) {
  if (!data) return undefined;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return undefined;
    }
  }
  return data; // Already an object
}

export class DeckModel {
  static async create(deckData: CreateDeckInput, createdBy: string, restaurantId: string): Promise<Deck> {
    const query = `
      INSERT INTO decks (title, description, category_id, created_by, restaurant_id, deck_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, title, description, category_id, created_by, deck_type, created_at, updated_at
    `;

    const values = [
      deckData.title,
      deckData.description || null,
      deckData.categoryId || null,
      createdBy,
      restaurantId,
      deckData.deckType
    ];

    const result = await pool.query(query, values);

    return {
      id: result.rows[0].id,
      title: result.rows[0].title,
      description: result.rows[0].description,
      categoryId: result.rows[0].category_id,
      createdBy: result.rows[0].created_by,
      deckType: result.rows[0].deck_type,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at
    };
  }

  static async findAll(restaurantId: string): Promise<DeckWithStats[]> {
    const query = `
      SELECT
        d.*,
        COUNT(DISTINCT c.id) as card_count,
        COUNT(DISTINCT ss.user_id) as total_students,
        COUNT(DISTINCT ss.id) as total_sessions,
        AVG(ss.average_rating) as average_rating,
        ARRAY_AGG(DISTINCT c.restaurant_data->>'category') FILTER (WHERE c.restaurant_data->>'category' IS NOT NULL) as card_categories
      FROM decks d
      LEFT JOIN deck_cards dc ON d.id = dc.deck_id
      LEFT JOIN cards c ON c.id = dc.card_id
      LEFT JOIN study_sessions ss ON d.id = ss.deck_id
      WHERE d.restaurant_id = $1
      GROUP BY d.id, d.title, d.description, d.category_id, d.created_by, d.deck_type, d.created_at, d.updated_at
      ORDER BY d.created_at DESC
    `;

    const result = await pool.query(query, [restaurantId]);

    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      categoryId: row.category_id,
      createdBy: row.created_by,
      deckType: row.deck_type,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      cardCount: parseInt(row.card_count) || 0,
      cardCategories: row.card_categories ?? [],
      totalStudents: parseInt(row.total_students) || 0,
      totalSessions: parseInt(row.total_sessions) || 0,
      averageRating: parseFloat(row.average_rating) || 0,
    }));
  }

  static async findById(id: string, restaurantId: string, includeCards: boolean = false): Promise<Deck | null> {
    const query = `
      SELECT
        d.*,
        COUNT(c.id) as card_count
      FROM decks d
      LEFT JOIN deck_cards dc ON d.id = dc.deck_id
      LEFT JOIN cards c ON c.id = dc.card_id
      WHERE d.id = $1 AND d.restaurant_id = $2
      GROUP BY d.id, d.title, d.description, d.category_id, d.created_by, d.deck_type, d.created_at, d.updated_at
    `;

    const result = await pool.query(query, [id, restaurantId]);

    if (result.rows.length === 0) {
      return null;
    }

    const deck = {
      id: result.rows[0].id,
      title: result.rows[0].title,
      description: result.rows[0].description,
      categoryId: result.rows[0].category_id,
      createdBy: result.rows[0].created_by,
      deckType: result.rows[0].deck_type,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
      cardCount: parseInt(result.rows[0].card_count) || 0,
      cards: undefined as any
    };

    if (includeCards) {
      const cardsQuery = `
        SELECT c.id, dc.deck_id, c.image_url, dc.card_order,
               c.restaurant_data, c.created_at, c.updated_at
        FROM deck_cards dc
        JOIN cards c ON c.id = dc.card_id
        WHERE dc.deck_id = $1
        ORDER BY c.restaurant_data->>'itemName' ASC, c.created_at ASC
      `;

      const cardsResult = await pool.query(cardsQuery, [id]);
      deck.cards = cardsResult.rows.map(card => ({
        id: card.id,
        deckId: card.deck_id,
        imageUrl: card.image_url,
        order: card.card_order,
        createdAt: card.created_at,
        updatedAt: card.updated_at,
        restaurantData: parseRestaurantData(card.restaurant_data)
      }));
    }

    return deck;
  }

  static async update(id: string, deckData: UpdateDeckInput, restaurantId: string): Promise<Deck | null> {
    const setClause = [];
    const values = [];
    let paramCount = 1;

    if (deckData.title !== undefined) {
      setClause.push(`title = $${paramCount}`);
      values.push(deckData.title);
      paramCount++;
    }

    if (deckData.description !== undefined) {
      setClause.push(`description = $${paramCount}`);
      values.push(deckData.description);
      paramCount++;
    }

    if (deckData.categoryId !== undefined) {
      setClause.push(`category_id = $${paramCount}`);
      values.push(deckData.categoryId);
      paramCount++;
    }

    if (deckData.deckType !== undefined) {
      setClause.push(`deck_type = $${paramCount}`);
      values.push(deckData.deckType);
      paramCount++;
    }

    if (setClause.length === 0) {
      return this.findById(id, restaurantId);
    }

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    paramCount++;
    values.push(restaurantId);

    const query = `
      UPDATE decks
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount - 1} AND restaurant_id = $${paramCount}
      RETURNING id, title, description, category_id, created_by, deck_type, created_at, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return {
      id: result.rows[0].id,
      title: result.rows[0].title,
      description: result.rows[0].description,
      categoryId: result.rows[0].category_id,
      createdBy: result.rows[0].created_by,
      deckType: result.rows[0].deck_type,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at
    };
  }

  static async delete(id: string, restaurantId: string): Promise<boolean> {
    const query = 'DELETE FROM decks WHERE id = $1 AND restaurant_id = $2';
    const result = await pool.query(query, [id, restaurantId]);
    return (result.rowCount || 0) > 0;
  }

}
