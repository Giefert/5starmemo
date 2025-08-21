import pool from '../config/database';
import { User, CreateUserInput } from '../../../shared/types';
import { hashPassword } from '../utils/auth';

export class UserModel {
  static async create(userData: CreateUserInput): Promise<User> {
    const hashedPassword = await hashPassword(userData.password);
    
    const query = `
      INSERT INTO users (email, username, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, username, role, created_at, updated_at
    `;
    
    const values = [userData.email, userData.username, hashedPassword, userData.role];
    const result = await pool.query(query, values);
    
    return result.rows[0];
  }

  static async findByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
    const query = `
      SELECT id, email, username, password_hash, role, created_at, updated_at
      FROM users
      WHERE email = $1
    `;
    
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  static async findById(id: string): Promise<User | null> {
    const query = `
      SELECT id, email, username, role, created_at, updated_at
      FROM users
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByRole(role: 'student' | 'management'): Promise<User[]> {
    const query = `
      SELECT id, email, username, role, created_at, updated_at
      FROM users
      WHERE role = $1
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query, [role]);
    return result.rows;
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }
}