import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'student' | 'management';
    restaurantId: string;
  };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

export const requireManagement = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (req.user.role !== 'management') {
    return res.status(403).json({
      success: false,
      error: 'Management access required'
    });
  }

  next();
};