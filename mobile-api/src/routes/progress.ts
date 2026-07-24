import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { ProgressModel } from '../models/progress';
import { DeckModel } from '../models/deck';
import { BulletinModel } from '../models/bulletin';
import { authenticateToken, requireStudent, AuthenticatedRequest } from '../middleware/auth';
import {
  ApiResponse,
  CurationKind,
  CurationStudyUnit,
  ReviewInput,
  StudyCardData,
  StudySession,
} from '../../../shared/types';

const CURATION_KINDS: CurationKind[] = [
  'specials',
  'new_item',
  'featured',
  'in_season',
  'recently_modified',
];

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requireStudent);

// Get user's study statistics
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await ProgressModel.getStudyStats(req.user!.id, req.user!.restaurantId);

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
    const sessions = await ProgressModel.getRecentSessions(req.user!.id, req.user!.restaurantId, limit);

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

type SessionStartData = {
  session: StudySession;
  study: {
    kind: 'deck';
    deckId: string;
    cards: StudyCardData[];
  };
} | {
  session: StudySession;
  study: {
    kind: 'curation';
    curationKind: CurationKind;
    units: CurationStudyUnit[];
  };
};

async function createSessionWithStudyData<T>(
  userId: string,
  target:
    | { deckId: string; curationKind?: undefined }
    | { deckId?: undefined; curationKind: CurationKind },
  studyDataPromise: Promise<T>,
): Promise<[StudySession, T]> {
  const sessionPromise = ProgressModel.createStudySession(userId, target);

  try {
    return await Promise.all([sessionPromise, studyDataPromise]);
  } catch (error) {
    // Both operations start together for latency. If only the queue load
    // fails, compensate for the already-committed insert so retries do not
    // leave invisible empty sessions behind.
    const session = await sessionPromise.catch(() => null);
    if (session) {
      try {
        await ProgressModel.discardEmptyStudySession(session.id, userId);
      } catch (cleanupError) {
        console.error('Error discarding incomplete study session:', cleanupError);
      }
    }
    throw error;
  }
}

