import pool from '../config/database';
import {
  Card,
  CreateCardInput,
  UpdateCardInput,
  RestaurantCardData,
} from '../../../shared/types';

function parseRestaurantData(data: any): RestaurantCardData | undefined {
  if (!data) return undefined;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return undefined;
    }
  }
  return data.category ? data : undefined;
}

export class CardModel {
  static async create(deckId: string, cardData: CreateCardInput): Promise<Card> {
    // Get the next order number for this deck
    const orderQuery = 'SELECT COALESCE(MAX(card_order), -1) + 1 as next_order FROM cards WHERE deck_id = $1';
    const orderResult = await pool.query(orderQuery, [deckId]);
    const nextOrder = cardData.order ?? orderResult.rows[0].next_order;

    const query = `
      INSERT INTO cards (deck_id, front, back, image_url, card_order, restaurant_data)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, deck_id, front, back, image_url, card_order, restaurant_data, created_at, updated_at
    `;

    const values = [
      deckId,
      cardData.front || '',
      cardData.back || '',
      cardData.imageUrl || null,
      nextOrder,
      cardData.restaurantData ? JSON.stringify(cardData.restaurantData) : null
    ];
    
    const result = await pool.query(query, values);
    const card = result.rows[0];

    return {
      id: card.id,
      deckId: card.deck_id,
      front: card.front,
      back: card.back,
      imageUrl: card.image_url,
      order: card.card_order,
      createdAt: card.created_at,
      updatedAt: card.updated_at,
      restaurantData: parseRestaurantData(card.restaurant_data)
    };
  }

  static async findByDeckId(deckId: string): Promise<Card[]> {
    const query = `
      SELECT id, deck_id, front, back, image_url, card_order, restaurant_data, created_at, updated_at
      FROM cards
      WHERE deck_id = $1
      ORDER BY restaurant_data->>'itemName' ASC, created_at ASC
    `;

    const result = await pool.query(query, [deckId]);

    return result.rows.map(card => ({
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

  static async findById(id: string): Promise<Card | null> {
    const query = `
      SELECT id, deck_id, front, back, image_url, card_order, restaurant_data, created_at, updated_at
      FROM cards
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const card = result.rows[0];
    return {
      id: card.id,
      deckId: card.deck_id,
      front: card.front,
      back: card.back,
      imageUrl: card.image_url,
      order: card.card_order,
      createdAt: card.created_at,
      updatedAt: card.updated_at,
      restaurantData: parseRestaurantData(card.restaurant_data)
    };
  }

  static async update(id: string, cardData: UpdateCardInput): Promise<Card | null> {
    const setClause = [];
    const values = [];
    let paramCount = 1;

    if (cardData.front !== undefined) {
      setClause.push(`front = $${paramCount}`);
      values.push(cardData.front);
      paramCount++;
    }

    if (cardData.back !== undefined) {
      setClause.push(`back = $${paramCount}`);
      values.push(cardData.back);
      paramCount++;
    }

    if (cardData.imageUrl !== undefined) {
      setClause.push(`image_url = $${paramCount}`);
      values.push(cardData.imageUrl);
      paramCount++;
    }

    if (cardData.order !== undefined) {
      setClause.push(`card_order = $${paramCount}`);
      values.push(cardData.order);
      paramCount++;
    }

    if (cardData.restaurantData !== undefined) {
      setClause.push(`restaurant_data = $${paramCount}`);
      values.push(cardData.restaurantData ? JSON.stringify(cardData.restaurantData) : null);
      paramCount++;
    }

    if (setClause.length === 0) {
      return this.findById(id);
    }

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE cards
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, deck_id, front, back, image_url, card_order, restaurant_data, created_at, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    const card = result.rows[0];
    return {
      id: card.id,
      deckId: card.deck_id,
      front: card.front,
      back: card.back,
      imageUrl: card.image_url,
      order: card.card_order,
      createdAt: card.created_at,
      updatedAt: card.updated_at,
      restaurantData: parseRestaurantData(card.restaurant_data)
    };
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM cards WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

}