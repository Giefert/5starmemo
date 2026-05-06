import pool from '../config/database';
import {
  GlossaryTerm,
  CreateGlossaryTermInput,
  UpdateGlossaryTermInput,
  GlossaryTermCard,
  CardMatchSuggestion,
  Card
} from '../../../shared/types';

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
  return data;
}

export class GlossaryTermModel {
  static async findAll(restaurantId: string, categoryId?: string, section?: string, search?: string): Promise<GlossaryTerm[]> {
    let query = `
      SELECT gt.*,
             gc.name as category_name,
             gc.color as category_color,
             COUNT(gtc.id)::int as linked_card_count
      FROM glossary_terms gt
      LEFT JOIN glossary_categories gc ON gc.id = gt.category_id
      LEFT JOIN glossary_term_cards gtc ON gtc.term_id = gt.id
      WHERE gt.restaurant_id = $1
    `;
    const values: any[] = [restaurantId];

    if (section) {
      values.push(section);
      query += ` AND gt.section = $${values.length}`;
    }

    if (categoryId) {
      values.push(categoryId);
      query += ` AND gt.category_id = $${values.length}`;
    }

    if (search) {
      values.push(`%${search}%`);
      query += ` AND gt.term ILIKE $${values.length}`;
    }

    query += ` GROUP BY gt.id, gc.name, gc.color ORDER BY gt.term ASC`;

    const result = await pool.query(query, values);
    return result.rows.map(row => this.mapRow(row));
  }

  static async findById(id: string, restaurantId: string, includeLinkedCards = false): Promise<GlossaryTerm | null> {
    const query = `
      SELECT gt.*,
             gc.name as category_name,
             gc.color as category_color,
             gc.display_order as category_display_order
      FROM glossary_terms gt
      LEFT JOIN glossary_categories gc ON gc.id = gt.category_id
      WHERE gt.id = $1 AND gt.restaurant_id = $2
    `;
    const result = await pool.query(query, [id, restaurantId]);
    if (result.rows.length === 0) return null;

    const term = this.mapRow(result.rows[0]);

    if (includeLinkedCards) {
      term.linkedCards = await this.getLinkedCards(id);
    }

    return term;
  }

  static async getLinkedCards(termId: string): Promise<GlossaryTermCard[]> {
    const query = `
      SELECT gtc.*,
             c.deck_id,
             c.image_url,
             c.restaurant_data,
             c.card_order,
             c.created_at as card_created_at,
             c.updated_at as card_updated_at
      FROM glossary_term_cards gtc
      JOIN cards c ON c.id = gtc.card_id
      WHERE gtc.term_id = $1
      ORDER BY gtc.created_at DESC
    `;
    const result = await pool.query(query, [termId]);
    return result.rows.map(row => ({
      id: row.id,
      termId: row.term_id,
      cardId: row.card_id,
      matchField: row.match_field,
      matchContext: row.match_context,
      createdAt: row.created_at,
      card: {
        id: row.card_id,
        deckId: row.deck_id,
        imageUrl: row.image_url,
        order: row.card_order,
        createdAt: row.card_created_at,
        updatedAt: row.card_updated_at,
        restaurantData: parseRestaurantData(row.restaurant_data)
      }
    }));
  }

