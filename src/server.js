import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import pino from 'pino-http';
import authRoutes from './routes/authRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import hospitalRoutes from './routes/hospitalRoutes.js';
import availabilityRoutes from './routes/availabilityRoutes.js';
import userRoutes from './routes/userRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import { ZodError } from 'zod';

// Load environment variables
dotenv.config();

// Validate environment variables
const requiredEnvVars = ['PORT', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'];
for (const variable of requiredEnvVars) {
  if (!process.env[variable]) {
    console.error(`Missing required environment variable: ${variable}`);
    process.exit(1);
  }
}

const app = express();

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
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Welcome route
app.get('/', (_, res) => {
  res.json({ message: 'Welcome to the API' });
});

// Global error handler
app.use((err, req, res, next) => {
  req.log.error(err.message || 'Unknown error');
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      details: err.errors,
    });
  }

  if (err.message?.includes('Only JPEG, PNG, or GIF') || err.message?.includes('Cloudinary')) {
    return res.status(400).json({
      status: 'error',
      message: err.message,
    });
  }

  if (err.message?.includes('Unauthorized')) {
    return res.status(401).json({ status: 'error', message: err.message });
  }
  
  if (err.message?.includes('not found')) {
    return res.status(404).json({ status: 'error', message: err.message });
  }

  if (err.message?.includes('required') || err.message?.includes('invalid') || err.message?.includes('available')) {
    return res.status(400).json({
      status: 'error',
      message: err.message,
    });
  }

  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
  });
});

// 404 Not Found handler
app.use((req, res) => {
  res.status(404).json({ status: 'error', error: 'Not Found' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});