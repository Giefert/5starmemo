import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { UserModel } from '../models/user';
import { comparePassword, generateToken } from '../utils/auth';
import { LoginInput, ApiResponse, AuthResponse } from '../../../shared/types';

const router = Router();

// Student login
router.post('/login',
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
      console.error('Student login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// Get current user profile
router.get('/profile',
  async (req: Request, res: Response) => {
    // This endpoint would be used with authentication middleware
    // For now, just return a simple response
    res.json({
      success: true,
      message: 'Profile endpoint - requires authentication'
    });
  }
);

export default router;