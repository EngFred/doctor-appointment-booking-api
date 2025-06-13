import express from 'express';
import * as messageController from '../controllers/messageController.js';
import { protect } from '../middlewares/authMiddleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests, please try again later.',
});

router.post('/', protect, limiter, messageController.sendMessage);
router.get('/', protect, limiter, messageController.getMessages);
router.get('/:id', protect, limiter, messageController.getMessageById);
router.patch('/:id/status', protect, limiter, messageController.updateMessageStatus);
router.delete('/:id', protect, limiter, messageController.deleteMessage);

export default router;