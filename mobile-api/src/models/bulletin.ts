import pool from '../config/database';
import {
  BulletinPayload,
  CurationKind,
  RestaurantCurationItem,
} from '../../../shared/types';

const KINDS: CurationKind[] = ['specials', 'new_item', 'featured', 'in_season'];

export class BulletinModel {
  // Returns the restaurant header + all four curated lists for the student
  // bulletin in a single round trip. Read-only; no auth side effects.
  static async getForRestaurant(restaurantId: string): Promise<BulletinPayload | null> {
    const restaurantResult = await pool.query(
      `SELECT id, name, slug, announcements
         FROM restaurants
        WHERE id = $1`,
      [restaurantId]
    );
    if (restaurantResult.rows.length === 0) return null;
    const r = restaurantResult.rows[0];

    const curationsResult = await pool.query(
      `SELECT
         rc.kind,
         rc.target_type,
         rc.target_id,
         rc.position,
         c.id AS card_id,
         c.deck_id AS card_deck_id,
         c.image_url AS card_image_url,
         c.restaurant_data->>'itemName' AS card_name,
         c.restaurant_data->>'category' AS card_category,
         dc.title AS card_deck_title,
         d.id AS deck_id,
         d.title AS deck_title,
         (
           SELECT image_url FROM cards
            WHERE deck_id = d.id AND image_url IS NOT NULL
            ORDER BY card_order ASC
            LIMIT 1
         ) AS deck_cover_url
       FROM restaurant_curations rc
       LEFT JOIN cards c
         ON rc.target_type = 'card' AND c.id = rc.target_id
       LEFT JOIN decks dc
         ON rc.target_type = 'card' AND dc.id = c.deck_id
       LEFT JOIN decks d
         ON rc.target_type = 'deck' AND d.id = rc.target_id
       WHERE rc.restaurant_id = $1
       ORDER BY rc.kind ASC, rc.position ASC, rc.created_at ASC`,
      [restaurantId]
    );

    const curations: Record<CurationKind, RestaurantCurationItem[]> = {
      specials: [],
      new_item: [],
      featured: [],
      in_season: [],
    };

    for (const row of curationsResult.rows) {
      const kind = row.kind as CurationKind;
      if (!KINDS.includes(kind)) continue;

      if (row.target_type === 'card') {
        if (!row.card_id) continue; // dangling: card was deleted
        curations[kind].push({
          targetType: 'card',
          targetId: row.card_id,
          name: row.card_name || '(untitled card)',
          deckId: row.card_deck_id,
          deckTitle: row.card_deck_title || '',
          imageUrl: row.card_image_url || undefined,
          category: row.card_category || undefined,
        });
      } else {
        if (!row.deck_id) continue; // dangling: deck was deleted
        curations[kind].push({
          targetType: 'deck',
          targetId: row.deck_id,
          name: row.deck_title,
          imageUrl: row.deck_cover_url || undefined,
        });
      }
    }

    return {
      restaurant: {
        id: r.id,
        name: r.name,
        slug: r.slug,
        announcements: r.announcements ?? [],
      },
      curations,
    };
  }
}
