import pool from '../config/database';
import {
  CurationKind,
  CurationTargetType,
  RestaurantCurationItem
} from '../../../shared/types';

export class CurationModel {
  // Verify the target row exists in the caller's restaurant. Cards inherit
  // restaurant scope through their parent deck.
  static async targetBelongsToRestaurant(
    targetType: CurationTargetType,
    targetId: string,
    restaurantId: string
  ): Promise<boolean> {
    if (targetType === 'card') {
      const r = await pool.query(
        `SELECT 1 FROM cards c
           JOIN decks d ON d.id = c.deck_id
          WHERE c.id = $1 AND d.restaurant_id = $2`,
        [targetId, restaurantId]
      );
      return r.rows.length > 0;
    }
    const r = await pool.query(
      `SELECT 1 FROM decks WHERE id = $1 AND restaurant_id = $2`,
      [targetId, restaurantId]
    );
    return r.rows.length > 0;
  }

  static async list(
    kind: CurationKind,
    restaurantId: string
  ): Promise<RestaurantCurationItem[]> {
    // Hydrate by left-joining each possible target table. Only one of the
    // joins matches per row; the other contributes NULLs.
    const result = await pool.query(
      `SELECT
         rc.target_type,
         rc.target_id,
         rc.position,
         c.id AS card_id,
         c.deck_id AS card_deck_id,
         c.restaurant_data->>'itemName' AS card_name,
         dc.title AS card_deck_title,
         d.id AS deck_id,
         d.title AS deck_title
       FROM restaurant_curations rc
       LEFT JOIN cards c
         ON rc.target_type = 'card' AND c.id = rc.target_id
       LEFT JOIN decks dc
         ON rc.target_type = 'card' AND dc.id = c.deck_id
       LEFT JOIN decks d
         ON rc.target_type = 'deck' AND d.id = rc.target_id
       WHERE rc.restaurant_id = $1 AND rc.kind = $2
       ORDER BY rc.position ASC, rc.created_at ASC`,
      [restaurantId, kind]
    );

    // Drop rows whose target was deleted (the LEFT JOIN returns NULLs for the
    // target columns). Curations table doesn't FK the polymorphic target_id,
    // so we filter dangling entries here rather than maintaining triggers.
    return result.rows
      .map((row): RestaurantCurationItem | null => {
        if (row.target_type === 'card') {
          if (!row.card_id) return null;
          return {
            targetType: 'card',
            targetId: row.card_id,
            name: row.card_name || '(untitled card)',
            deckId: row.card_deck_id,
            deckTitle: row.card_deck_title || ''
          };
        }
        if (!row.deck_id) return null;
        return {
          targetType: 'deck',
          targetId: row.deck_id,
          name: row.deck_title
        };
      })
      .filter((x): x is RestaurantCurationItem => x !== null);
  }

  static async add(
    kind: CurationKind,
    targetType: CurationTargetType,
    targetId: string,
    restaurantId: string
  ): Promise<void> {
    await pool.query(
      `INSERT INTO restaurant_curations
         (restaurant_id, kind, target_type, target_id, position)
       VALUES (
         $1, $2, $3, $4,
         COALESCE(
           (SELECT MAX(position) + 1
              FROM restaurant_curations
             WHERE restaurant_id = $1 AND kind = $2),
           0
         )
       )
       ON CONFLICT (restaurant_id, kind, target_type, target_id) DO NOTHING`,
      [restaurantId, kind, targetType, targetId]
    );
  }

  static async remove(
    kind: CurationKind,
    targetType: CurationTargetType,
    targetId: string,
    restaurantId: string
  ): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM restaurant_curations
        WHERE restaurant_id = $1 AND kind = $2
          AND target_type = $3 AND target_id = $4`,
      [restaurantId, kind, targetType, targetId]
    );
    return (result.rowCount || 0) > 0;
  }
}
