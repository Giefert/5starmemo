import { Router, Response } from 'express';
import { param, query, validationResult } from 'express-validator';
import { GlossaryModel } from '../models/glossary';
import { authenticateToken, requireStudent, AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../../../shared/types';

const router = Router();

// Apply authentication and student requirement
router.use(authenticateToken);
router.use(requireStudent);

// Get all categories
router.get('/categories',
  [
    query('section').optional().isIn(['glossary', 'encyclopedia'])
  ],
  async (req: AuthenticatedRequest, res: Response) => {
  try {
    const section = req.query.section as string | undefined;
    const categories = await GlossaryModel.getCategories(section);
    const response: ApiResponse = {
      success: true,
      data: categories,
      message: 'Categories retrieved successfully'
    };
    res.json(response);
  } catch (error) {
    console.error('Error fetching glossary categories:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get terms with filtering
router.get('/terms',
  [
    query('categoryId').optional().isUUID(),
    query('section').optional().isIn(['glossary', 'encyclopedia']),
    query('search').optional().trim().isLength({ max: 200 }),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
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

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await GlossaryModel.getTerms({
        categoryId: req.query.categoryId as string,
        section: req.query.section as string,
        search: req.query.search as string,
        page,
        limit
      });

      res.json({
        success: true,
        data: result.terms,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        },
        message: 'Terms retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching glossary terms:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// Get single term with linked cards
router.get('/terms/:id',
  [param('id').isUUID()],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid term ID',
          details: errors.array()
        });
      }

      const term = await GlossaryModel.getTermById(req.params.id);
      if (!term) {
        return res.status(404).json({ success: false, error: 'Term not found' });
      }

      const response: ApiResponse = {
        success: true,
        data: term,
        message: 'Term retrieved successfully'
      };
      res.json(response);
    } catch (error) {
      console.error('Error fetching glossary term:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

export default router;
