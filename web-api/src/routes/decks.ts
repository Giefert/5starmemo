import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { DeckModel } from '../models/deck';
import { CardModel } from '../models/card';
import { authenticateToken, requireManagement, AuthenticatedRequest } from '../middleware/auth';
import { CreateDeckInput, UpdateDeckInput, CreateCardInput, ApiResponse } from '../../../shared/types';

const router = Router();

// Apply authentication and management requirement to all routes
router.use(authenticateToken);
router.use(requireManagement);

// Get all decks for management user
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const decks = await DeckModel.findAll(req.user!.id);
    
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

      const deck = await DeckModel.findById(req.params.id, true);
      
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
    body('isPublic').optional().isBoolean(),
    body('isFeatured').optional().isBoolean()
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
      const deck = await DeckModel.create(deckData, req.user!.id);

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
    body('isPublic').optional().isBoolean(),
    body('isFeatured').optional().isBoolean()
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
      const deck = await DeckModel.update(req.params.id, deckData, req.user!.id);

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

      const deleted = await DeckModel.delete(req.params.id, req.user!.id);

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

// Add card to deck
router.post('/:id/cards',
  [
    param('id').isUUID(),
    body('order').optional().isInt({ min: 0 }),
    body('restaurantData').optional().isObject(),
    body('restaurantData.itemName').optional().trim().isLength({ min: 1 }),
    body('restaurantData.category').optional().isIn(['wine', 'beer', 'cocktail', 'spirit', 'maki', 'sake', 'sauce'])
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

      // Verify deck exists
      const deck = await DeckModel.findById(req.params.id);
      if (!deck) {
        return res.status(404).json({
          success: false,
          error: 'Deck not found'
        });
      }

      const cardData: CreateCardInput = req.body;
      const card = await CardModel.create(req.params.id, cardData);

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
    body('restaurantData.category').optional().isIn(['wine', 'beer', 'cocktail', 'spirit', 'maki', 'sake', 'sauce'])
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

      // Verify card exists and user owns the deck
      const existingCard = await CardModel.findById(req.params.cardId);
      if (!existingCard) {
        return res.status(404).json({
          success: false,
          error: 'Card not found'
        });
      }

      const deck = await DeckModel.findById(existingCard.deckId);
      if (!deck) {
        return res.status(404).json({
          success: false,
          error: 'Deck not found'
        });
      }

      const card = await CardModel.update(req.params.cardId, req.body);

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

// Delete card
router.delete('/cards/:cardId',
  [param('cardId').isUUID()],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid card ID',
          details: errors.array()
        });
      }

      // Verify card exists and user owns the deck
      const existingCard = await CardModel.findById(req.params.cardId);
      if (!existingCard) {
        return res.status(404).json({
          success: false,
          error: 'Card not found'
        });
      }

      const deck = await DeckModel.findById(existingCard.deckId);
      if (!deck) {
        return res.status(404).json({
          success: false,
          error: 'Deck not found'
        });
      }

      const deleted = await CardModel.delete(req.params.cardId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Card not found'
        });
      }

      const response: ApiResponse = {
        success: true,
        message: 'Card deleted successfully'
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error deleting card:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

export default router;