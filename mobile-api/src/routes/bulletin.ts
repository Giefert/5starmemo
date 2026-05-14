import { Router, Response } from 'express';
import { param, validationResult } from 'express-validator';
import { BulletinModel } from '../models/bulletin';
import { authenticateToken, requireStudent, AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse, CurationKind, CurationStudyPayload } from '../../../shared/types';

const router = Router();

router.use(authenticateToken);
router.use(requireStudent);

const CURATION_KINDS: CurationKind[] = ['specials', 'new_item', 'featured', 'in_season'];

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payload = await BulletinModel.getForRestaurant(req.user!.restaurantId);
    if (!payload) {
      return res.status(404).json({ success: false, error: 'Restaurant not found' });
    }
    const response: ApiResponse = { success: true, data: payload };
    res.json(response);
  } catch (error) {
    console.error('Error fetching bulletin:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get(
  '/:kind/study',
  [param('kind').isIn(CURATION_KINDS)],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Invalid curation kind' });
    }
    try {
      const kind = req.params.kind as CurationKind;
      const units = await BulletinModel.getStudyUnits(
        req.user!.restaurantId,
        req.user!.id,
        kind,
      );
      const payload: CurationStudyPayload = { kind, units };
      const response: ApiResponse = { success: true, data: payload };
      res.json(response);
    } catch (error) {
      console.error('Error fetching curation study units:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },
);

export default router;
