import pool from '../config/database';
import { User, CreateUserInput } from '../../../shared/types';
import { hashPassword } from '../utils/auth';

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
  static async create(userData: CreateUserInput, restaurantId: string): Promise<User> {
    const hashedPassword = await hashPassword(userData.password);

    const query = `
      INSERT INTO users (email, username, password_hash, role, restaurant_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, username, role, restaurant_id, created_at, updated_at
    `;

    const values = [userData.email, userData.username, hashedPassword, userData.role, restaurantId];
    const result = await pool.query(query, values);

    return mapRow(result.rows[0]);
  }

  static async findByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
    const query = `
      SELECT id, email, username, password_hash, role, restaurant_id, created_at, updated_at
      FROM users
      WHERE email = $1
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
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) return null;
    return mapRow(result.rows[0]);
  }
}
