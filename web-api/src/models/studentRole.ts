import pool from '../config/database';
import {
  StudentRoleSummary,
  StudentRoleDetail,
  CreateStudentRoleInput,
  UpdateStudentRoleInput,
} from '../../../shared/types';

export class StudentRoleModel {
  static async findAll(restaurantId: string): Promise<StudentRoleSummary[]> {
    const query = `
      SELECT
        r.id,
        r.name,
        r.description,
        COUNT(DISTINCT sra.user_id)::int AS member_count,
        COUNT(DISTINCT rda.deck_id)::int AS deck_count
      FROM student_roles r
      LEFT JOIN student_role_assignments sra ON sra.role_id = r.id
      LEFT JOIN role_deck_access rda ON rda.role_id = r.id
      WHERE r.restaurant_id = $1
      GROUP BY r.id, r.name, r.description
      ORDER BY r.name ASC
    `;
    const result = await pool.query(query, [restaurantId]);
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      memberCount: row.member_count,
      deckCount: row.deck_count,
    }));
  }

  static async findById(id: string, restaurantId: string): Promise<StudentRoleDetail | null> {
    const roleQuery = `
      SELECT id, name, description
      FROM student_roles
      WHERE id = $1 AND restaurant_id = $2
    `;
    const roleResult = await pool.query(roleQuery, [id, restaurantId]);
    if (roleResult.rows.length === 0) return null;
    const role = roleResult.rows[0];

    const membersResult = await pool.query(
      `SELECT u.id, u.username, u.email
       FROM student_role_assignments sra
       JOIN users u ON u.id = sra.user_id
       WHERE sra.role_id = $1 AND u.restaurant_id = $2
       ORDER BY u.username ASC`,
      [id, restaurantId]
    );

    const decksResult = await pool.query(
      `SELECT d.id, d.title
       FROM role_deck_access rda
       JOIN decks d ON d.id = rda.deck_id
       WHERE rda.role_id = $1 AND d.restaurant_id = $2
       ORDER BY d.title ASC`,
      [id, restaurantId]
    );

    return {
      id: role.id,
      name: role.name,
      description: role.description ?? undefined,
      memberCount: membersResult.rows.length,
      deckCount: decksResult.rows.length,
      members: membersResult.rows.map(r => ({ id: r.id, username: r.username, email: r.email })),
      decks: decksResult.rows.map(r => ({ id: r.id, title: r.title })),
    };
  }

  static async create(
    data: CreateStudentRoleInput,
    restaurantId: string
  ): Promise<StudentRoleSummary> {
    const result = await pool.query(
      `INSERT INTO student_roles (restaurant_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING id, name, description`,
      [restaurantId, data.name, data.description ?? null]
    );
    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      memberCount: 0,
      deckCount: 0,
    };
  }

  static async update(
    id: string,
    data: UpdateStudentRoleInput,
    restaurantId: string
  ): Promise<StudentRoleSummary | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let p = 1;
    if (data.name !== undefined) {
      setClause.push(`name = $${p++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      setClause.push(`description = $${p++}`);
      values.push(data.description);
    }
    if (setClause.length === 0) {
      const detail = await this.findById(id, restaurantId);
      return detail
        ? {
            id: detail.id,
            name: detail.name,
            description: detail.description,
            memberCount: detail.memberCount,
            deckCount: detail.deckCount,
          }
        : null;
    }
    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, restaurantId);
    const result = await pool.query(
      `UPDATE student_roles SET ${setClause.join(', ')}
       WHERE id = $${p++} AND restaurant_id = $${p}
       RETURNING id, name, description`,
      values
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    // Return with fresh aggregated counts for caller convenience.
    const detail = await this.findById(row.id, restaurantId);
    return detail
      ? {
          id: detail.id,
          name: detail.name,
          description: detail.description,
          memberCount: detail.memberCount,
          deckCount: detail.deckCount,
        }
      : null;
  }

  static async delete(id: string, restaurantId: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM student_roles WHERE id = $1 AND restaurant_id = $2`,
      [id, restaurantId]
    );
    return (result.rowCount || 0) > 0;
  }

  // Replace-all the set of decks granted to a role. Tenant-checks every deck
  // id by joining `decks.restaurant_id` in the INSERT … SELECT — ids from
  // other restaurants are silently dropped, which prevents cross-tenant leak.
  static async setRoleDecks(
    roleId: string,
    deckIds: string[],
    restaurantId: string
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const owns = await client.query(
        `SELECT 1 FROM student_roles WHERE id = $1 AND restaurant_id = $2`,
        [roleId, restaurantId]
      );
      if (owns.rows.length === 0) {
        throw new Error('Role not found');
      }

      await client.query(`DELETE FROM role_deck_access WHERE role_id = $1`, [roleId]);
      if (deckIds.length > 0) {
        await client.query(
          `INSERT INTO role_deck_access (role_id, deck_id)
           SELECT $1, d.id FROM decks d
           WHERE d.id = ANY($2::uuid[]) AND d.restaurant_id = $3`,
          [roleId, deckIds, restaurantId]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Replace-all the set of roles assigned to a student.
  static async setUserRoles(
    userId: string,
    roleIds: string[],
    restaurantId: string
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const owns = await client.query(
        `SELECT 1 FROM users WHERE id = $1 AND restaurant_id = $2`,
        [userId, restaurantId]
      );
      if (owns.rows.length === 0) {
        throw new Error('User not found');
      }

      await client.query(`DELETE FROM student_role_assignments WHERE user_id = $1`, [userId]);
      if (roleIds.length > 0) {
        await client.query(
          `INSERT INTO student_role_assignments (user_id, role_id)
           SELECT $1, r.id FROM student_roles r
           WHERE r.id = ANY($2::uuid[]) AND r.restaurant_id = $3`,
          [userId, roleIds, restaurantId]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
