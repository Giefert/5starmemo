import pool from '../config/database';
import { GlossaryTermSummary, GlossaryCategory, GlossaryTerm } from '../../../shared/types';

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

export class GlossaryModel {
  // Get all categories for browsing
  static async getCategories(): Promise<GlossaryCategory[]> {
    const query = `
      SELECT gc.*,
             COUNT(gt.id)::int as term_count
      FROM glossary_categories gc
      LEFT JOIN glossary_terms gt ON gt.category_id = gc.id
      GROUP BY gc.id
      ORDER BY gc.display_order ASC, gc.name ASC
    `;
    const result = await pool.query(query);
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      color: row.color,
      displayOrder: row.display_order,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      termCount: parseInt(row.term_count) || 0
    }));
  }

  // Get terms with optional filtering
  static async getTerms(options: {
    categoryId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ terms: GlossaryTermSummary[]; total: number }> {
    const { categoryId, search, page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const values: any[] = [];
    let paramCount = 1;

    if (categoryId) {
      whereClause += ` AND gt.category_id = $${paramCount}`;
      values.push(categoryId);
      paramCount++;
    }

    if (search) {
      whereClause += ` AND (
        LOWER(gt.term) LIKE $${paramCount} OR
        LOWER(gt.definition) LIKE $${paramCount}
      )`;
      values.push(`%${search.toLowerCase()}%`);
      paramCount++;
    }

    // Count query
    const countQuery = `
      SELECT COUNT(*)::int as total
      FROM glossary_terms gt
      WHERE 1=1 ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = countResult.rows[0].total;

    // Data query
    const dataQuery = `
      SELECT gt.id, gt.term, gt.definition, gt.category_id,
             gc.name as category_name, gc.color as category_color,
             COUNT(gtc.id)::int as linked_card_count
      FROM glossary_terms gt
      LEFT JOIN glossary_categories gc ON gc.id = gt.category_id
      LEFT JOIN glossary_term_cards gtc ON gtc.term_id = gt.id
      WHERE 1=1 ${whereClause}
      GROUP BY gt.id, gc.name, gc.color
      ORDER BY gt.term ASC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    values.push(limit, offset);

    const result = await pool.query(dataQuery, values);
    const terms = result.rows.map(row => ({
      id: row.id,
      term: row.term,
      definition: row.definition,
      categoryId: row.category_id,
      categoryName: row.category_name,
      categoryColor: row.category_color,
      linkedCardCount: parseInt(row.linked_card_count) || 0
    }));

    return { terms, total };
  }

  // Get single term with linked cards
  static async getTermById(id: string): Promise<GlossaryTerm | null> {
    const query = `
      SELECT gt.*,
             gc.name as category_name, gc.color as category_color,
             gc.display_order as category_display_order
      FROM glossary_terms gt
      LEFT JOIN glossary_categories gc ON gc.id = gt.category_id
      WHERE gt.id = $1
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];

    // Get linked cards
    const cardsQuery = `
      SELECT gtc.*,
             c.restaurant_data,
             c.image_url,
             c.deck_id,
             c.card_order,
             c.created_at as card_created_at,
             c.updated_at as card_updated_at
      FROM glossary_term_cards gtc
      JOIN cards c ON c.id = gtc.card_id
      WHERE gtc.term_id = $1
      ORDER BY gtc.created_at DESC
    `;
    const cardsResult = await pool.query(cardsQuery, [id]);

    return {
      id: row.id,
      term: row.term,
      definition: row.definition,
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
      linkedCards: cardsResult.rows.map(card => ({
        id: card.id,
        termId: card.term_id,
        cardId: card.card_id,
        matchField: card.match_field,
        matchContext: card.match_context,
        createdAt: card.created_at,
        card: {
          id: card.card_id,
          deckId: card.deck_id,
          imageUrl: card.image_url,
          order: card.card_order,
          createdAt: card.card_created_at,
          updatedAt: card.card_updated_at,
          restaurantData: parseRestaurantData(card.restaurant_data)
        }
      }))
    };
  }
}
