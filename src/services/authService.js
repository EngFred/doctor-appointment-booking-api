import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '../utils/generateToken.js';
import prisma from '../config/database.js';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { uploadToCloudinary } from '../config/cloudinary.js';

// Validation schemas
const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email format'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format (E.164 expected, e.g., +256123456789)'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['PATIENT', 'SUPER_ADMIN', 'DOCTOR']).optional(),
  specialty: z.string().optional(),
  hospitalId: z.string().uuid('Invalid hospital ID').optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const register = async (data) => {
  const validatedData = registerSchema.parse(data);
  const { firstName, lastName, email, phone, password, role, specialty, hospitalId } = validatedData;

  // Check email uniqueness
  const existingUserByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingUserByEmail) {
    const error = new Error('Email is already taken');
    error.statusCode = 409;
    throw error;
  }

  // Check phone uniqueness
  const existingUserByPhone = await prisma.user.findUnique({ where: { phone } });
  if (existingUserByPhone) {
    const error = new Error('Phone number is already taken');
    error.statusCode = 409;
    throw error;
  }

  // Validate hospital if provided
  if (hospitalId) {
    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!hospital) {
      const error = new Error('Hospital not found');
      error.statusCode = 404;
      throw error;
    }
  }

  // Enforce doctor requirements
  if (role === 'DOCTOR' && (!specialty || !hospitalId)) {
    const error = new Error('Specialty and hospitalId are required for doctors');
    error.statusCode = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      role: role || 'PATIENT',
      specialty,
      hospitalId,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      specialty: true,
      hospitalId: true,
    },
  });

  const accessToken = generateAccessToken({ id: user.id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user.id, role: user.role });

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  return { user, accessToken, refreshToken };
};

export const login = async (data) => {
  const validatedData = loginSchema.parse(data);
  const { email, password } = validatedData;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      specialty: true,
      hospitalId: true,
      password: true,
      fcmToken: true,
    },
  });

  if (!user) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  const accessToken = generateAccessToken({ id: user.id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user.id, role: user.role });

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  const { password: _, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, accessToken, refreshToken };
};

export const getCurrentUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      specialty: true,
      hospitalId: true,
      profilePicture: true,
      fcmToken: true,
    },
  });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return user;
};

export const refreshToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, refreshToken: true, role: true },
    });

    if (!user || user.refreshToken !== refreshToken) {
      const error = new Error('Invalid refresh token');
      error.statusCode = 401;
      throw error;
    }

    const accessToken = generateAccessToken({ id: user.id, role: user.role });
    const newRefreshToken = generateRefreshToken({ id: user.id, role: user.role });

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    return { accessToken, refreshToken: newRefreshToken };
  } catch (err) {
    const error = new Error('Invalid or expired refresh token');
    error.statusCode = 401;
    throw error;
  }
};

export const logout = async (userId) => {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
};

export const updateProfilePicture = async (userId, file) => {
  if (!file) {
    const error = new Error('Profile picture is required');
    error.statusCode = 400;
    throw error;
  }

  const profilePicture = await uploadToCloudinary(file.buffer, file.originalname, 'profiles', 'user');

  const user = await prisma.user.update({
    where: { id: userId },
    data: { profilePicture },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      specialty: true,
      hospitalId: true,
      profilePicture: true,
    },
  });

  return user;
};

export const updateFcmToken = async (userId, fcmToken) => {
  if (!fcmToken) {
    const error = new Error('FCM token is required');
    error.statusCode = 400;
    throw error;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { fcmToken },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      specialty: true,
      hospitalId: true,
      fcmToken: true,
    },
  });

  return user;
};