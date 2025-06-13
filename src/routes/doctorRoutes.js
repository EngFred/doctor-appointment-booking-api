import express from 'express';
import * as doctorController from '../controllers/doctorController.js';
import { protect, restrictToSuperAdmin } from '../middlewares/authMiddleware.js';
import rateLimit from 'express-rate-limit';
import upload from '../middlewares/multer.js';

const router = express.Router();

const getLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
});

router.get('/', protect, getLimiter, doctorController.getDoctors);
router.get('/me', protect, doctorController.getCurrentDoctor);
router.get('/:id', protect, getLimiter, doctorController.getDoctorById);

router.post('/', protect, restrictToSuperAdmin, upload.single('profilePicture'), doctorController.createDoctor);
router.put('/:id', protect, restrictToSuperAdmin, upload.single('profilePicture'), doctorController.updateDoctor);
router.patch('/me/fcm-token', protect, doctorController.updateDoctorFcmToken);
router.delete('/:id', protect, restrictToSuperAdmin, doctorController.deleteDoctor);

export default router;