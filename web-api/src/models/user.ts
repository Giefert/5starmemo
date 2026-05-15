import pool from '../config/database';
import { User, CreateUserInput, UserListItem } from '../../../shared/types';
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

  // List every student in the caller's restaurant with role chip data and a
  // count of decks they can see (direct + role-derived, deduped).
  static async findAllStudents(restaurantId: string): Promise<UserListItem[]> {
    const query = `
      WITH role_chips AS (
        SELECT sra.user_id,
               COALESCE(
                 jsonb_agg(jsonb_build_object('id', sr.id, 'name', sr.name)
                           ORDER BY sr.name)
                 FILTER (WHERE sr.id IS NOT NULL),
                 '[]'::jsonb
               ) AS roles
        FROM student_role_assignments sra
        JOIN student_roles sr ON sr.id = sra.role_id
        GROUP BY sra.user_id
      ),
      direct_counts AS (
        SELECT user_id, COUNT(*)::int AS n
        FROM user_deck_access
        GROUP BY user_id
      ),
      accessible AS (
        SELECT u.id AS user_id, d.id AS deck_id
        FROM users u
        JOIN user_deck_access uda ON uda.user_id = u.id
        JOIN decks d ON d.id = uda.deck_id
        UNION
        SELECT sra.user_id, rda.deck_id
        FROM student_role_assignments sra
        JOIN role_deck_access rda ON rda.role_id = sra.role_id
      ),
      total_counts AS (
        SELECT user_id, COUNT(DISTINCT deck_id)::int AS n
        FROM accessible
        GROUP BY user_id
      )
      SELECT
        u.id,
        u.email,
        u.username,
        u.created_at,
        COALESCE(rc.roles, '[]'::jsonb) AS roles,
        COALESCE(dc.n, 0) AS direct_deck_count,
        COALESCE(tc.n, 0) AS total_accessible_deck_count
      FROM users u
      LEFT JOIN role_chips rc ON rc.user_id = u.id
      LEFT JOIN direct_counts dc ON dc.user_id = u.id
      LEFT JOIN total_counts tc ON tc.user_id = u.id
      WHERE u.restaurant_id = $1 AND u.role = 'student'
      ORDER BY u.username ASC
    `;

    const result = await pool.query(query, [restaurantId]);
    return result.rows.map(row => ({
      id: row.id,
      email: row.email,
      username: row.username,
      createdAt: row.created_at,
      roles: row.roles,
      directDeckCount: row.direct_deck_count,
      totalAccessibleDeckCount: row.total_accessible_deck_count,
    }));
  }

  // Identity update. Tenant-checked: returns null if the user doesn't belong
  // to the caller's restaurant.
  static async update(
    id: string,
    fields: { email?: string; username?: string },
    restaurantId: string
  ): Promise<User | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let p = 1;

    if (fields.email !== undefined) {
      setClause.push(`email = $${p++}`);
      values.push(fields.email);
    }
    if (fields.username !== undefined) {
      setClause.push(`username = $${p++}`);
      values.push(fields.username);
    }
    if (setClause.length === 0) return this.findByIdScoped(id, restaurantId);

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, restaurantId);

    const query = `
      UPDATE users SET ${setClause.join(', ')}
      WHERE id = $${p++} AND restaurant_id = $${p}
      RETURNING id, email, username, role, restaurant_id, created_at, updated_at
    `;
    const result = await pool.query(query, values);
    if (result.rows.length === 0) return null;
    return mapRow(result.rows[0]);
  }

  static async setPassword(id: string, plaintext: string, restaurantId: string): Promise<boolean> {
    const hash = await hashPassword(plaintext);
    const result = await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND restaurant_id = $3`,
      [hash, id, restaurantId]
    );
    return (result.rowCount || 0) > 0;
  }

  static async delete(id: string, restaurantId: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM users WHERE id = $1 AND restaurant_id = $2`,
      [id, restaurantId]
    );
    return (result.rowCount || 0) > 0;
  }

  // Tenant-scoped variant for use in admin routes.
  static async findByIdScoped(id: string, restaurantId: string): Promise<User | null> {
    const query = `
      SELECT id, email, username, role, restaurant_id, created_at, updated_at
      FROM users
      WHERE id = $1 AND restaurant_id = $2
    `;
    const result = await pool.query(query, [id, restaurantId]);
    if (result.rows.length === 0) return null;
    return mapRow(result.rows[0]);
  }
}
