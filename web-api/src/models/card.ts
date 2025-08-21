import pool from '../config/database';
import { Card, CreateCardInput, UpdateCardInput } from '../../../shared/types';

export class CardModel {
  static async create(deckId: string, cardData: CreateCardInput): Promise<Card> {
    // Get the next order number for this deck
    const orderQuery = 'SELECT COALESCE(MAX(card_order), -1) + 1 as next_order FROM cards WHERE deck_id = $1';
    const orderResult = await pool.query(orderQuery, [deckId]);
    const nextOrder = cardData.order ?? orderResult.rows[0].next_order;

    const query = `
      INSERT INTO cards (deck_id, front, back, image_url, image_focus_point_x, image_focus_point_y, card_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, deck_id, front, back, image_url, image_focus_point_x, image_focus_point_y, card_order, created_at, updated_at
    `;
    
    const values = [
      deckId,
      cardData.front,
      cardData.back,
      cardData.imageUrl || null,
      cardData.imageFocusPoint?.x || null,
      cardData.imageFocusPoint?.y || null,
      nextOrder
    ];
    
    const result = await pool.query(query, values);
    const card = result.rows[0];
    
    return {
      ...card,
      imageFocusPoint: card.image_focus_point_x && card.image_focus_point_y 
        ? { x: card.image_focus_point_x, y: card.image_focus_point_y }
        : undefined
    };
  }

  static async findByDeckId(deckId: string): Promise<Card[]> {
    const query = `
      SELECT id, deck_id, front, back, image_url, image_focus_point_x, image_focus_point_y, card_order, created_at, updated_at
      FROM cards
      WHERE deck_id = $1
      ORDER BY card_order ASC, created_at ASC
    `;
    
    const result = await pool.query(query, [deckId]);
    
    return result.rows.map(card => ({
      ...card,
      imageFocusPoint: card.image_focus_point_x && card.image_focus_point_y 
        ? { x: card.image_focus_point_x, y: card.image_focus_point_y }
        : undefined
    }));
  }

  static async findById(id: string): Promise<Card | null> {
    const query = `
      SELECT id, deck_id, front, back, image_url, image_focus_point_x, image_focus_point_y, card_order, created_at, updated_at
      FROM cards
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const card = result.rows[0];
    return {
      ...card,
      imageFocusPoint: card.image_focus_point_x && card.image_focus_point_y 
        ? { x: card.image_focus_point_x, y: card.image_focus_point_y }
        : undefined
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

    if (cardData.imageFocusPoint !== undefined) {
      setClause.push(`image_focus_point_x = $${paramCount}`);
      values.push(cardData.imageFocusPoint?.x || null);
      paramCount++;
      
      setClause.push(`image_focus_point_y = $${paramCount}`);
      values.push(cardData.imageFocusPoint?.y || null);
      paramCount++;
    }

    if (cardData.order !== undefined) {
      setClause.push(`card_order = $${paramCount}`);
      values.push(cardData.order);
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
      RETURNING id, deck_id, front, back, image_url, image_focus_point_x, image_focus_point_y, card_order, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    const card = result.rows[0];
    return {
      ...card,
      imageFocusPoint: card.image_focus_point_x && card.image_focus_point_y 
        ? { x: card.image_focus_point_x, y: card.image_focus_point_y }
        : undefined
    };
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM cards WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  static async reorderCards(deckId: string, cardIds: string[]): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (let i = 0; i < cardIds.length; i++) {
        await client.query(
          'UPDATE cards SET card_order = $1 WHERE id = $2 AND deck_id = $3',
          [i, cardIds[i], deckId]
        );
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async bulkCreate(deckId: string, cardsData: CreateCardInput[]): Promise<Card[]> {
    const client = await pool.connect();
    const cards: Card[] = [];
    
    try {
      await client.query('BEGIN');
      
      for (let i = 0; i < cardsData.length; i++) {
        const cardData = cardsData[i];
        const order = cardData.order ?? i;
        
        const query = `
          INSERT INTO cards (deck_id, front, back, image_url, image_focus_point_x, image_focus_point_y, card_order)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, deck_id, front, back, image_url, image_focus_point_x, image_focus_point_y, card_order, created_at, updated_at
        `;
        
        const values = [
          deckId,
          cardData.front,
          cardData.back,
          cardData.imageUrl || null,
          cardData.imageFocusPoint?.x || null,
          cardData.imageFocusPoint?.y || null,
          order
        ];
        
        const result = await client.query(query, values);
        const card = result.rows[0];
        
        cards.push({
          ...card,
          imageFocusPoint: card.image_focus_point_x && card.image_focus_point_y 
            ? { x: card.image_focus_point_x, y: card.image_focus_point_y }
            : undefined
        });
      }
      
      await client.query('COMMIT');
      return cards;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}