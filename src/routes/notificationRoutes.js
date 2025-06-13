import express from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { protect } from '../middlewares/authMiddleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const getLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests, please try again later.',
});

router.get('/', protect, getLimiter, notificationController.getNotifications);
router.get('/:id', protect, getLimiter, notificationController.getNotificationById);
router.patch('/:id/read', protect, getLimiter, notificationController.markNotificationAsRead);
router.delete('/:id', protect, getLimiter, notificationController.deleteNotification);

export default router;