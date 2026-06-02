import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { DeckModel } from '../models/deck';
import { authenticateToken, requireStudent, AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../../../shared/types';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requireStudent);

// Get available decks for studying
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const decks = await DeckModel.getAvailableDecks(req.user!.id, req.user!.restaurantId);

    const response: ApiResponse = {
      success: true,
      data: decks,
      message: 'Available decks retrieved successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching available decks:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Search individual accessible cards for local custom deck creation.
router.get('/cards/search',
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
          error: 'Invalid request',
          details: errors.array()
        });
      }

      const limit = parseInt(req.query.limit as string) || 30;
      const cards = await DeckModel.searchAvailableCards(
        req.user!.id,
        req.user!.restaurantId,
        req.query.q as string,
        limit
      );

      const response: ApiResponse = {
        success: true,
        data: { cards },
        message: 'Card search completed successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Error searching cards:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// Hydrate selected accessible cards for local custom deck study.
router.post('/cards/batch',
  [
    body('cardIds').isArray({ min: 1, max: 200 }),
    body('cardIds.*').isUUID()
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: errors.array()
        });
      }

      const cards = await DeckModel.getAvailableCardsByIds(
        req.user!.id,
        req.user!.restaurantId,
        req.body.cardIds
      );

      const response: ApiResponse = {
        success: true,
        data: { cards },
        message: 'Cards retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching cards by ids:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// Search available decks by deck title or card information
router.get('/search',
  [
    query('q').trim().isLength({ min: 1, max: 200 })
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: errors.array()
        });
      }

      const deckIds = await DeckModel.searchAvailableDeckIds(
        req.user!.id,
        req.user!.restaurantId,
        req.query.q as string
      );

      const response: ApiResponse = {
        success: true,
        data: { deckIds },
        message: 'Deck search completed successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Error searching decks:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// Get specific deck for studying
router.get('/:id',
  [
    param('id').isUUID(),
    query('mode').optional().isIn(['recommended', 'full'])
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: errors.array()
        });
      }

      // Check if the student has been granted access to this deck.
      const isAvailable = await DeckModel.isDeckAvailable(
        req.params.id,
        req.user!.id,
        req.user!.restaurantId
      );
      if (!isAvailable) {
        return res.status(404).json({
          success: false,
          error: 'Deck not found or not available'
        });
      }

      const mode = (req.query.mode as 'recommended' | 'full' | undefined) ?? 'full';
      const studyData = await DeckModel.getDeckForStudy(req.params.id, req.user!.id, req.user!.restaurantId, mode);

      const response: ApiResponse = {
        success: true,
        data: {
          deckId: req.params.id,
          cards: studyData
        },
        message: 'Deck study data retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching deck for study:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// Get cards due for review across all decks
router.get('/review/due', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const cards = await DeckModel.getCardsForReview(req.user!.id, req.user!.restaurantId, limit);

    const response: ApiResponse = {
      success: true,
      data: {
        cards,
        count: cards.length
      },
      message: 'Due cards retrieved successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching due cards:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
