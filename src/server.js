import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import pino from 'pino-http';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import authRoutes from './routes/authRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import hospitalRoutes from './routes/hospitalRoutes.js';
import availabilityRoutes from './routes/availabilityRoutes.js';
import userRoutes from './routes/userRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import prisma from './config/database.js';
import * as appointmentService from './services/appointmentService.js';
import { ZodError } from 'zod';

// Load environment variables
dotenv.config();

// Validate environment variables
const requiredEnvVars = [
  'PORT',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'DATABASE_URL',
  'AGORA_APP_ID',
  'AGORA_APP_CERTIFICATE'
];
for (const variable of requiredEnvVars) {
  if (!process.env[variable]) {
    console.error(`Missing required environment variable: ${variable}`);
    process.exit(1);
  }
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.MOBILE_APP_URL,
    methods: ['GET'],
    credentials: true,
  },
});

// Middleware
app.use(express.json());
app.use(helmet());
app.use(compression());
app.use(pino());
app.use(cors());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Welcome route
app.get('/', (_, res) => {
  res.json({ message: 'Welcome to the API' });
});

// Socket.IO setup with authentication
io.on('connection', async (socket) => {
  const logger = socket.get('logger') || console; // Fallback logger

  // Authenticate JWT
  const token = socket.handshake.auth.token;
  if (!token) {
    logger.error('Socket.IO connection rejected: No token provided');
    socket.emit('error', { message: 'Authentication failed: No token provided' });
    socket.disconnect();
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      logger.error('Socket.IO connection rejected: User not found');
      socket.emit('error', { message: 'Authentication failed: User not found' });
      socket.disconnect();
      return;
    }

    socket.data.user = user;
    logger.info(`Socket.IO connected: user ${user.id}, socketId ${socket.id}`);

    socket.on('join-appointment', async ({ appointmentId }) => {
      try {
        const joinData = await appointmentService.joinAppointment(appointmentId, socket.data.user, logger);

        if (joinData.type !== 'TEXT') {
          socket.emit('error', { message: 'Invalid consultation type for chat' });
          return;
        }

        const roomId = joinData.sessionId;
        socket.join(roomId);
        socket.emit('joined-appointment', { roomId, appointmentId, userId: socket.data.user.id, role: socket.data.user.role });

        const otherParticipantId = socket.data.user.id === joinData.patientId ? joinData.doctorId : joinData.patientId;
        io.to(roomId).emit('user-joined', { userId: socket.data.user.id, role: socket.data.user.role, appointmentId });

        socket.data.appointment = { id: appointmentId, roomId };
        logger.info(`User ${socket.data.user.id} joined appointment ${appointmentId}, room: ${roomId}`);
      } catch (err) {
        logger.error(`Failed to join appointment ${appointmentId} for user ${socket.data.user.id}: ${err.message}`);
        socket.emit('error', { message: err.message || 'Failed to join appointment' });
      }
    });

    socket.on('send-message', async ({ appointmentId, message }) => {
      try {
        const { sessionId, message: savedMessage } = message;

        const appointment = await prisma.appointment.findUnique({
          where: { id: appointmentId },
          select: { sessionId: true },
        });

        if (!appointment || appointment.sessionId !== sessionId) {
          logger.error(`Invalid session or appointment ${appointmentId} for user ${socket.data.user.id}`);
          socket.emit('error', { message: 'Invalid session or appointment' });
          return;
        }

        io.to(sessionId).emit('new-message', {
          appointmentId,
          message: savedMessage,
          senderId: socket.data.user.id,
        });

        logger.info(`Message broadcast for appointment ${appointmentId} by user ${socket.data.user.id}`);
      } catch (err) {
        logger.error(`Failed to broadcast message for appointment ${appointmentId}: ${err.message}`);
        socket.emit('error', { message: 'Failed to broadcast message' });
      }
    });

    socket.on('disconnect', () => {
      const { user, appointment } = socket.data;
      if (user && appointment) {
        io.to(appointment.roomId).emit('user-disconnected', {
          userId: user.id,
          role: user.role,
          appointmentId: appointment.id,
        });
        logger.info(`User ${user.id} disconnected from appointment ${appointment.id}, socketId ${socket.id}`);
      } else {
        logger.info(`Socket disconnected: ${socket.id}`);
      }
    });

    socket.on('error', (err) => {
      logger.error(`Socket error for user ${socket.data.user?.id || 'unknown'}: ${err.message}`);
    });
  } catch (err) {
    logger.error(`Socket.IO connection failed: ${err.message}`);
    socket.emit('error', { message: 'Authentication failed: Invalid or expired token' });
    socket.disconnect();
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error object:", err);
  req.log.error(err.message || 'Unknown error');
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      details: err.errors,
    });
  }
  if (err.message?.includes('Unauthorized')) {
    return res.status(401).json({ status: 'error', message: err.message });
  }
  if (err.message?.includes('not found')) {
    return res.status(404).json({ status: 'error', message: err.message });
  }
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
  });

  console.log('•••••••••Status code•••••••••••>>>', err.statusCode);
});

// 404 Not Found handler
app.use((req, res) => {
  res.status(404).json({ status: 'error', error: 'Not Found' });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});