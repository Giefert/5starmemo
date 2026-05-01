import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { GlossaryCategoryModel } from '../models/glossaryCategory';
import { GlossaryTermModel } from '../models/glossaryTerm';
import { authenticateToken, requireManagement, AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../../../shared/types';

const router = Router();

// Apply authentication and management requirement to all routes
router.use(authenticateToken);
router.use(requireManagement);

// ============================================
// CATEGORY ROUTES
// ============================================

// Get all categories
router.get('/categories', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const categories = await GlossaryCategoryModel.findAll(req.user!.restaurantId);
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

// Create category
router.post('/categories',
  [
    body('name').trim().isLength({ min: 1, max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
    body('displayOrder').optional().isInt({ min: 0 })
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
      const category = await GlossaryCategoryModel.create(req.body, req.user!.id, req.user!.restaurantId);
      const response: ApiResponse = {
        success: true,
        data: category,
        message: 'Category created successfully'
      };
      res.status(201).json(response);
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        return res.status(400).json({ success: false, error: 'Category name already exists' });
      }
      console.error('Error creating glossary category:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// Update category
router.put('/categories/:id',
  [
    param('id').isUUID(),
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
    body('displayOrder').optional().isInt({ min: 0 })
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
      const category = await GlossaryCategoryModel.update(req.params.id, req.body, req.user!.restaurantId);
      if (!category) {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }
      const response: ApiResponse = {
        success: true,
        data: category,
        message: 'Category updated successfully'
      };
      res.json(response);
    } catch (error) {
      console.error('Error updating glossary category:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// Delete category
router.delete('/categories/:id',
  [param('id').isUUID()],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid category ID',
          details: errors.array()
        });
      }
      const deleted = await GlossaryCategoryModel.delete(req.params.id, req.user!.restaurantId);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }
      const response: ApiResponse = {
        success: true,
        message: 'Category deleted successfully'
      };
      res.json(response);
    } catch (error) {
      console.error('Error deleting glossary category:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// ============================================
// TERM ROUTES
// ============================================

// Get all terms (with optional category/section filter)
router.get('/terms', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const categoryId = req.query.categoryId as string | undefined;
    const section = req.query.section as string | undefined;
    const terms = await GlossaryTermModel.findAll(req.user!.restaurantId, categoryId, section);
    const response: ApiResponse = {
      success: true,
      data: terms,
      message: 'Terms retrieved successfully'
    };
    res.json(response);
  } catch (error) {
    console.error('Error fetching glossary terms:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

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
      const term = await GlossaryTermModel.findById(req.params.id, req.user!.restaurantId, true);
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

// Create term
router.post('/terms',
  [
    body('term').trim().isLength({ min: 1, max: 200 }),
    body('definition').trim().isLength({ min: 1, max: 5000 }),
    body('section').optional().isIn(['glossary', 'encyclopedia']),
    body('categoryId').optional().isUUID()
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
      const term = await GlossaryTermModel.create(req.body, req.user!.id, req.user!.restaurantId);
      const response: ApiResponse = {
        success: true,
        data: term,
        message: 'Term created successfully'
      };
      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating glossary term:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// Update term
router.put('/terms/:id',
  [
    param('id').isUUID(),
    body('term').optional().trim().isLength({ min: 1, max: 200 }),
    body('definition').optional().trim().isLength({ min: 1, max: 5000 }),
    body('section').optional().isIn(['glossary', 'encyclopedia']),
    body('categoryId').optional()
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
      const term = await GlossaryTermModel.update(req.params.id, req.body, req.user!.restaurantId);
      if (!term) {
        return res.status(404).json({ success: false, error: 'Term not found' });
      }
      const response: ApiResponse = {
        success: true,
        data: term,
        message: 'Term updated successfully'
      };
      res.json(response);
    } catch (error) {
      console.error('Error updating glossary term:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// Delete term
router.delete('/terms/:id',
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
      const deleted = await GlossaryTermModel.delete(req.params.id, req.user!.restaurantId);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Term not found' });
      }
      const response: ApiResponse = {
        success: true,
        message: 'Term deleted successfully'
      };
      res.json(response);
    } catch (error) {
      console.error('Error deleting glossary term:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// ============================================
// CARD LINKING ROUTES
// ============================================

// Get auto-suggestions for a term
router.get('/terms/:id/suggestions',
  [
    param('id').isUUID(),
    query('limit').optional().isInt({ min: 1, max: 50 })
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
      const term = await GlossaryTermModel.findById(req.params.id, req.user!.restaurantId);
      if (!term) {
        return res.status(404).json({ success: false, error: 'Term not found' });
      }
      const limit = parseInt(req.query.limit as string) || 20;
      const suggestions = await GlossaryTermModel.findMatchingCards(term.term, req.user!.restaurantId, limit);

      // Filter out already linked cards
      const linkedCards = await GlossaryTermModel.getLinkedCards(req.params.id);
      const linkedCardIds = new Set(linkedCards.map(lc => lc.cardId));
      const filteredSuggestions = suggestions.filter(s => !linkedCardIds.has(s.cardId));

      const response: ApiResponse = {
        success: true,
        data: {
          suggestions: filteredSuggestions,
          totalMatches: filteredSuggestions.length
        },
        message: 'Suggestions retrieved successfully'
      };
      res.json(response);
    } catch (error) {
      console.error('Error fetching card suggestions:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// Search cards by custom query (for manual linking)
router.get('/cards/search',
  [
    query('q').trim().isLength({ min: 1, max: 200 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
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
      const searchTerm = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 20;
      const suggestions = await GlossaryTermModel.findMatchingCards(searchTerm, req.user!.restaurantId, limit);
      const response: ApiResponse = {
        success: true,
        data: {
          suggestions,
          totalMatches: suggestions.length
        },
        message: 'Search completed successfully'
      };
      res.json(response);
    } catch (error) {
      console.error('Error searching cards:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// Link a card to a term
router.post('/terms/:termId/cards/:cardId',
  [
    param('termId').isUUID(),
    param('cardId').isUUID(),
    body('matchField').optional().trim().isLength({ max: 100 }),
    body('matchContext').optional().trim().isLength({ max: 500 })
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
      // Term must belong to caller's restaurant
      const term = await GlossaryTermModel.findById(req.params.termId, req.user!.restaurantId);
      if (!term) {
        return res.status(404).json({ success: false, error: 'Term not found' });
      }
      // And so must the card (via its deck)
      const cardOk = await GlossaryTermModel.cardBelongsToRestaurant(req.params.cardId, req.user!.restaurantId);
      if (!cardOk) {
        return res.status(404).json({ success: false, error: 'Card not found' });
      }

      const link = await GlossaryTermModel.linkCard(
        req.params.termId,
        req.params.cardId,
        req.body.matchField,
        req.body.matchContext
      );
      const response: ApiResponse = {
        success: true,
        data: link,
        message: 'Card linked successfully'
      };
      res.status(201).json(response);
    } catch (error) {
      console.error('Error linking card to term:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// Unlink a card from a term
router.delete('/terms/:termId/cards/:cardId',
  [
    param('termId').isUUID(),
    param('cardId').isUUID()
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
      // Term must belong to caller's restaurant
      const term = await GlossaryTermModel.findById(req.params.termId, req.user!.restaurantId);
      if (!term) {
        return res.status(404).json({ success: false, error: 'Term not found' });
      }

      const deleted = await GlossaryTermModel.unlinkCard(req.params.termId, req.params.cardId);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Link not found' });
      }
      const response: ApiResponse = {
        success: true,
        message: 'Card unlinked successfully'
      };
      res.json(response);
    } catch (error) {
      console.error('Error unlinking card from term:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

export default router;
