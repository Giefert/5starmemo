import pool from '../config/database';
import {
  Card,
  CardDeckMembership,
  CreateCardInput,
  UpdateCardInput,
  RestaurantCardData,
  RestaurantCategory,
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

function mapCard(row: any): Card {
  const decks: CardDeckMembership[] = row.decks ?? [];
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    imageUrl: row.image_url || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    restaurantData: parseRestaurantData(row.restaurant_data),
    deckIds: decks.map(deck => deck.id),
    decks,
  };
}

const CARD_SELECT = `
  SELECT c.id, c.restaurant_id, c.image_url, c.restaurant_data,
         c.created_at, c.updated_at,
         COALESCE(
           jsonb_agg(
             jsonb_build_object('id', d.id, 'title', d.title, 'order', dc.card_order)
             ORDER BY LOWER(d.title)
           ) FILTER (WHERE d.id IS NOT NULL),
           '[]'::jsonb
         ) AS decks
  FROM cards c
  LEFT JOIN deck_cards dc ON dc.card_id = c.id
  LEFT JOIN decks d ON d.id = dc.deck_id
`;

export class CardModel {
  static async create(
    restaurantId: string,
    cardData: CreateCardInput,
  ): Promise<Card> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const deckIds = [...new Set(cardData.deckIds ?? [])];
      if (deckIds.length > 0) {
        const allowed = await client.query(
          'SELECT id FROM decks WHERE restaurant_id = $1 AND id = ANY($2::uuid[])',
          [restaurantId, deckIds],
        );
        if (allowed.rows.length !== deckIds.length) throw new Error('Invalid deck selection');
      }

