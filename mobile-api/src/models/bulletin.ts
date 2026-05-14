import pool from '../config/database';
import {
  BulletinPayload,
  CurationKind,
  CurationStudyUnit,
  RestaurantCurationItem,
  StudyCardData,
  Card,
  FSRSCard,
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

  // Returns the studyable units (one per curated card/deck) for a single
  // curation kind in the student's restaurant. Each unit carries its cards
  // already joined with the student's FSRS state. Caller layers shuffling
  // and progress-bar marker computation on top.
  static async getStudyUnits(
    restaurantId: string,
    userId: string,
    kind: CurationKind,
  ): Promise<CurationStudyUnit[]> {
    const curationsResult = await pool.query(
      `SELECT rc.target_type, rc.target_id, rc.position, rc.created_at,
              c.restaurant_data->>'itemName' AS card_name,
              d.title AS deck_title
         FROM restaurant_curations rc
         LEFT JOIN cards c
           ON rc.target_type = 'card' AND c.id = rc.target_id
         LEFT JOIN decks d
           ON rc.target_type = 'deck' AND d.id = rc.target_id
        WHERE rc.restaurant_id = $1 AND rc.kind = $2
        ORDER BY rc.position ASC, rc.created_at ASC`,
      [restaurantId, kind],
    );

    const cardTargets: string[] = [];
    const deckTargets: string[] = [];
    for (const row of curationsResult.rows) {
      if (row.target_type === 'card' && row.card_name !== null) {
        cardTargets.push(row.target_id);
      } else if (row.target_type === 'deck' && row.deck_title !== null) {
        deckTargets.push(row.target_id);
      }
    }

    const cardRowsByCard = new Map<string, StudyCardData>();
    if (cardTargets.length > 0) {
      const cardResult = await pool.query(
        `SELECT c.id, c.deck_id, c.image_url, c.card_order, c.restaurant_data,
                c.created_at, c.updated_at,
                d.restaurant_id,
                fc.id AS fsrs_id, fc.difficulty, fc.stability, fc.retrievability,
                fc.grade, fc.lapses, fc.reps, fc.state,
                fc.last_review, fc.next_review,
                fc.created_at AS fsrs_created_at, fc.updated_at AS fsrs_updated_at
           FROM cards c
           JOIN decks d ON d.id = c.deck_id
           LEFT JOIN fsrs_cards fc ON c.id = fc.card_id AND fc.user_id = $2
          WHERE c.id = ANY($1::uuid[]) AND d.restaurant_id = $3`,
        [cardTargets, userId, restaurantId],
      );
      for (const row of cardResult.rows) {
        cardRowsByCard.set(row.id, rowToStudyCard(row, userId));
      }
    }

    const cardRowsByDeck = new Map<string, StudyCardData[]>();
    if (deckTargets.length > 0) {
      const deckCardResult = await pool.query(
        `SELECT c.id, c.deck_id, c.image_url, c.card_order, c.restaurant_data,
                c.created_at, c.updated_at,
                fc.id AS fsrs_id, fc.difficulty, fc.stability, fc.retrievability,
                fc.grade, fc.lapses, fc.reps, fc.state,
                fc.last_review, fc.next_review,
                fc.created_at AS fsrs_created_at, fc.updated_at AS fsrs_updated_at
           FROM cards c
           JOIN decks d ON d.id = c.deck_id
           LEFT JOIN fsrs_cards fc ON c.id = fc.card_id AND fc.user_id = $2
          WHERE c.deck_id = ANY($1::uuid[]) AND d.restaurant_id = $3
          ORDER BY c.card_order ASC, c.created_at ASC`,
        [deckTargets, userId, restaurantId],
      );
      for (const row of deckCardResult.rows) {
        const list = cardRowsByDeck.get(row.deck_id) ?? [];
        list.push(rowToStudyCard(row, userId));
        cardRowsByDeck.set(row.deck_id, list);
      }
    }

    const units: CurationStudyUnit[] = [];
    for (const row of curationsResult.rows) {
      if (row.target_type === 'card') {
        const card = cardRowsByCard.get(row.target_id);
        if (!card) continue;
        units.push({
          type: 'card',
          targetId: row.target_id,
          title: row.card_name || '(untitled card)',
          cards: [card],
        });
      } else if (row.target_type === 'deck') {
        const cards = cardRowsByDeck.get(row.target_id) ?? [];
        if (cards.length === 0) continue;
        units.push({
          type: 'deck',
          targetId: row.target_id,
          title: row.deck_title,
          cards,
        });
      }
    }

    return units;
  }
}

function rowToStudyCard(row: any, userId: string): StudyCardData {
  const card: Card = {
    id: row.id,
    deckId: row.deck_id,
    imageUrl: row.image_url || undefined,
    order: row.card_order,
    restaurantData: row.restaurant_data || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  const fsrsData: FSRSCard = row.fsrs_id
    ? {
        id: row.fsrs_id,
        cardId: row.id,
        userId,
        difficulty: parseFloat(row.difficulty) || 0,
        stability: parseFloat(row.stability) || 0,
        retrievability: parseFloat(row.retrievability) || 0,
        grade: parseInt(row.grade) || 0,
        lapses: parseInt(row.lapses) || 0,
        reps: parseInt(row.reps) || 0,
        state: row.state || 'new',
        lastReview: row.last_review,
        nextReview: row.next_review || new Date(),
        createdAt: row.fsrs_created_at || new Date(),
        updatedAt: row.fsrs_updated_at || new Date(),
      }
    : {
        id: '',
        cardId: row.id,
        userId,
        difficulty: 0,
        stability: 0,
        retrievability: 0,
        grade: 0,
        lapses: 0,
        reps: 0,
        state: 'new',
        lastReview: undefined,
        nextReview: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

  return { card, fsrsData, isNew: !row.fsrs_id };
}
