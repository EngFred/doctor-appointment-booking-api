import express from 'express';
import * as hospitalController from '../controllers/hospitalController.js';
import { protect, restrictToSuperAdmin } from '../middlewares/authMiddleware.js';
import rateLimit from 'express-rate-limit';
import upload from '../middlewares/multer.js';

const router = express.Router();

const getLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
});

router.get('/', protect, getLimiter, hospitalController.getHospitals);
router.get('/:id', protect, getLimiter, hospitalController.getHospitalById);

router.post('/', protect, restrictToSuperAdmin, upload.single('image'), hospitalController.createHospital);
router.put('/:id', protect, restrictToSuperAdmin, upload.single('image'), hospitalController.updateHospital);
router.delete('/:id', protect, restrictToSuperAdmin, hospitalController.deleteHospital);

export default router;