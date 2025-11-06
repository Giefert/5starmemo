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
  static async create(deckData: CreateDeckInput, createdBy: string): Promise<Deck> {
    const query = `
      INSERT INTO decks (title, description, category_id, created_by, is_public, is_featured)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, title, description, category_id, created_by, is_public, is_featured, created_at, updated_at
    `;

    const values = [
      deckData.title,
      deckData.description || null,
      deckData.categoryId || null,
      createdBy,
      deckData.isPublic || false,
      deckData.isFeatured || false
    ];

    const result = await pool.query(query, values);

    // Map database fields to API fields for consistency
    return {
      id: result.rows[0].id,
      title: result.rows[0].title,
      description: result.rows[0].description,
      categoryId: result.rows[0].category_id,
      createdBy: result.rows[0].created_by,
      isPublic: result.rows[0].is_public,
      isFeatured: result.rows[0].is_featured,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at
    };
  }

  static async findAll(createdBy?: string): Promise<DeckWithStats[]> {
    let query = `
      SELECT 
        d.*,
        COUNT(DISTINCT c.id) as card_count,
        COUNT(DISTINCT ss.user_id) as total_students,
        COUNT(DISTINCT ss.id) as total_sessions,
        AVG(ss.average_rating) as average_rating
      FROM decks d
      LEFT JOIN cards c ON d.id = c.deck_id
      LEFT JOIN study_sessions ss ON d.id = ss.deck_id
    `;
    
    const values: any[] = [];
    
    if (createdBy) {
      query += ` WHERE d.created_by = $1`;
      values.push(createdBy);
    }
    
    query += `
      GROUP BY d.id, d.title, d.description, d.category_id, d.created_by, d.is_public, d.is_featured, d.created_at, d.updated_at
      ORDER BY d.created_at DESC
    `;

    const result = await pool.query(query, values);

    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      categoryId: row.category_id,
      createdBy: row.created_by,
      isPublic: row.is_public,
      isFeatured: row.is_featured,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      cardCount: parseInt(row.card_count) || 0,
      totalStudents: parseInt(row.total_students) || 0,
      totalSessions: parseInt(row.total_sessions) || 0,
      averageRating: parseFloat(row.average_rating) || 0,
    }));
  }

  static async findById(id: string, includeCards: boolean = false): Promise<Deck | null> {
    let query = `
      SELECT
        d.*,
        COUNT(c.id) as card_count
      FROM decks d
      LEFT JOIN cards c ON d.id = c.deck_id
      WHERE d.id = $1
      GROUP BY d.id, d.title, d.description, d.category_id, d.created_by, d.is_public, d.is_featured, d.created_at, d.updated_at
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const deck = {
      id: result.rows[0].id,
      title: result.rows[0].title,
      description: result.rows[0].description,
      categoryId: result.rows[0].category_id,
      createdBy: result.rows[0].created_by,
      isPublic: result.rows[0].is_public,
      isFeatured: result.rows[0].is_featured,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
      cardCount: parseInt(result.rows[0].card_count) || 0,
      cards: undefined as any
    };

    if (includeCards) {
      const cardsQuery = `
        SELECT id, deck_id, front, back, image_url, card_order, restaurant_data, created_at, updated_at
        FROM cards
        WHERE deck_id = $1
        ORDER BY card_order ASC, created_at ASC
      `;
      
      const cardsResult = await pool.query(cardsQuery, [id]);
      deck.cards = cardsResult.rows.map(card => ({
        id: card.id,
        deckId: card.deck_id,
        front: card.front,
        back: card.back,
        imageUrl: card.image_url,
        order: card.card_order,
        createdAt: card.created_at,
        updatedAt: card.updated_at,
        restaurantData: parseRestaurantData(card.restaurant_data)
      }));
    }

    return deck;
  }

  static async update(id: string, deckData: UpdateDeckInput, userId: string): Promise<Deck | null> {
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

    if (deckData.isPublic !== undefined) {
      setClause.push(`is_public = $${paramCount}`);
      values.push(deckData.isPublic);
      paramCount++;
    }

    if (deckData.isFeatured !== undefined) {
      setClause.push(`is_featured = $${paramCount}`);
      values.push(deckData.isFeatured);
      paramCount++;
    }

    if (setClause.length === 0) {
      return this.findById(id);
    }

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE decks
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, title, description, category_id, created_by, is_public, is_featured, created_at, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    // Map database fields to API fields for consistency
    return {
      id: result.rows[0].id,
      title: result.rows[0].title,
      description: result.rows[0].description,
      categoryId: result.rows[0].category_id,
      createdBy: result.rows[0].created_by,
      isPublic: result.rows[0].is_public,
      isFeatured: result.rows[0].is_featured,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at
    };
  }

  static async delete(id: string, userId: string): Promise<boolean> {
    const query = 'DELETE FROM decks WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  static async findByCreator(createdBy: string): Promise<Deck[]> {
    const query = `
      SELECT d.*, COUNT(c.id) as card_count
      FROM decks d
      LEFT JOIN cards c ON d.id = c.deck_id
      WHERE d.created_by = $1
      GROUP BY d.id
      ORDER BY d.created_at DESC
    `;
    
    const result = await pool.query(query, [createdBy]);
    return result.rows.map(row => ({
      ...row,
      cardCount: parseInt(row.card_count) || 0
    }));
  }
}