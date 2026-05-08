import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { CurationModel } from '../models/curation';
import { authenticateToken, requireManagement, AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse, CurationKind, CurationTargetType } from '../../../shared/types';

const router = Router();
router.use(authenticateToken);
router.use(requireManagement);

const KINDS: CurationKind[] = ['specials', 'new_item', 'featured', 'in_season'];
const TARGET_TYPES: CurationTargetType[] = ['card', 'deck'];

router.get('/:kind',
  [param('kind').isIn(KINDS)],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Invalid kind' });
      }
      const items = await CurationModel.list(
        req.params.kind as CurationKind,
        req.user!.restaurantId
      );
      const response: ApiResponse = { success: true, data: items };
      res.json(response);
    } catch (error) {
      console.error('Error listing curations:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

router.post('/:kind',
  [
    param('kind').isIn(KINDS),
    body('targetType').isIn(TARGET_TYPES),
    body('targetId').isUUID()
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
      const kind = req.params.kind as CurationKind;
      const { targetType, targetId } = req.body as {
        targetType: CurationTargetType;
        targetId: string;
      };

      const ok = await CurationModel.targetBelongsToRestaurant(
        targetType,
        targetId,
        req.user!.restaurantId
      );
      if (!ok) {
        return res.status(404).json({ success: false, error: 'Target not found' });
      }

      await CurationModel.add(kind, targetType, targetId, req.user!.restaurantId);
      const items = await CurationModel.list(kind, req.user!.restaurantId);
      const response: ApiResponse = { success: true, data: items };
      res.status(201).json(response);
    } catch (error) {
      console.error('Error adding curation:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

router.delete('/:kind/:targetType/:targetId',
  [
    param('kind').isIn(KINDS),
    param('targetType').isIn(TARGET_TYPES),
    param('targetId').isUUID()
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Invalid request' });
      }
      await CurationModel.remove(
        req.params.kind as CurationKind,
        req.params.targetType as CurationTargetType,
        req.params.targetId,
        req.user!.restaurantId
      );
      res.status(204).end();
    } catch (error) {
      console.error('Error removing curation:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

export default router;
