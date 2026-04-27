import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { UserModel } from '../models/user';
import { comparePassword, generateToken } from '../utils/auth';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import pool from '../config/database';
import { LoginInput, ApiResponse, AuthResponse } from '../../../shared/types';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many login attempts, try again in a minute.' }
});

// Student login
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

// Export all user data — Loi 25 data portability
router.get('/export', authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      const [user, fsrsCards, sessions, reviews] = await Promise.all([
        pool.query('SELECT id, email, role, created_at FROM users WHERE id = $1', [userId]),
        pool.query('SELECT card_id, difficulty, stability, retrievability, grade, lapses, reps, state, last_review, next_review, created_at FROM fsrs_cards WHERE user_id = $1', [userId]),
        pool.query('SELECT id, deck_id, cards_studied, correct_answers, average_rating, started_at, ended_at, created_at FROM study_sessions WHERE user_id = $1 ORDER BY created_at DESC', [userId]),
        pool.query('SELECT cr.card_id, cr.rating, cr.response_time_ms, cr.created_at FROM card_reviews cr JOIN study_sessions ss ON cr.session_id = ss.id WHERE ss.user_id = $1 ORDER BY cr.created_at DESC', [userId]),
      ]);

      res.json({
        success: true,
        data: {
          exportedAt: new Date().toISOString(),
          account: user.rows[0] || null,
          studyProgress: fsrsCards.rows,
          studySessions: sessions.rows,
          cardReviews: reviews.rows,
        },
      });
    } catch (error) {
      console.error('Data export error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// Delete account — Apple App Store requirement
router.delete('/account', authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      // ON DELETE CASCADE handles fsrs_cards, study_sessions, card_reviews
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      res.json({ success: true, message: 'Account deleted' });
    } catch (error) {
      console.error('Account deletion error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

export default router;