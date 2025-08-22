import { Router, Response } from 'express';
import { param, validationResult } from 'express-validator';
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
    const decks = await DeckModel.getAvailableDecks(req.user!.id);
    
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

// Get specific deck for studying
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

      // Check if deck is available
      const isAvailable = await DeckModel.isDeckAvailable(req.params.id);
      if (!isAvailable) {
        return res.status(404).json({
          success: false,
          error: 'Deck not found or not available'
        });
      }

      const studyData = await DeckModel.getDeckForStudy(req.params.id, req.user!.id);

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
    const cards = await DeckModel.getCardsForReview(req.user!.id, limit);

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