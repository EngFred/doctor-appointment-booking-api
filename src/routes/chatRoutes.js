import express from 'express';
import * as chatController from '../controllers/chatController.js';
import { protect } from '../middlewares/authMiddleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limit for GET routes
const getLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
});

router.get('/messages', protect, getLimiter, chatController.getMessages);

export default router;