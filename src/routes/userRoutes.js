import express from 'express';
import * as userController from '../controllers/userController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/isAdmin.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limit for public GET routes
const getLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests, please try again later.',
});

// Public routes (self or admin access)
router.get('/:id', protect, getLimiter, userController.getUserById);
router.put('/:id', protect, userController.updateUser);

// Admin-only routes
router.get('/', protect, isAdmin, getLimiter, userController.getAllUsers);
router.delete('/:id', protect, isAdmin, userController.deleteUser);

export default router;