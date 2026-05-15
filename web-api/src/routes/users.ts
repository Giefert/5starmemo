import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { UserModel } from '../models/user';
import { StudentRoleModel } from '../models/studentRole';
import { UserDeckAccessModel } from '../models/userDeckAccess';
import { authenticateToken, requireManagement, AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse, UserDetail } from '../../../shared/types';

const router = Router();

router.use(authenticateToken);
router.use(requireManagement);

// List students in the caller's restaurant.
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const students = await UserModel.findAllStudents(req.user!.restaurantId);
    const response: ApiResponse = { success: true, data: students };
    res.json(response);
  } catch (error) {
    console.error('Error listing students:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get a single student with roles + deck grants.
router.get('/:id',
  [param('id').isUUID()],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Invalid user ID' });
      }

      const restaurantId = req.user!.restaurantId;
      const user = await UserModel.findByIdScoped(req.params.id, restaurantId);
      if (!user || user.role !== 'student') {
        return res.status(404).json({ success: false, error: 'Student not found' });
      }

      const access = await UserDeckAccessModel.getUserAccessDetail(user.id, restaurantId);
      const detail: UserDetail = {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        roles: access?.roles ?? [],
        directDecks: access?.directDecks ?? [],
        roleDecks: access?.roleDecks ?? [],
      };
      res.json({ success: true, data: detail });
    } catch (error) {
      console.error('Error fetching student:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// Update identity (email/username).
router.put('/:id',
  [
    param('id').isUUID(),
    body('email').optional().isEmail().normalizeEmail(),
    body('username').optional().isLength({ min: 3, max: 30 }).trim(),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
      }

      const restaurantId = req.user!.restaurantId;
      const existing = await UserModel.findByIdScoped(req.params.id, restaurantId);
      if (!existing || existing.role !== 'student') {
        return res.status(404).json({ success: false, error: 'Student not found' });
      }

      // Guard against email collisions across the global users.email unique index.
      if (req.body.email && req.body.email !== existing.email) {
        const other = await UserModel.findByEmail(req.body.email);
        if (other && other.id !== existing.id) {
          return res.status(409).json({ success: false, error: 'Email already in use' });
        }
      }

      const updated = await UserModel.update(
        existing.id,
        { email: req.body.email, username: req.body.username },
        restaurantId
      );
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Error updating student:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// Admin password reset.
router.put('/:id/password',
  [
    param('id').isUUID(),
    body('password').isLength({ min: 8 }),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
      }

      const restaurantId = req.user!.restaurantId;
      const existing = await UserModel.findByIdScoped(req.params.id, restaurantId);
      if (!existing || existing.role !== 'student') {
        return res.status(404).json({ success: false, error: 'Student not found' });
      }

      await UserModel.setPassword(existing.id, req.body.password, restaurantId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error resetting password:', error);
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
        return res.status(400).json({ success: false, error: 'Invalid user ID' });
      }

      const restaurantId = req.user!.restaurantId;
      const existing = await UserModel.findByIdScoped(req.params.id, restaurantId);
      if (!existing || existing.role !== 'student') {
        return res.status(404).json({ success: false, error: 'Student not found' });
      }

      await UserModel.delete(existing.id, restaurantId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting student:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// Replace-all role assignments.
router.put('/:id/roles',
  [
    param('id').isUUID(),
    body('roleIds').isArray(),
    body('roleIds.*').isUUID(),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
      }

      const restaurantId = req.user!.restaurantId;
      const existing = await UserModel.findByIdScoped(req.params.id, restaurantId);
      if (!existing || existing.role !== 'student') {
        return res.status(404).json({ success: false, error: 'Student not found' });
      }

      await StudentRoleModel.setUserRoles(existing.id, req.body.roleIds, restaurantId);
      const access = await UserDeckAccessModel.getUserAccessDetail(existing.id, restaurantId);
      res.json({ success: true, data: { roles: access?.roles ?? [] } });
    } catch (error) {
      console.error('Error setting user roles:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// Replace-all direct deck grants.
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

      const restaurantId = req.user!.restaurantId;
      const existing = await UserModel.findByIdScoped(req.params.id, restaurantId);
      if (!existing || existing.role !== 'student') {
        return res.status(404).json({ success: false, error: 'Student not found' });
      }

      await UserDeckAccessModel.setUserDecks(existing.id, req.body.deckIds, restaurantId);
      const access = await UserDeckAccessModel.getUserAccessDetail(existing.id, restaurantId);
      res.json({ success: true, data: { directDecks: access?.directDecks ?? [] } });
    } catch (error) {
      console.error('Error setting user decks:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

export default router;
