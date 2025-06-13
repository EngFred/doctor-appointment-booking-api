import express from 'express';
import * as appointmentController from '../controllers/appointmentController.js';
import { protect, restrictToDoctor } from '../middlewares/authMiddleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const getLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
});

const completeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many completion attempts, please try again later.',
});

router.post('/initiate', protect, getLimiter, appointmentController.initiateAppointment);
router.get('/', protect, getLimiter, appointmentController.getAppointments);
router.get('/:id', protect, getLimiter, appointmentController.getAppointmentById);
router.post('/:id/cancel', protect, getLimiter, appointmentController.cancelAppointment);
router.post('/:id/join', protect, getLimiter, appointmentController.joinAppointment);
router.post('/:id/confirm', protect, restrictToDoctor, getLimiter, appointmentController.confirmAppointment);
router.post('/:id/complete', protect, completeLimiter, appointmentController.completeAppointment);

export default router;