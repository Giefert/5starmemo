import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { ProgressModel } from '../models/progress';
import { authenticateToken, requireStudent, AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse, ReviewInput } from '../../../shared/types';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requireStudent);

// Get user's study statistics
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await ProgressModel.getStudyStats(req.user!.id);
    
    const response: ApiResponse = {
      success: true,
      data: stats,
      message: 'Study statistics retrieved successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching study stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get recent study sessions
router.get('/sessions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const sessions = await ProgressModel.getRecentSessions(req.user!.id, limit);
    
    const response: ApiResponse = {
      success: true,
      data: sessions,
      message: 'Recent sessions retrieved successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching recent sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Start a study session
router.post('/sessions',
  [
    body('deckId').isUUID().withMessage('Valid deck ID required')
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

      const { deckId } = req.body;
      const session = await ProgressModel.createStudySession(req.user!.id, deckId);

      const response: ApiResponse = {
        success: true,
        data: session,
        message: 'Study session started successfully'
      };
      
      res.status(201).json(response);
    } catch (error) {
      console.error('Error starting study session:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// End a study session
router.put('/sessions/:id/end',
  [
    param('id').isUUID(),
    body('cardsStudied').isInt({ min: 0 }),
    body('correctAnswers').isInt({ min: 0 }),
    body('averageRating').isFloat({ min: 1, max: 4 })
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

      const { cardsStudied, correctAnswers, averageRating } = req.body;
      const session = await ProgressModel.endStudySession(req.params.id, {
        cardsStudied,
        correctAnswers,
        averageRating
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Study session not found'
        });
      }

      const response: ApiResponse = {
        success: true,
        data: session,
        message: 'Study session ended successfully'
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error ending study session:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// Submit a card review
router.post('/review',
  [
    body('cardId').isUUID().withMessage('Valid card ID required'),
    body('rating').isInt({ min: 1, max: 4 }).withMessage('Rating must be 1-4'),
    body('sessionId').optional().isUUID()
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

      const reviewInput: ReviewInput = {
        cardId: req.body.cardId,
        rating: req.body.rating
      };

      const fsrsCard = await ProgressModel.submitReview(
        req.user!.id,
        reviewInput,
        req.body.sessionId
      );

      const response: ApiResponse = {
        success: true,
        data: {
          fsrsCard,
          nextReview: fsrsCard.nextReview
        },
        message: 'Review submitted successfully'
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error submitting review:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

export default router;