// Start a graded session and return its study queue in one request. This is
// intentionally separate from POST /sessions so older clients keep working.
// Full-deck and custom sessions remain local/sessionless and do not use this
// endpoint.
router.post('/sessions/start',
  [
    body('deckId').optional().isUUID().withMessage('deckId must be a UUID'),
    body('curationKind').optional().isIn(CURATION_KINDS).withMessage('Invalid curationKind'),
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

      const { deckId, curationKind } = req.body as { deckId?: string; curationKind?: CurationKind };
      if ((!deckId && !curationKind) || (deckId && curationKind)) {
        return res.status(400).json({
          success: false,
          error: 'Provide exactly one of deckId or curationKind'
        });
      }

      let data: SessionStartData;
      if (deckId) {
        // This is the only deck-availability check in the combined flow.
        // getDeckForStudy scopes the card query to the restaurant but does not
        // repeat the student's direct/role-grant lookup.
        const isAvailable = await DeckModel.isDeckAvailable(
          deckId,
          req.user!.id,
          req.user!.restaurantId,
        );
        if (!isAvailable) {
          return res.status(404).json({
            success: false,
            error: 'Deck not found or not available'
          });
        }

        const [session, cards] = await createSessionWithStudyData(
          req.user!.id,
          { deckId },
          DeckModel.getDeckForStudy(
            deckId,
            req.user!.id,
            req.user!.restaurantId,
            'recommended',
          ),
        );
        data = {
          session,
          study: {
            kind: 'deck',
            deckId,
            cards,
          },
        };
      } else {
        const [session, units] = await createSessionWithStudyData(
          req.user!.id,
          { curationKind: curationKind! },
          BulletinModel.getStudyUnits(
            req.user!.restaurantId,
            req.user!.id,
            curationKind!,
          ),
        );
        data = {
          session,
          study: {
            kind: 'curation',
            curationKind: curationKind!,
            units,
          },
        };
      }

      const response: ApiResponse<SessionStartData> = {
        success: true,
        data,
        message: 'Study session started successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error starting study session with study data:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// Start a study session. Accepts either a deckId (deck-tab study) or a
// curationKind (bulletin "study this section"). Exactly one must be set.
router.post('/sessions',
  [
    body('deckId').optional().isUUID().withMessage('deckId must be a UUID'),
    body('curationKind').optional().isIn(CURATION_KINDS).withMessage('Invalid curationKind'),
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

      const { deckId, curationKind } = req.body as { deckId?: string; curationKind?: CurationKind };
      if ((!deckId && !curationKind) || (deckId && curationKind)) {
        return res.status(400).json({
          success: false,
          error: 'Provide exactly one of deckId or curationKind'
        });
      }

      let session;
      if (deckId) {
        const isAvailable = await DeckModel.isDeckAvailable(deckId, req.user!.id, req.user!.restaurantId);
        if (!isAvailable) {
          return res.status(404).json({
            success: false,
            error: 'Deck not found or not available'
          });
        }
        session = await ProgressModel.createStudySession(req.user!.id, { deckId });
      } else {
        session = await ProgressModel.createStudySession(req.user!.id, { curationKind: curationKind! });
      }

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
      const session = await ProgressModel.endStudySession(
        req.params.id,
        req.user!.id,
        {
          cardsStudied,
          correctAnswers,
          averageRating
        },
      );

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

// Reset FSRS progress. Body: { deckIds?: string[] }. Omitting deckIds (or
// passing an empty array) resets all decks in the student's restaurant.
router.delete('/fsrs',
  [
    body('deckIds').optional().isArray().withMessage('deckIds must be an array'),
    body('deckIds.*').optional().isUUID().withMessage('deckIds must contain UUIDs'),
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

      const deckIds = req.body.deckIds as string[] | undefined;
      const resetCount = await ProgressModel.resetFsrs(
        req.user!.id,
        req.user!.restaurantId,
        deckIds,
      );

      const response: ApiResponse = {
        success: true,
        data: { resetCount },
        message: 'FSRS progress reset successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Error resetting FSRS progress:', error);
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
    body('sessionId').optional().isUUID(),
    body('finalStats').optional().isObject(),
    body('finalStats.cardsStudied').optional().isInt({ min: 0 }),
    body('finalStats.correctAnswers').optional().isInt({ min: 0 }),
    body('finalStats.averageRating').optional().isFloat({ min: 1, max: 4 }),
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
      const finalStats = req.body.finalStats as {
        cardsStudied?: number;
        correctAnswers?: number;
        averageRating?: number;
      } | undefined;
      if (
        finalStats &&
        (
          !req.body.sessionId
          || !Number.isInteger(finalStats.cardsStudied)
          || !Number.isInteger(finalStats.correctAnswers)
          || typeof finalStats.averageRating !== 'number'
          || finalStats.correctAnswers! > finalStats.cardsStudied!
        )
      ) {
        return res.status(400).json({
          success: false,
          error: 'Complete finalStats and sessionId are required together'
        });
      }

      // Don't allow reviewing cards from other restaurants
      const cardOk = await ProgressModel.cardInRestaurant(reviewInput.cardId, req.user!.restaurantId);
      if (!cardOk) {
        return res.status(404).json({
          success: false,
          error: 'Card not found'
        });
      }

      const result = await ProgressModel.submitReview(
        req.user!.id,
        reviewInput,
        req.body.sessionId,
        finalStats as {
          cardsStudied: number;
          correctAnswers: number;
          averageRating: number;
        } | undefined,
      );

      const response: ApiResponse = {
        success: true,
        data: {
          fsrsCard: result.fsrsCard,
          nextReview: result.fsrsCard.nextReview,
          session: result.session,
        },
        message: 'Review submitted successfully'
      };

      res.json(response);
    } catch (error) {
      if (error instanceof Error && error.name === 'StudySessionNotFoundError') {
        return res.status(404).json({
          success: false,
          error: 'Study session not found'
        });
      }
      console.error('Error submitting review:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

export default router;
