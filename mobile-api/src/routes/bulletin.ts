import { Router, Response } from 'express';
import { BulletinModel } from '../models/bulletin';
import { authenticateToken, requireStudent, AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../../../shared/types';

const router = Router();

router.use(authenticateToken);
router.use(requireStudent);

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

export default router;
