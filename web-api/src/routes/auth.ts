import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { UserModel } from '../models/user';
import { comparePassword, generateToken } from '../utils/auth';
import { authenticateToken, requireManagement, AuthenticatedRequest } from '../middleware/auth';
import { LoginInput, CreateUserInput, ApiResponse, AuthResponse, User } from '../../../shared/types';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many login attempts, try again in a minute.' }
});

// Login
router.post('/login', authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email, password }: LoginInput = req.body;

      const userWithPassword = await UserModel.findByEmail(email);
      if (!userWithPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      const isValidPassword = await comparePassword(password, userWithPassword.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Only allow management users to login to web API
      if (userWithPassword.role !== 'management') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Management access required.'
        });
      }

      const { password_hash, ...user } = userWithPassword;
      const token = generateToken(user);

      const response: ApiResponse<AuthResponse> = {
        success: true,
        data: {
          user,
          token
        },
        message: 'Login successful'
      };

      res.json(response);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// Create a new user (student or admin) inside the caller's restaurant.
// This is the only registration path: there is no public sign-up. New
// restaurants are bootstrapped via the create-restaurant CLI script.
router.post('/users', authenticateToken, requireManagement,
  [
    body('email').isEmail().normalizeEmail(),
    body('username').isLength({ min: 3, max: 30 }).trim(),
    body('password').isLength({ min: 8 }),
    body('role').isIn(['student', 'management']),
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

      const userData: CreateUserInput = req.body;

      const existingUser = await UserModel.findByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'User with this email already exists'
        });
      }

      const user: User = await UserModel.create(userData, req.user!.restaurantId);

      const response: ApiResponse<User> = {
        success: true,
        data: user,
        message: 'User created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('User creation error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

export default router;
