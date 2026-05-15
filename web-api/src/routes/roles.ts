import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { StudentRoleModel } from '../models/studentRole';
import { authenticateToken, requireManagement, AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../../../shared/types';

const router = Router();

router.use(authenticateToken);
router.use(requireManagement);

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const roles = await StudentRoleModel.findAll(req.user!.restaurantId);
    const response: ApiResponse = { success: true, data: roles };
    res.json(response);
  } catch (error) {
    console.error('Error listing roles:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/:id',
  [param('id').isUUID()],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Invalid role ID' });
      }

      const role = await StudentRoleModel.findById(req.params.id, req.user!.restaurantId);
      if (!role) {
        return res.status(404).json({ success: false, error: 'Role not found' });
      }
      res.json({ success: true, data: role });
    } catch (error) {
      console.error('Error fetching role:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

router.post('/',
  [
    body('name').trim().isLength({ min: 1, max: 100 }),
    body('description').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
      }

      const role = await StudentRoleModel.create(
        { name: req.body.name, description: req.body.description },
        req.user!.restaurantId
      );
      res.status(201).json({ success: true, data: role });
    } catch (error: any) {
      // Unique violation on (restaurant_id, name).
      if (error?.code === '23505') {
        return res.status(409).json({ success: false, error: 'A role with that name already exists' });
      }
      console.error('Error creating role:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

router.put('/:id',
  [
    param('id').isUUID(),
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('description').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
      }

      const role = await StudentRoleModel.update(
        req.params.id,
        { name: req.body.name, description: req.body.description },
        req.user!.restaurantId
      );
      if (!role) {
        return res.status(404).json({ success: false, error: 'Role not found' });
      }
      res.json({ success: true, data: role });
    } catch (error: any) {
      if (error?.code === '23505') {
        return res.status(409).json({ success: false, error: 'A role with that name already exists' });
      }
      console.error('Error updating role:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

router.delete('/:id',
  [param('id').isUUID()],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Invalid role ID' });
      }

      const deleted = await StudentRoleModel.delete(req.params.id, req.user!.restaurantId);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Role not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting role:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

router.put('/:id/decks',
  [
    param('id').isUUID(),
    body('deckIds').isArray(),
    body('deckIds.*').isUUID(),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
      }

      try {
        await StudentRoleModel.setRoleDecks(req.params.id, req.body.deckIds, req.user!.restaurantId);
      } catch (err: any) {
        if (err?.message === 'Role not found') {
          return res.status(404).json({ success: false, error: 'Role not found' });
        }
        throw err;
      }

      const role = await StudentRoleModel.findById(req.params.id, req.user!.restaurantId);
      res.json({ success: true, data: { decks: role?.decks ?? [] } });
    } catch (error) {
      console.error('Error setting role decks:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

export default router;
