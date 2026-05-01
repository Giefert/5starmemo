import pool from '../config/database';
import { User } from '../../../shared/types';

function mapRow(row: any): User {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    role: row.role,
    restaurantId: row.restaurant_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class UserModel {
  static async findByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
    const query = `
      SELECT id, email, username, password_hash, role, restaurant_id, created_at, updated_at
      FROM users
      WHERE email = $1 AND role = 'student'
    `;

    const result = await pool.query(query, [email]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return { ...mapRow(row), password_hash: row.password_hash };
  }

  static async findById(id: string): Promise<User | null> {
    const query = `
      SELECT id, email, username, role, restaurant_id, created_at, updated_at
      FROM users
      WHERE id = $1 AND role = 'student'
    `;

    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) return null;
    return mapRow(result.rows[0]);
  }
}
