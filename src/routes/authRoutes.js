import express from 'express';
import { register, login, getMe, refresh, logout, updateProfilePicture, updateFcmToken } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';
import rateLimit from 'express-rate-limit';
import upload from '../middlewares/multer.js';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refresh);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/profile-picture', protect, upload.single('profilePicture'), updateProfilePicture);
router.put('/fcm-token', protect, updateFcmToken);

export default router;