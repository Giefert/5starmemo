import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { RestaurantModel } from '../models/restaurant';
import { authenticateToken, requireManagement, AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../../../shared/types';

const router = Router();
router.use(authenticateToken);
router.use(requireManagement);

router.get('/me', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restaurant = await RestaurantModel.findById(req.user!.restaurantId);
    if (!restaurant) {
      return res.status(404).json({ success: false, error: 'Restaurant not found' });
    }
    const response: ApiResponse = { success: true, data: restaurant };
    res.json(response);
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.put('/me/announcements',
  [
    body('announcements').isArray({ max: 20 }),
    body('announcements.*').isString().trim().isLength({ min: 1, max: 500 })
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
      const announcements: string[] = req.body.announcements
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);
      const saved = await RestaurantModel.updateAnnouncements(req.user!.restaurantId, announcements);
      const response: ApiResponse = { success: true, data: { announcements: saved } };
      res.json(response);
    } catch (error) {
      console.error('Error updating announcements:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

export default router;
