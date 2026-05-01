import pool from '../config/database';
import { GlossaryCategory, CreateGlossaryCategoryInput, UpdateGlossaryCategoryInput } from '../../../shared/types';

export class GlossaryCategoryModel {
  static async findAll(restaurantId: string): Promise<GlossaryCategory[]> {
    const query = `
      SELECT gc.*,
             COUNT(gt.id)::int as term_count
      FROM glossary_categories gc
      LEFT JOIN glossary_terms gt ON gt.category_id = gc.id
      WHERE gc.restaurant_id = $1
      GROUP BY gc.id
      ORDER BY gc.display_order ASC, gc.name ASC
    `;
    const result = await pool.query(query, [restaurantId]);
    return result.rows.map(row => this.mapRow(row));
  }

  static async findById(id: string, restaurantId: string): Promise<GlossaryCategory | null> {
    const query = `
      SELECT gc.*,
             COUNT(gt.id)::int as term_count
      FROM glossary_categories gc
      LEFT JOIN glossary_terms gt ON gt.category_id = gc.id
      WHERE gc.id = $1 AND gc.restaurant_id = $2
      GROUP BY gc.id
    `;
    const result = await pool.query(query, [id, restaurantId]);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  static async create(data: CreateGlossaryCategoryInput, userId: string, restaurantId: string): Promise<GlossaryCategory> {
    const query = `
      INSERT INTO glossary_categories (name, description, color, display_order, created_by, restaurant_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      data.name,
      data.description || null,
      data.color || null,
      data.displayOrder || 0,
      userId,
      restaurantId
    ];
    const result = await pool.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  static async update(id: string, data: UpdateGlossaryCategoryInput, restaurantId: string): Promise<GlossaryCategory | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      setClause.push(`name = $${paramCount}`);
      values.push(data.name);
      paramCount++;
    }
    if (data.description !== undefined) {
      setClause.push(`description = $${paramCount}`);
      values.push(data.description);
      paramCount++;
    }
    if (data.color !== undefined) {
      setClause.push(`color = $${paramCount}`);
      values.push(data.color);
      paramCount++;
    }
    if (data.displayOrder !== undefined) {
      setClause.push(`display_order = $${paramCount}`);
      values.push(data.displayOrder);
      paramCount++;
    }

    if (setClause.length === 0) return this.findById(id, restaurantId);

    values.push(id, restaurantId);
    const query = `
      UPDATE glossary_categories
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount} AND restaurant_id = $${paramCount + 1}
      RETURNING *
    `;
    const result = await pool.query(query, values);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  static async delete(id: string, restaurantId: string): Promise<boolean> {
    const query = 'DELETE FROM glossary_categories WHERE id = $1 AND restaurant_id = $2';
    const result = await pool.query(query, [id, restaurantId]);
    return (result.rowCount || 0) > 0;
  }

  private static mapRow(row: any): GlossaryCategory {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      color: row.color,
      displayOrder: row.display_order,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      termCount: parseInt(row.term_count) || 0
    };
  }
}
