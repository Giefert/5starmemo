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
         c.restaurant_data->>'category' AS card_category,
         CASE
           WHEN jsonb_typeof(c.restaurant_data->'seasonStartMonth') = 'number'
           THEN (c.restaurant_data->>'seasonStartMonth')::int
         END AS card_season_start_month,
         CASE
           WHEN jsonb_typeof(c.restaurant_data->'seasonEndMonth') = 'number'
           THEN (c.restaurant_data->>'seasonEndMonth')::int
         END AS card_season_end_month,
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
    const manualItems = result.rows
      .map((row): RestaurantCurationItem | null => {
        if (row.target_type === 'card') {
          if (!row.card_id) return null;
          return {
            targetType: 'card',
            targetId: row.card_id,
            name: row.card_name || '(untitled card)',
            deckId: row.card_deck_id,
            deckTitle: row.card_deck_title || '',
            category: row.card_category || undefined,
            seasonStartMonth: row.card_season_start_month ?? undefined,
            seasonEndMonth: row.card_season_end_month ?? undefined,
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

    if (kind !== 'in_season') return manualItems;

    const [automaticItems, hiddenItems] = await Promise.all([
      this.listAutomaticInSeason(restaurantId, false),
      this.listAutomaticInSeason(restaurantId, true),
    ]);
    const hiddenCardIds = new Set(hiddenItems.map((item) => item.targetId));

    return [
      ...manualItems.filter(
        (item) => isSeasonalFishItem(item)
          && !hiddenCardIds.has(item.targetId)
      ),
      ...automaticItems,
    ];
  }

  static async listHiddenInSeason(
    restaurantId: string
  ): Promise<RestaurantCurationItem[]> {
    return this.listAutomaticInSeason(restaurantId, true);
  }

  private static async listAutomaticInSeason(
    restaurantId: string,
    hidden: boolean
  ): Promise<RestaurantCurationItem[]> {
    const result = await pool.query(
      `SELECT c.id,
              c.deck_id,
              c.restaurant_data->>'itemName' AS name,
              d.title AS deck_title,
              season.start_month,
              season.end_month
         FROM cards c
         JOIN decks d ON d.id = c.deck_id
         CROSS JOIN LATERAL (
           SELECT
             CASE
               WHEN jsonb_typeof(c.restaurant_data->'seasonStartMonth') = 'number'
               THEN (c.restaurant_data->>'seasonStartMonth')::int
             END AS start_month,
             CASE
               WHEN jsonb_typeof(c.restaurant_data->'seasonEndMonth') = 'number'
               THEN (c.restaurant_data->>'seasonEndMonth')::int
             END AS end_month
         ) season
        WHERE d.restaurant_id = $1
          AND c.restaurant_data->>'category' = 'fish'
          AND season.start_month BETWEEN 1 AND 12
          AND season.end_month BETWEEN 1 AND 12
          AND EXISTS (
                SELECT 1
                  FROM in_season_bulletin_suppressions s
                 WHERE s.restaurant_id = $1 AND s.card_id = c.id
              ) = $2
          AND (
                $2
                OR NOT EXISTS (
                    SELECT 1
                      FROM restaurant_curations rc
                     WHERE rc.restaurant_id = $1
                       AND rc.kind = 'in_season'
                       AND rc.target_type = 'card'
                       AND rc.target_id = c.id
                )
              )
        ORDER BY c.restaurant_data->>'itemName' ASC, c.created_at ASC`,
      [restaurantId, hidden]
    );

    return result.rows.map((row): RestaurantCurationItem => ({
      targetType: 'card',
      targetId: row.id,
      name: row.name || '(untitled card)',
      deckId: row.deck_id,
      deckTitle: row.deck_title || '',
      category: 'fish',
      seasonStartMonth: row.start_month,
      seasonEndMonth: row.end_month,
      automatic: true,
    }));
  }

  static async isAutomaticInSeasonCard(
    targetId: string,
    restaurantId: string
  ): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1
         FROM cards c
         JOIN decks d ON d.id = c.deck_id
         CROSS JOIN LATERAL (
           SELECT
             CASE
               WHEN jsonb_typeof(c.restaurant_data->'seasonStartMonth') = 'number'
               THEN (c.restaurant_data->>'seasonStartMonth')::int
             END AS start_month,
             CASE
               WHEN jsonb_typeof(c.restaurant_data->'seasonEndMonth') = 'number'
               THEN (c.restaurant_data->>'seasonEndMonth')::int
             END AS end_month
         ) season
        WHERE c.id = $1
          AND d.restaurant_id = $2
          AND c.restaurant_data->>'category' = 'fish'
          AND season.start_month BETWEEN 1 AND 12
          AND season.end_month BETWEEN 1 AND 12`,
      [targetId, restaurantId]
    );
    return result.rows.length > 0;
  }

  static async suppressInSeasonCard(
    targetId: string,
    restaurantId: string
  ): Promise<void> {
    await pool.query(
      `INSERT INTO in_season_bulletin_suppressions (restaurant_id, card_id)
       VALUES ($1, $2)
       ON CONFLICT (restaurant_id, card_id) DO NOTHING`,
      [restaurantId, targetId]
    );
  }

  static async restoreInSeasonCard(
    targetId: string,
    restaurantId: string
  ): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM in_season_bulletin_suppressions
        WHERE restaurant_id = $1 AND card_id = $2`,
      [restaurantId, targetId]
    );
    return (result.rowCount || 0) > 0;
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

  // Rewrite positions for a kind to match the order of the supplied list.
  // Items not present in the supplied list keep their existing position.
  static async reorder(
    kind: CurationKind,
    items: { targetType: CurationTargetType; targetId: string }[],
    restaurantId: string
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < items.length; i++) {
        await client.query(
          `UPDATE restaurant_curations
              SET position = $1
            WHERE restaurant_id = $2 AND kind = $3
              AND target_type = $4 AND target_id = $5`,
          [i, restaurantId, kind, items[i].targetType, items[i].targetId]
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

function isSeasonalFishItem(item: RestaurantCurationItem): boolean {
  return item.targetType === 'card'
    && item.category === 'fish'
    && Number.isInteger(item.seasonStartMonth)
    && Number.isInteger(item.seasonEndMonth)
    && item.seasonStartMonth! >= 1
    && item.seasonStartMonth! <= 12
    && item.seasonEndMonth! >= 1
    && item.seasonEndMonth! <= 12;
}
