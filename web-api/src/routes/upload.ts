import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, requireManagement, AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../../../shared/types';

// Extend AuthenticatedRequest to include multer file
interface AuthenticatedRequestWithFile extends AuthenticatedRequest {
  file?: any;
}

const router = Router();

// Apply authentication and management requirement to all routes
router.use(authenticateToken);
router.use(requireManagement);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/images');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    cb(null, uploadsDir);
  },
  filename: (req: any, file: any, cb: any) => {
    // Generate unique filename with original extension
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter for image types
const fileFilter = (req: any, file: any, cb: any) => {
  // Allow only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

// Configure multer middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  }
});

// Upload image endpoint
router.post('/image', upload.single('image'), async (req: AuthenticatedRequestWithFile, res: Response) => {
  try {
    console.log('🔄 Image upload request received:', {
      hasFile: !!req.file,
      userId: req.user?.id
    });

    if (!req.file) {
      console.log('❌ No file provided in upload request');
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    // Return the relative path that will be stored in database
    const imagePath = `/uploads/images/${req.file.filename}`;

    console.log('✅ Image uploaded successfully:', {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      imagePath: imagePath
    });

    const response: ApiResponse = {
      success: true,
      data: {
        imageUrl: imagePath,
        originalName: req.file.originalname,
        size: req.file.size
      },
      message: 'Image uploaded successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Delete image endpoint
router.delete('/image', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Image URL is required'
      });
    }

    // Only allow deletion of uploaded files (not external URLs)
    if (!imageUrl.startsWith('/uploads/images/')) {
      return res.status(400).json({
        success: false,
        error: 'Can only delete uploaded images'
      });
    }

    // Construct full file path
    const filePath = path.join(__dirname, '../..', imageUrl);

    // Check if file exists and delete it
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Image deleted successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;