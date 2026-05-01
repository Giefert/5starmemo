import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
import pool from '../config/database';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'student' | 'management';
    restaurantId: string;
  };
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  try {
    const decoded = verifyToken(token);

    // Tokens issued before the multi-tenant migration won't have restaurantId.
    // Force a re-login so we never serve a request without a tenant scope.
    if (!decoded.restaurantId) {
      return res.status(401).json({
        success: false,
        error: 'Session expired, please log in again'
      });
    }

    // Validate that the user actually exists in the database
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [decoded.id]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

export const requireStudent = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      error: 'Student access required'
    });
  }

  next();
};