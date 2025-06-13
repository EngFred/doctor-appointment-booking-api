import express from 'express';
import * as userController from '../controllers/userController.js';
import { protect, restrictToSuperAdmin } from '../middlewares/authMiddleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const getLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
});

router.get('/', protect, restrictToSuperAdmin, getLimiter, userController.getAllUsers);
router.get('/:id', protect, getLimiter, userController.getUserById);
router.put('/:id', protect, userController.updateUser);
router.delete('/:id', protect, restrictToSuperAdmin, userController.deleteUser);

export default router;