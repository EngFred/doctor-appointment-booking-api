import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Validation schemas
const userUpdateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  email: z.string().email('Invalid email format').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  profilePicture: z.string().url('Invalid URL').optional(),
  deviceType: z.enum(['IOS', 'ANDROID']).optional(),
  fcmToken: z.string().optional(),
});

const idSchema = z.string().uuid('Invalid UUID');

export const getAllUsers = async ({ skip = 0, take = 10, role, email, name }) => {
  const where = {};
  if (role) where.role = role;
  if (email) where.email = { contains: email, mode: 'insensitive' };
  if (name) {
    where.OR = [
      { firstName: { contains: name, mode: 'insensitive' } },
      { lastName: { contains: name, mode: 'insensitive' } },
    ];
  }

  return await prisma.user.findMany({
    where,
    skip: Number(skip),
    take: Number(take),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      profilePicture: true,
      deviceType: true,
      createdAt: true,
    },
  });
};

export const getUserById = async (id) => {
  const validatedId = idSchema.parse(id);
  const user = await prisma.user.findUnique({
    where: { id: validatedId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      profilePicture: true,
      deviceType: true,
      fcmToken: true,
      createdAt: true,
      updatedAt: true,
      appointments: {
        select: {
          id: true,
          scheduledAt: true,
          status: true,
        },
      },
      notifications: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

export const updateUser = async (id, data, currentUser) => {
  const validatedId = idSchema.parse(id);
  const validatedData = userUpdateSchema.parse(data);

  // Restrict non-admins from updating role or sensitive fields
  if (currentUser.role !== 'ADMIN') {
    if (currentUser.id !== validatedId) {
      throw new Error('Unauthorized access');
    }
    // Prevent non-admins from updating role
    if (data.role) {
      throw new Error('Only admins can update role');
    }
  }

  // Check email uniqueness
  if (validatedData.email) {
    const existingUser = await prisma.user.findFirst({
      where: { email: validatedData.email, id: { not: validatedId } },
    });
    if (existingUser) {
      throw new Error('Email is already taken');
    }
  }

  // Hash password if provided
  if (validatedData.password) {
    validatedData.password = await bcrypt.hash(validatedData.password, 12);
  }

  try {
    return await prisma.user.update({
      where: { id: validatedId },
      data: validatedData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        profilePicture: true,
        deviceType: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new Error('User not found');
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new Error('Email is already taken');
    }
    throw err;
  }
};

export const deleteUser = async (id, currentUser) => {
  const validatedId = idSchema.parse(id);

  if (currentUser.role !== 'ADMIN') {
    throw new Error('Only admins can delete users');
  }

  // Check for associated appointments or payments
  const appointmentCount = await prisma.appointment.count({
    where: { patientId: validatedId, status: { in: ['PENDING', 'CONFIRMED'] } },
  });
  const paymentCount = await prisma.payment.count({
    where: { userId: validatedId, status: 'PENDING' },
  });

  if (appointmentCount > 0) {
    throw new Error('Cannot delete user with pending or confirmed appointments');
  }
  if (paymentCount > 0) {
    throw new Error('Cannot delete user with pending payments');
  }

  try {
    await prisma.user.delete({ where: { id: validatedId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new Error('User not found');
    }
    throw err;
  }
};