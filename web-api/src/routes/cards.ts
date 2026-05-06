import { Router, Response } from 'express';
import { query, validationResult } from 'express-validator';
import pool from '../config/database';
import { authenticateToken, requireManagement, AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../../../shared/types';

const router = Router();
router.use(authenticateToken);
router.use(requireManagement);

// Lightweight card search for the dashboard Bulletin curation panels. Distinct
// from glossary/cards/search (which scores against many fields for term
// matching) — this one ILIKEs item name + parent deck title and returns only
// the columns the curation UI needs.
router.get('/search',
  [
    query('q').trim().isLength({ min: 1, max: 200 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }
      const q = (req.query.q as string).trim();
      const limit = parseInt(req.query.limit as string) || 20;
      const pattern = `%${q}%`;

      const result = await pool.query(
        `SELECT c.id,
                c.deck_id AS "deckId",
                d.title AS "deckTitle",
                c.restaurant_data->>'itemName' AS name
           FROM cards c
           JOIN decks d ON d.id = c.deck_id
          WHERE d.restaurant_id = $1
            AND (
                  c.restaurant_data->>'itemName' ILIKE $2
               OR d.title ILIKE $2
            )
          ORDER BY c.restaurant_data->>'itemName' ASC
          LIMIT $3`,
        [req.user!.restaurantId, pattern, limit]
      );

      const response: ApiResponse = { success: true, data: result.rows };
      res.json(response);
    } catch (error) {
      console.error('Error searching cards:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

export default router;