      const result = await client.query(
        `INSERT INTO cards (restaurant_id, image_url, restaurant_data)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [
          restaurantId,
          cardData.imageUrl || null,
          cardData.restaurantData ? JSON.stringify(cardData.restaurantData) : null,
        ],
      );
      const cardId = result.rows[0].id;

      for (const deckId of deckIds) {
        await client.query(
          `INSERT INTO deck_cards (deck_id, card_id, card_order)
           SELECT $1, $2, COALESCE(MAX(card_order), -1) + 1
           FROM deck_cards WHERE deck_id = $1`,
          [deckId, cardId],
        );
      }
      await client.query('COMMIT');
      return (await this.findById(cardId, restaurantId))!;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findAll(options: {
    restaurantId: string;
    search?: string;
    category?: RestaurantCategory;
  }): Promise<Card[]> {
    const values: any[] = [options.restaurantId];
    const filters = ['c.restaurant_id = $1'];
    if (options.category) {
      values.push(options.category);
      filters.push(`c.restaurant_data->>'category' = $${values.length}`);
    }
    if (options.search) {
      values.push(`%${options.search}%`);
      filters.push(`(
        c.restaurant_data->>'itemName' ILIKE $${values.length}
        OR c.restaurant_data::text ILIKE $${values.length}
        OR EXISTS (
          SELECT 1 FROM deck_cards search_dc
          JOIN decks search_d ON search_d.id = search_dc.deck_id
          WHERE search_dc.card_id = c.id AND search_d.title ILIKE $${values.length}
        )
      )`);
    }
    const result = await pool.query(
      `${CARD_SELECT}
       WHERE ${filters.join(' AND ')}
       GROUP BY c.id
       ORDER BY LOWER(COALESCE(c.restaurant_data->>'itemName', '')) ASC, c.created_at ASC`,
      values,
    );
    return result.rows.map(mapCard);
  }

  static async findById(id: string, restaurantId?: string): Promise<Card | null> {
    const values: any[] = [id];
    let restaurantFilter = '';
    if (restaurantId) {
      values.push(restaurantId);
      restaurantFilter = 'AND c.restaurant_id = $2';
    }
    const result = await pool.query(
      `${CARD_SELECT}
       WHERE c.id = $1 ${restaurantFilter}
       GROUP BY c.id`,
      values,
    );
    return result.rows[0] ? mapCard(result.rows[0]) : null;
  }

  static async update(
    id: string,
    restaurantId: string,
    cardData: UpdateCardInput,
  ): Promise<Card | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    if (cardData.imageUrl !== undefined) {
      values.push(cardData.imageUrl || null);
      setClause.push(`image_url = $${values.length}`);
    }
    if (cardData.restaurantData !== undefined) {
      values.push(cardData.restaurantData ? JSON.stringify(cardData.restaurantData) : null);
      setClause.push(`restaurant_data = $${values.length}`);
    }
    if (setClause.length === 0) return this.findById(id, restaurantId);
    values.push(id, restaurantId);
    const result = await pool.query(
      `UPDATE cards SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${values.length - 1} AND restaurant_id = $${values.length}
       RETURNING id`,
      values,
    );
    return result.rows[0] ? this.findById(id, restaurantId) : null;
  }

  static async addToDeck(cardId: string, deckId: string, restaurantId: string): Promise<boolean> {
    const result = await pool.query(
      `INSERT INTO deck_cards (deck_id, card_id, card_order)
       SELECT d.id, c.id,
              COALESCE((SELECT MAX(card_order) + 1 FROM deck_cards WHERE deck_id = d.id), 0)
       FROM decks d
       JOIN cards c ON c.restaurant_id = d.restaurant_id
       WHERE d.id = $1 AND c.id = $2 AND d.restaurant_id = $3
       ON CONFLICT DO NOTHING
       RETURNING card_id`,
      [deckId, cardId, restaurantId],
    );
    return result.rows.length > 0;
  }

  static async removeFromDeck(cardId: string, deckId: string, restaurantId: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM deck_cards dc
       USING decks d, cards c
       WHERE dc.deck_id = d.id AND dc.card_id = c.id
         AND d.id = $1 AND c.id = $2
         AND d.restaurant_id = $3 AND c.restaurant_id = $3`,
      [deckId, cardId, restaurantId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async merge(
    survivorId: string,
    duplicateIds: string[],
    restaurantId: string,
  ): Promise<Card | null> {
    const ids = [...new Set([survivorId, ...duplicateIds])];
    if (ids.length < 2) return this.findById(survivorId, restaurantId);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cards = await client.query(
        `SELECT id FROM cards
         WHERE restaurant_id = $1 AND id = ANY($2::uuid[])
         FOR UPDATE`,
        [restaurantId, ids],
      );
      if (cards.rows.length !== ids.length) throw new Error('Card not found');

      for (const duplicateId of ids.filter(id => id !== survivorId)) {
        await client.query(
          `INSERT INTO deck_cards (deck_id, card_id, card_order, created_at)
           SELECT deck_id, $1, card_order, created_at
           FROM deck_cards WHERE card_id = $2
           ON CONFLICT (deck_id, card_id) DO NOTHING`,
          [survivorId, duplicateId],
        );

        await client.query(
          `INSERT INTO glossary_term_cards
             (term_id, card_id, match_field, match_context, created_at)
           SELECT term_id, $1, match_field, match_context, created_at
           FROM glossary_term_cards WHERE card_id = $2
           ON CONFLICT (term_id, card_id) DO NOTHING`,
          [survivorId, duplicateId],
        );

        await client.query(
          `DELETE FROM restaurant_curations duplicate
           USING restaurant_curations survivor
           WHERE duplicate.target_type = 'card' AND duplicate.target_id = $2
             AND survivor.restaurant_id = duplicate.restaurant_id
             AND survivor.kind = duplicate.kind
             AND survivor.target_type = 'card' AND survivor.target_id = $1`,
          [survivorId, duplicateId],
        );
        await client.query(
          `UPDATE restaurant_curations SET target_id = $1
           WHERE target_type = 'card' AND target_id = $2`,
          [survivorId, duplicateId],
        );

        await client.query(
          `DELETE FROM in_season_bulletin_suppressions duplicate
           USING in_season_bulletin_suppressions survivor
           WHERE duplicate.card_id = $2
             AND survivor.restaurant_id = duplicate.restaurant_id
             AND survivor.card_id = $1`,
          [survivorId, duplicateId],
        );
        await client.query(
          `UPDATE in_season_bulletin_suppressions SET card_id = $1
           WHERE card_id = $2`,
          [survivorId, duplicateId],
        );

        const duplicateProgress = await client.query(
          'SELECT * FROM fsrs_cards WHERE card_id = $1 FOR UPDATE',
          [duplicateId],
        );
        for (const progress of duplicateProgress.rows) {
          const survivorProgress = await client.query(
            'SELECT * FROM fsrs_cards WHERE card_id = $1 AND user_id = $2 FOR UPDATE',
            [survivorId, progress.user_id],
          );
          if (survivorProgress.rows.length === 0) {
            await client.query('UPDATE fsrs_cards SET card_id = $1 WHERE id = $2', [survivorId, progress.id]);
            await client.query('UPDATE card_reviews SET card_id = $1 WHERE card_id = $2', [survivorId, duplicateId]);
            continue;
          }

          const kept = survivorProgress.rows[0];
          const duplicateTimestamp = new Date(progress.last_review ?? progress.updated_at ?? 0).getTime();
          const keptTimestamp = new Date(kept.last_review ?? kept.updated_at ?? 0).getTime();
          if (duplicateTimestamp > keptTimestamp) {
            await client.query(
              `UPDATE fsrs_cards SET
                 difficulty = $2, stability = $3, retrievability = $4,
                 grade = $5, lapses = $6, reps = $7, state = $8,
                 last_review = $9, next_review = $10, updated_at = $11
               WHERE id = $1`,
              [
                kept.id, progress.difficulty, progress.stability, progress.retrievability,
                progress.grade, progress.lapses, progress.reps, progress.state,
                progress.last_review, progress.next_review, progress.updated_at,
              ],
            );
          }
          await client.query(
            `UPDATE card_reviews
             SET card_id = $1, fsrs_card_id = $2
             WHERE card_id = $3 OR fsrs_card_id = $4`,
            [survivorId, kept.id, duplicateId, progress.id],
          );
          await client.query('DELETE FROM fsrs_cards WHERE id = $1', [progress.id]);
        }

        await client.query('UPDATE card_reviews SET card_id = $1 WHERE card_id = $2', [survivorId, duplicateId]);
        await client.query('DELETE FROM cards WHERE id = $1', [duplicateId]);
      }

      await client.query('COMMIT');
      return this.findById(survivorId, restaurantId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async delete(id: string, restaurantId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM cards WHERE id = $1 AND restaurant_id = $2',
      [id, restaurantId],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
