import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken, requireManagement, AuthenticatedRequest } from '../middleware/auth';
import { CardModel } from '../models/card';
import {
  ApiResponse,
  CreateCardInput,
  RestaurantCategory,
  UpdateCardInput,
} from '../../../shared/types';

const VALID_CATEGORIES: RestaurantCategory[] = [
  'wine', 'beer', 'cocktail', 'spirit', 'maki', 'sake',
  'sauce', 'fish', 'dietary', 'starters', 'sashimi',
];

const router = Router();
router.use(authenticateToken);
router.use(requireManagement);

const cardBodyValidation = [
  body('restaurantData').optional().isObject(),
  body('restaurantData.itemName').optional().trim().isLength({ min: 1 }),
  body('restaurantData.category').optional().isIn(VALID_CATEGORIES),
];

router.get('/',
  [
    query('q').optional().trim().isLength({ max: 200 }),
    query('category').optional().isIn(VALID_CATEGORIES),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
      const cards = await CardModel.findAll({
        restaurantId: req.user!.restaurantId,
        search: (req.query.q as string | undefined)?.trim() || undefined,
        category: req.query.category as RestaurantCategory | undefined,
      });
      res.json({ success: true, data: cards } satisfies ApiResponse);
    } catch (error) {
      console.error('Error listing cards:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },
);

// Lightweight search used by dashboard curation pickers.
router.get('/search',
  [
    query('q').trim().isLength({ min: 1, max: 200 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const cards = await CardModel.findAll({
        restaurantId: req.user!.restaurantId,
        search: (req.query.q as string).trim(),
      });
      const data = cards.slice(0, limit).map(card => ({
        id: card.id,
        deckId: card.decks?.[0]?.id,
        deckTitle: card.decks?.map(deck => deck.title).join(', ') || 'Unassigned',
        name: card.restaurantData?.itemName || '(untitled card)',
      }));
      res.json({ success: true, data } satisfies ApiResponse);
    } catch (error) {
      console.error('Error searching cards:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },
);

router.post('/',
  [
    ...cardBodyValidation,
    body('deckIds').optional().isArray(),
    body('deckIds.*').optional().isUUID(),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
      const card = await CardModel.create(req.user!.restaurantId, req.body as CreateCardInput);
      res.status(201).json({ success: true, data: card, message: 'Card created successfully' } satisfies ApiResponse);
    } catch (error: any) {
      if (error?.message === 'Invalid deck selection') {
        return res.status(400).json({ success: false, error: error.message });
      }
      console.error('Error creating card:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },
);

router.get('/:id', [param('id').isUUID()], async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Invalid card ID' });
  const card = await CardModel.findById(req.params.id, req.user!.restaurantId);
  if (!card) return res.status(404).json({ success: false, error: 'Card not found' });
  res.json({ success: true, data: card } satisfies ApiResponse);
});

router.put('/:id', [param('id').isUUID(), ...cardBodyValidation], async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }
  const card = await CardModel.update(req.params.id, req.user!.restaurantId, req.body as UpdateCardInput);
  if (!card) return res.status(404).json({ success: false, error: 'Card not found' });
  res.json({ success: true, data: card, message: 'Card updated successfully' } satisfies ApiResponse);
});

router.post('/:id/merge',
  [
    param('id').isUUID(),
    body('duplicateIds').isArray({ min: 1 }),
    body('duplicateIds.*').isUUID(),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
      const card = await CardModel.merge(
        req.params.id,
        req.body.duplicateIds,
        req.user!.restaurantId,
      );
      if (!card) return res.status(404).json({ success: false, error: 'Card not found' });
      res.json({ success: true, data: card, message: 'Cards merged successfully' } satisfies ApiResponse);
    } catch (error: any) {
      if (error?.message === 'Card not found') {
        return res.status(404).json({ success: false, error: error.message });
      }
      console.error('Error merging cards:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },
);

router.delete('/:id', [param('id').isUUID()], async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Invalid card ID' });
  const deleted = await CardModel.delete(req.params.id, req.user!.restaurantId);
  if (!deleted) return res.status(404).json({ success: false, error: 'Card not found' });
  res.json({ success: true, message: 'Card deleted successfully' } satisfies ApiResponse);
});

export default router;
