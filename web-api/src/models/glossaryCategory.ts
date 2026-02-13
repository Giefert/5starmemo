import pool from '../config/database';
import { GlossaryCategory, CreateGlossaryCategoryInput, UpdateGlossaryCategoryInput } from '../../../shared/types';

export class GlossaryCategoryModel {
  static async findAll(userId: string): Promise<GlossaryCategory[]> {
    const query = `
      SELECT gc.*,
             COUNT(gt.id)::int as term_count
      FROM glossary_categories gc
      LEFT JOIN glossary_terms gt ON gt.category_id = gc.id
      WHERE gc.created_by = $1
      GROUP BY gc.id
      ORDER BY gc.display_order ASC, gc.name ASC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows.map(row => this.mapRow(row));
  }

  static async findById(id: string): Promise<GlossaryCategory | null> {
    const query = `
      SELECT gc.*,
             COUNT(gt.id)::int as term_count
      FROM glossary_categories gc
      LEFT JOIN glossary_terms gt ON gt.category_id = gc.id
      WHERE gc.id = $1
      GROUP BY gc.id
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  static async create(data: CreateGlossaryCategoryInput, userId: string): Promise<GlossaryCategory> {
    const query = `
      INSERT INTO glossary_categories (name, description, color, display_order, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      data.name,
      data.description || null,
      data.color || null,
      data.displayOrder || 0,
      userId
    ];
    const result = await pool.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  static async update(id: string, data: UpdateGlossaryCategoryInput, userId: string): Promise<GlossaryCategory | null> {
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

    if (setClause.length === 0) return this.findById(id);

    values.push(id, userId);
    const query = `
      UPDATE glossary_categories
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount} AND created_by = $${paramCount + 1}
      RETURNING *
    `;
    const result = await pool.query(query, values);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  static async delete(id: string, userId: string): Promise<boolean> {
    const query = 'DELETE FROM glossary_categories WHERE id = $1 AND created_by = $2';
    const result = await pool.query(query, [id, userId]);
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
