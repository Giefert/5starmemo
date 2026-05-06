import pool from '../config/database';
import { Restaurant } from '../../../shared/types';

export class RestaurantModel {
  static async findById(id: string): Promise<Restaurant | null> {
    const result = await pool.query(
      'SELECT id, name, slug, announcements, created_at, updated_at FROM restaurants WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      announcements: row.announcements ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async updateAnnouncements(id: string, announcements: string[]): Promise<string[]> {
    const result = await pool.query(
      `UPDATE restaurants
         SET announcements = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING announcements`,
      [announcements, id]
    );
    return result.rows[0]?.announcements ?? [];
  }
}
