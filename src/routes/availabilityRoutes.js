import express from 'express';
import * as availabilityController from '../controllers/availabilityController.js';
import { protect, restrictToDoctor } from '../middlewares/authMiddleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const getLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
});

router.get('/', protect, getLimiter, availabilityController.getAvailabilities);
router.get('/me', protect, restrictToDoctor, getLimiter, availabilityController.getMyAvailabilities);
router.get('/:id', protect, getLimiter, availabilityController.getAvailabilityById);

router.post('/', protect, restrictToDoctor, availabilityController.createAvailability);
router.put('/:id', protect, restrictToDoctor, availabilityController.updateAvailability);
router.delete('/:id', protect, restrictToDoctor, availabilityController.deleteAvailability);

export default router;