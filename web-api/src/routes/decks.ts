import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { DeckModel } from '../models/deck';
import { CardModel } from '../models/card';
import { UserDeckAccessModel } from '../models/userDeckAccess';
import { authenticateToken, requireManagement, AuthenticatedRequest } from '../middleware/auth';
import { CreateDeckInput, UpdateDeckInput, CreateCardInput, ApiResponse, RestaurantCategory } from '../../../shared/types';

const VALID_CATEGORIES: RestaurantCategory[] = ['wine', 'beer', 'cocktail', 'spirit', 'maki', 'sake', 'sauce', 'fish', 'dietary', 'starters', 'sashimi'];

const router = Router();

// Apply authentication and management requirement to all routes
router.use(authenticateToken);
router.use(requireManagement);

// Get all decks for the caller's restaurant
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const decks = await DeckModel.findAll(req.user!.restaurantId);

    const response: ApiResponse = {
      success: true,
      data: decks,
      message: 'Decks retrieved successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching decks:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get specific deck with cards
router.get('/:id',
  [param('id').isUUID()],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid deck ID',
          details: errors.array()
        });
      }

      const deck = await DeckModel.findById(req.params.id, req.user!.restaurantId, true);

      if (!deck) {
        return res.status(404).json({
          success: false,
          error: 'Deck not found'
        });
      }


      const response: ApiResponse = {
        success: true,
        data: deck,
        message: 'Deck retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching deck:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// Create new deck
router.post('/',
  [
    body('title').trim().isLength({ min: 1, max: 200 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('categoryId').optional().isUUID(),
    body('deckType').isIn(['food', 'bar', 'other'])
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

      const deckData: CreateDeckInput = req.body;
      const deck = await DeckModel.create(deckData, req.user!.id, req.user!.restaurantId);

      const response: ApiResponse = {
        success: true,
        data: deck,
        message: 'Deck created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating deck:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// Update deck
router.put('/:id',
  [
    param('id').isUUID(),
    body('title').optional().trim().isLength({ min: 1, max: 200 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('categoryId').optional().isUUID(),
    body('deckType').optional().isIn(['food', 'bar', 'other'])
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

      const deckData: UpdateDeckInput = req.body;
      const deck = await DeckModel.update(req.params.id, deckData, req.user!.restaurantId);

      if (!deck) {
        return res.status(404).json({
          success: false,
          error: 'Deck not found'
        });
      }

      const response: ApiResponse = {
        success: true,
        data: deck,
        message: 'Deck updated successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Error updating deck:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// Delete deck
router.delete('/:id',
  [param('id').isUUID()],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid deck ID',
          details: errors.array()
        });
      }

      const deleted = await DeckModel.delete(req.params.id, req.user!.restaurantId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Deck not found'
        });
      }

      const response: ApiResponse = {
        success: true,
        message: 'Deck deleted successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Error deleting deck:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// Get the access list for a deck: which roles and which individual students
// can see this deck. Used by the dashboard's deck-page Access editor.
router.get('/:id/access',
  [param('id').isUUID()],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Invalid deck ID' });
      }
      const access = await UserDeckAccessModel.getDeckAccess(req.params.id, req.user!.restaurantId);
      if (!access) {
        return res.status(404).json({ success: false, error: 'Deck not found' });
      }
      res.json({ success: true, data: access });
    } catch (error) {
      console.error('Error fetching deck access:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// Replace-all the roles+users who can see this deck (deck-centric editor).
router.put('/:id/access',
  [
    param('id').isUUID(),
    body('roleIds').isArray(),
    body('roleIds.*').isUUID(),
    body('userIds').isArray(),
    body('userIds.*').isUUID(),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
      }
      try {
        await UserDeckAccessModel.setDeckAccess(
          req.params.id,
          { roleIds: req.body.roleIds, userIds: req.body.userIds },
          req.user!.restaurantId
        );
      } catch (err: any) {
        if (err?.message === 'Deck not found') {
          return res.status(404).json({ success: false, error: 'Deck not found' });
        }
        throw err;
      }
      const access = await UserDeckAccessModel.getDeckAccess(req.params.id, req.user!.restaurantId);
      res.json({ success: true, data: access });
    } catch (error) {
      console.error('Error updating deck access:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// Add card to deck
router.post('/:id/cards',
  [
    param('id').isUUID(),
    body('order').optional().isInt({ min: 0 }),
    body('restaurantData').optional().isObject(),
    body('restaurantData.itemName').optional().trim().isLength({ min: 1 }),
    body('restaurantData.category').optional().isIn(VALID_CATEGORIES),
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

      // Verify deck belongs to caller's restaurant
      const deck = await DeckModel.findById(req.params.id, req.user!.restaurantId);
      if (!deck) {
        return res.status(404).json({
          success: false,
          error: 'Deck not found'
        });
      }

      const cardData: CreateCardInput = { ...req.body, deckIds: [req.params.id] };
      const card = await CardModel.create(req.user!.restaurantId, cardData);

      const response: ApiResponse = {
        success: true,
        data: card,
        message: 'Card added successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error adding card:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// Update card
router.put('/cards/:cardId',
  [
    param('cardId').isUUID(),
    body('order').optional().isInt({ min: 0 }),
    body('restaurantData').optional().isObject(),
    body('restaurantData.itemName').optional().trim().isLength({ min: 1 }),
    body('restaurantData.category').optional().isIn(VALID_CATEGORIES),
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

      const existingCard = await CardModel.findById(req.params.cardId, req.user!.restaurantId);
      if (!existingCard) {
        return res.status(404).json({
          success: false,
          error: 'Card not found'
        });
      }

      const card = await CardModel.update(req.params.cardId, req.user!.restaurantId, req.body);

      const response: ApiResponse = {
        success: true,
        data: card,
        message: 'Card updated successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Error updating card:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// Add an existing canonical card to a deck.
router.post('/:id/cards/:cardId',
  [param('id').isUUID(), param('cardId').isUUID()],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Invalid request' });
    const added = await CardModel.addToDeck(req.params.cardId, req.params.id, req.user!.restaurantId);
    if (!added) {
      const card = await CardModel.findById(req.params.cardId, req.user!.restaurantId);
      const deck = await DeckModel.findById(req.params.id, req.user!.restaurantId);
      if (!card || !deck) return res.status(404).json({ success: false, error: 'Card or deck not found' });
    }
    const card = await CardModel.findById(req.params.cardId, req.user!.restaurantId);
    res.status(added ? 201 : 200).json({ success: true, data: card, message: added ? 'Card added to deck' : 'Card already in deck' });
  },
);

// Remove only the membership; the canonical card and its progress survive.
router.delete('/:id/cards/:cardId',
  [param('id').isUUID(), param('cardId').isUUID()],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Invalid request' });
    const removed = await CardModel.removeFromDeck(req.params.cardId, req.params.id, req.user!.restaurantId);
    if (!removed) return res.status(404).json({ success: false, error: 'Card membership not found' });
    res.json({ success: true, message: 'Card removed from deck' });
  },
);

export default router;
