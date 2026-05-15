import pool from '../config/database';
import { DeckAccess, UserDetail } from '../../../shared/types';

export class UserDeckAccessModel {
  // Replace-all the set of decks directly granted to a student.
  static async setUserDecks(
    userId: string,
    deckIds: string[],
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

      await client.query(`DELETE FROM user_deck_access WHERE user_id = $1`, [userId]);
      if (deckIds.length > 0) {
        await client.query(
          `INSERT INTO user_deck_access (user_id, deck_id)
           SELECT $1, d.id FROM decks d
           WHERE d.id = ANY($2::uuid[]) AND d.restaurant_id = $3`,
          [userId, deckIds, restaurantId]
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

  // Replace-all the set of roles AND users that have access to a single deck
  // (the deck-centric editor on the deck page). Both grant tables are wiped
  // and rewritten in one transaction so we never expose a partial state.
  static async setDeckAccess(
    deckId: string,
    payload: { roleIds: string[]; userIds: string[] },
    restaurantId: string
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const owns = await client.query(
        `SELECT 1 FROM decks WHERE id = $1 AND restaurant_id = $2`,
        [deckId, restaurantId]
      );
      if (owns.rows.length === 0) {
        throw new Error('Deck not found');
      }

      await client.query(`DELETE FROM role_deck_access WHERE deck_id = $1`, [deckId]);
      if (payload.roleIds.length > 0) {
        await client.query(
          `INSERT INTO role_deck_access (role_id, deck_id)
           SELECT r.id, $1 FROM student_roles r
           WHERE r.id = ANY($2::uuid[]) AND r.restaurant_id = $3`,
          [deckId, payload.roleIds, restaurantId]
        );
      }

      await client.query(`DELETE FROM user_deck_access WHERE deck_id = $1`, [deckId]);
      if (payload.userIds.length > 0) {
        await client.query(
          `INSERT INTO user_deck_access (user_id, deck_id)
           SELECT u.id, $1 FROM users u
           WHERE u.id = ANY($2::uuid[])
             AND u.restaurant_id = $3
             AND u.role = 'student'`,
          [deckId, payload.userIds, restaurantId]
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

  static async getDeckAccess(deckId: string, restaurantId: string): Promise<DeckAccess | null> {
    const owns = await pool.query(
      `SELECT 1 FROM decks WHERE id = $1 AND restaurant_id = $2`,
      [deckId, restaurantId]
    );
    if (owns.rows.length === 0) return null;

    const rolesResult = await pool.query(
      `SELECT r.id, r.name FROM role_deck_access rda
       JOIN student_roles r ON r.id = rda.role_id
       WHERE rda.deck_id = $1 AND r.restaurant_id = $2
       ORDER BY r.name ASC`,
      [deckId, restaurantId]
    );
    const usersResult = await pool.query(
      `SELECT u.id, u.username, u.email FROM user_deck_access uda
       JOIN users u ON u.id = uda.user_id
       WHERE uda.deck_id = $1 AND u.restaurant_id = $2
       ORDER BY u.username ASC`,
      [deckId, restaurantId]
    );

    return {
      roles: rolesResult.rows.map(r => ({ id: r.id, name: r.name })),
      users: usersResult.rows.map(r => ({ id: r.id, username: r.username, email: r.email })),
    };
  }

  // Full access summary for a student: roles, direct deck grants, and the
  // decks they inherit via roles (with originating role for the UI).
  static async getUserAccessDetail(
    userId: string,
    restaurantId: string
  ): Promise<Pick<UserDetail, 'roles' | 'directDecks' | 'roleDecks'> | null> {
    const owns = await pool.query(
      `SELECT 1 FROM users WHERE id = $1 AND restaurant_id = $2`,
      [userId, restaurantId]
    );
    if (owns.rows.length === 0) return null;

    const rolesResult = await pool.query(
      `SELECT r.id, r.name FROM student_role_assignments sra
       JOIN student_roles r ON r.id = sra.role_id
       WHERE sra.user_id = $1 AND r.restaurant_id = $2
       ORDER BY r.name ASC`,
      [userId, restaurantId]
    );

    const directResult = await pool.query(
      `SELECT d.id, d.title FROM user_deck_access uda
       JOIN decks d ON d.id = uda.deck_id
       WHERE uda.user_id = $1 AND d.restaurant_id = $2
       ORDER BY d.title ASC`,
      [userId, restaurantId]
    );

    const roleDecksResult = await pool.query(
      `SELECT d.id, d.title, r.id AS via_role_id, r.name AS via_role_name
       FROM student_role_assignments sra
       JOIN student_roles r ON r.id = sra.role_id
       JOIN role_deck_access rda ON rda.role_id = r.id
       JOIN decks d ON d.id = rda.deck_id
       WHERE sra.user_id = $1 AND d.restaurant_id = $2
       ORDER BY r.name ASC, d.title ASC`,
      [userId, restaurantId]
    );

    return {
      roles: rolesResult.rows.map(r => ({ id: r.id, name: r.name })),
      directDecks: directResult.rows.map(r => ({ id: r.id, title: r.title })),
      roleDecks: roleDecksResult.rows.map(r => ({
        id: r.id,
        title: r.title,
        viaRoleId: r.via_role_id,
        viaRoleName: r.via_role_name,
      })),
    };
  }
}
