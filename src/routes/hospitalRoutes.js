import express from 'express';
import * as hospitalController from '../controllers/hospitalController.js';
import { isAdmin } from '../middlewares/isAdmin.js';
import { protect } from '../middlewares/authMiddleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limit for public GET routes
const getLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests, please try again later.',
});

// Public routes
router.get('/', protect, getLimiter, hospitalController.getHospitals);
router.get('/:id', protect, getLimiter, hospitalController.getHospitalById);

// Admin-only routes
router.post('/', protect, isAdmin, hospitalController.createHospital);
router.put('/:id', protect, isAdmin, hospitalController.updateHospital);
router.delete('/:id', protect, isAdmin, hospitalController.deleteHospital);

export default router;