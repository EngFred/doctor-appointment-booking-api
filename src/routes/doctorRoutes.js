import express from 'express';
import * as doctorController from '../controllers/doctorController.js';
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

// Public routes
router.get('/', protect, getLimiter, doctorController.getDoctors);
router.get('/:id', protect, getLimiter, doctorController.getDoctorById);

// Admin-only routes
router.post('/', protect, isAdmin, doctorController.createDoctor);
router.put('/:id', protect, isAdmin, doctorController.updateDoctor);
router.delete('/:id', protect, isAdmin, doctorController.deleteDoctor);

export default router;