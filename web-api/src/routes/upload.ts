import { Router, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { authenticateToken, requireManagement, AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../../../shared/types';
import { uploadToR2, deleteFromR2, urlToKey } from '../utils/r2';

interface AuthenticatedRequestWithFile extends AuthenticatedRequest {
  file?: Express.Multer.File;
}

const router = Router();

router.use(authenticateToken);
router.use(requireManagement);

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Upload image → resize + convert to WebP → push to R2
router.post('/image', upload.single('image'), async (req: AuthenticatedRequestWithFile, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    const webpBuffer = await sharp(req.file.buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const key = `images/${uuidv4()}.webp`;
    const imageUrl = await uploadToR2(key, webpBuffer, 'image/webp');

    const response: ApiResponse = {
      success: true,
      data: { imageUrl, originalName: req.file.originalname, size: webpBuffer.length },
      message: 'Image uploaded successfully',
    };

    res.json(response);
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Delete image from R2
router.delete('/image', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'Image URL is required' });
    }

    const key = urlToKey(imageUrl);
    if (!key) {
      return res.status(400).json({ success: false, error: 'Can only delete R2-hosted images' });
    }

    await deleteFromR2(key);
    res.json({ success: true, message: 'Image deleted successfully' } as ApiResponse);
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
