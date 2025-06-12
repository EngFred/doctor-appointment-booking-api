import express from 'express';
import * as doctorController from '../controllers/doctorController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/isAdmin.js';
import rateLimit from 'express-rate-limit';
import upload from '../middlewares/multer.js';

const router = express.Router();

const getLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
});

router.get('/', protect, getLimiter, doctorController.getDoctors);
router.get('/:id', protect, getLimiter, doctorController.getDoctorById);

router.post('/', protect, isAdmin, upload.single('profilePicture'), doctorController.createDoctor);
router.put('/:id', protect, isAdmin, upload.single('profilePicture'), doctorController.updateDoctor);
router.delete('/:id', protect, isAdmin, doctorController.deleteDoctor);

export default router;