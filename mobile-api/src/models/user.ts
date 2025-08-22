import pool from '../config/database';
import { User } from '../../../shared/types';

export class UserModel {
  static async findByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
    const query = `
      SELECT id, email, username, password_hash, role, created_at, updated_at
      FROM users
      WHERE email = $1 AND role = 'student'
    `;
    
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  static async findById(id: string): Promise<User | null> {
    const query = `
      SELECT id, email, username, role, created_at, updated_at
      FROM users
      WHERE id = $1 AND role = 'student'
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findStudents(): Promise<User[]> {
    const query = `
      SELECT id, email, username, role, created_at, updated_at
      FROM users
      WHERE role = 'student'
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }
}