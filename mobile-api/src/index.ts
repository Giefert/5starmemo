import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth';
import deckRoutes from './routes/decks';
import progressRoutes from './routes/progress';
import glossaryRoutes from './routes/glossary';
import pool from './config/database';

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet());

// CORS configuration
const corsOrigins: (string | RegExp)[] = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
];
if (process.env.NODE_ENV !== 'production') {
  corsOrigins.push(/^http:\/\/localhost:\d+$/, /^exp:\/\/localhost:\d+$/);
}
app.use(cors({ origin: corsOrigins, credentials: true }));

// Rate limiting (more lenient for mobile)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs (higher for mobile)
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Logging middleware
app.use(morgan('combined'));

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, message: '5StarMemo Mobile API is running' });
  } catch {
    res.status(503).json({ success: false, error: 'Database unreachable' });
  }
});

// API routes
app.use('/api/student/auth', authRoutes);
app.use('/api/student/decks', deckRoutes);
app.use('/api/student/progress', progressRoutes);
app.use('/api/student/glossary', glossaryRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Mobile API running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
});

export default app;