  static async create(data: CreateGlossaryTermInput, userId: string, restaurantId: string): Promise<GlossaryTerm> {
    const query = `
      INSERT INTO glossary_terms (term, definition, section, category_id, created_by, restaurant_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [data.term, data.definition, data.section || 'glossary', data.categoryId || null, userId, restaurantId];
    const result = await pool.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  static async update(id: string, data: UpdateGlossaryTermInput, restaurantId: string): Promise<GlossaryTerm | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.term !== undefined) {
      setClause.push(`term = $${paramCount}`);
      values.push(data.term);
      paramCount++;
    }
    if (data.definition !== undefined) {
      setClause.push(`definition = $${paramCount}`);
      values.push(data.definition);
      paramCount++;
    }
    if (data.section !== undefined) {
      setClause.push(`section = $${paramCount}`);
      values.push(data.section);
      paramCount++;
    }
    if (data.categoryId !== undefined) {
      setClause.push(`category_id = $${paramCount}`);
      values.push(data.categoryId || null);
      paramCount++;
    }

    if (setClause.length === 0) return this.findById(id, restaurantId);

    values.push(id, restaurantId);
    const query = `
      UPDATE glossary_terms
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount} AND restaurant_id = $${paramCount + 1}
      RETURNING *
    `;
    const result = await pool.query(query, values);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  static async delete(id: string, restaurantId: string): Promise<boolean> {
    const query = 'DELETE FROM glossary_terms WHERE id = $1 AND restaurant_id = $2';
    const result = await pool.query(query, [id, restaurantId]);
    return (result.rowCount || 0) > 0;
  }

  // Card linking methods. The route layer must verify the card belongs to the
  // same restaurant as the term before calling this; we don't accept a
  // restaurantId here because the link table itself doesn't carry one.
  static async linkCard(termId: string, cardId: string, matchField?: string, matchContext?: string): Promise<GlossaryTermCard> {
    const query = `
      INSERT INTO glossary_term_cards (term_id, card_id, match_field, match_context)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (term_id, card_id) DO UPDATE SET
        match_field = EXCLUDED.match_field,
        match_context = EXCLUDED.match_context
      RETURNING *
    `;
    const result = await pool.query(query, [termId, cardId, matchField || null, matchContext || null]);
    return {
      id: result.rows[0].id,
      termId: result.rows[0].term_id,
      cardId: result.rows[0].card_id,
      matchField: result.rows[0].match_field,
      matchContext: result.rows[0].match_context,
      createdAt: result.rows[0].created_at
    };
  }

  static async unlinkCard(termId: string, cardId: string): Promise<boolean> {
    const query = 'DELETE FROM glossary_term_cards WHERE term_id = $1 AND card_id = $2';
    const result = await pool.query(query, [termId, cardId]);
    return (result.rowCount || 0) > 0;
  }

  // Auto-suggestion: search cards in the caller's restaurant only. Cards
  // inherit restaurant scope through their deck.
  static async findMatchingCards(term: string, restaurantId: string, limit = 20): Promise<CardMatchSuggestion[]> {
    const searchPattern = term.toLowerCase();

    const query = `
      WITH card_matches AS (
        SELECT
          c.id,
          c.deck_id,
          c.image_url,
          c.card_order,
          c.restaurant_data,
          c.created_at,
          c.updated_at,
          -- Score each field match (higher = better)
          CASE
            WHEN LOWER(c.restaurant_data->>'itemName') = $1 THEN 100
            WHEN LOWER(c.restaurant_data->>'itemName') LIKE '%' || $1 || '%' THEN 80
            ELSE 0
          END as item_name_score,
          CASE
            WHEN c.restaurant_data->>'grapeVarieties' IS NOT NULL
                 AND LOWER(c.restaurant_data->>'grapeVarieties') LIKE '%' || $1 || '%' THEN 90
            ELSE 0
          END as grape_score,
          CASE
            WHEN LOWER(c.restaurant_data->>'region') = $1 THEN 95
            WHEN LOWER(c.restaurant_data->>'region') LIKE '%' || $1 || '%' THEN 75
            ELSE 0
          END as region_score,
          CASE
            WHEN LOWER(c.restaurant_data->>'appellation') = $1 THEN 95
            WHEN LOWER(c.restaurant_data->>'appellation') LIKE '%' || $1 || '%' THEN 75
            ELSE 0
          END as appellation_score,
          CASE
            WHEN LOWER(c.restaurant_data->>'producer') = $1 THEN 85
            WHEN LOWER(c.restaurant_data->>'producer') LIKE '%' || $1 || '%' THEN 65
            ELSE 0
          END as producer_score,
          CASE
            WHEN c.restaurant_data->>'tastingNotes' IS NOT NULL
                 AND LOWER(c.restaurant_data->>'tastingNotes') LIKE '%' || $1 || '%' THEN 60
            ELSE 0
          END as tasting_score,
          CASE
            WHEN c.restaurant_data->>'ingredients' IS NOT NULL
                 AND LOWER(c.restaurant_data->>'ingredients') LIKE '%' || $1 || '%' THEN 70
            ELSE 0
          END as ingredients_score,
          CASE
            WHEN LOWER(c.restaurant_data->>'description') LIKE '%' || $1 || '%' THEN 50
            ELSE 0
          END as description_score,
          CASE
            WHEN c.restaurant_data->>'alcohol' IS NOT NULL
                 AND LOWER(c.restaurant_data->>'alcohol') LIKE '%' || $1 || '%' THEN 80
            ELSE 0
          END as alcohol_score,
          CASE
            WHEN LOWER(c.restaurant_data->>'topping') LIKE '%' || $1 || '%' THEN 85
            WHEN LOWER(c.restaurant_data->>'base') LIKE '%' || $1 || '%' THEN 85
            WHEN LOWER(c.restaurant_data->>'sauce') LIKE '%' || $1 || '%' THEN 85
            ELSE 0
          END as maki_score,
          CASE
            WHEN LOWER(c.restaurant_data->>'garnish') LIKE '%' || $1 || '%' THEN 70
            ELSE 0
          END as garnish_score
        FROM cards c
        JOIN decks d ON d.id = c.deck_id
        WHERE c.restaurant_data IS NOT NULL
          AND d.restaurant_id = $3
      )
      SELECT
        *,
        GREATEST(
          item_name_score, grape_score, region_score, appellation_score,
          producer_score, tasting_score, ingredients_score, description_score,
          alcohol_score, maki_score, garnish_score
        ) as best_score,
        CASE
          WHEN item_name_score >= GREATEST(grape_score, region_score, appellation_score, producer_score, tasting_score, ingredients_score, description_score, alcohol_score, maki_score, garnish_score) AND item_name_score > 0 THEN 'itemName'
          WHEN region_score >= GREATEST(item_name_score, grape_score, appellation_score, producer_score, tasting_score, ingredients_score, description_score, alcohol_score, maki_score, garnish_score) AND region_score > 0 THEN 'region'
          WHEN grape_score >= GREATEST(item_name_score, region_score, appellation_score, producer_score, tasting_score, ingredients_score, description_score, alcohol_score, maki_score, garnish_score) AND grape_score > 0 THEN 'grapeVarieties'
          WHEN appellation_score >= GREATEST(item_name_score, grape_score, region_score, producer_score, tasting_score, ingredients_score, description_score, alcohol_score, maki_score, garnish_score) AND appellation_score > 0 THEN 'appellation'
          WHEN producer_score >= GREATEST(item_name_score, grape_score, region_score, appellation_score, tasting_score, ingredients_score, description_score, alcohol_score, maki_score, garnish_score) AND producer_score > 0 THEN 'producer'
          WHEN alcohol_score >= GREATEST(item_name_score, grape_score, region_score, appellation_score, producer_score, tasting_score, ingredients_score, description_score, maki_score, garnish_score) AND alcohol_score > 0 THEN 'alcohol'
          WHEN maki_score >= GREATEST(item_name_score, grape_score, region_score, appellation_score, producer_score, tasting_score, ingredients_score, description_score, alcohol_score, garnish_score) AND maki_score > 0 THEN 'maki'
          WHEN ingredients_score >= GREATEST(item_name_score, grape_score, region_score, appellation_score, producer_score, tasting_score, description_score, alcohol_score, maki_score, garnish_score) AND ingredients_score > 0 THEN 'ingredients'
          WHEN garnish_score >= GREATEST(item_name_score, grape_score, region_score, appellation_score, producer_score, tasting_score, ingredients_score, description_score, alcohol_score, maki_score) AND garnish_score > 0 THEN 'garnish'
          WHEN tasting_score > 0 THEN 'tastingNotes'
          WHEN description_score > 0 THEN 'description'
          ELSE 'other'
        END as match_field
      FROM card_matches
      WHERE GREATEST(
        item_name_score, grape_score, region_score, appellation_score,
        producer_score, tasting_score, ingredients_score, description_score,
        alcohol_score, maki_score, garnish_score
      ) > 0
      ORDER BY best_score DESC, created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [searchPattern, limit, restaurantId]);

    return result.rows.map(row => {
      const restaurantData = parseRestaurantData(row.restaurant_data);
      // Extract the matched context from the field
      let matchContext = '';
      if (restaurantData && row.match_field) {
        const fieldValue = restaurantData[row.match_field];
        if (Array.isArray(fieldValue)) {
          matchContext = fieldValue.join(', ');
        } else if (typeof fieldValue === 'string') {
          matchContext = fieldValue;
        }
      }

      return {
        cardId: row.id,
        card: {
          id: row.id,
          deckId: row.deck_id,
          imageUrl: row.image_url,
          order: row.card_order,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          restaurantData
        } as Card,
        matchField: row.match_field,
        matchContext,
        matchScore: row.best_score
      };
    });
  }

  // Confirm a card belongs to a given restaurant (via its deck) before linking.
  static async cardBelongsToRestaurant(cardId: string, restaurantId: string): Promise<boolean> {
    const query = `
      SELECT 1
      FROM cards c
      JOIN decks d ON d.id = c.deck_id
      WHERE c.id = $1 AND d.restaurant_id = $2
    `;
    const result = await pool.query(query, [cardId, restaurantId]);
    return result.rows.length > 0;
  }

  private static mapRow(row: any): GlossaryTerm {
    return {
      id: row.id,
      term: row.term,
      definition: row.definition,
      section: row.section || 'glossary',
      categoryId: row.category_id,
      category: row.category_name ? {
        id: row.category_id,
        name: row.category_name,
        color: row.category_color,
        displayOrder: row.category_display_order || 0,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      } : undefined,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      linkedCardCount: parseInt(row.linked_card_count) || 0
    };
  }
}
