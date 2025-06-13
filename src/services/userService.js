import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Validation schemas
const userUpdateSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required' }).optional(),
  lastName: z.string().min(1, { message: 'Last name is required' }).optional(),
  email: z.string().email({ message: 'Invalid email format' }).optional(),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, { message: 'Invalid phone number format (E.164 expected, e.g., +256123456789)' })
    .optional(),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }).optional(),
  profilePicture: z.string().url({ message: 'Invalid URL' }).optional(),
  fcmToken: z.string().optional(),
  specialty: z.string().min(1, { message: 'Specialty is required for doctors' }).optional(),
  hospitalId: z.string().uuid({ message: 'Invalid hospital ID' }).optional(),
  role: z.enum(['PATIENT', 'SUPER_ADMIN', 'DOCTOR']).optional(),
});

const idSchema = z.string().uuid({ message: 'Invalid UUID' });

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
      specialty: true,
      hospitalId: true,
      profilePicture: true,
      fcmToken: true,
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
      specialty: true,
      hospitalId: true,
      profilePicture: true,
      fcmToken: true,
      createdAt: true,
      updatedAt: true,
      hospital: {
        select: {
          id: true,
          name: true,
          address: true,
        },
      },
      patientAppointments: {
        select: {
          id: true,
          scheduledAt: true,
          status: true,
        },
      },
      doctorAppointments: {
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
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return user;
};

export const updateUser = async (id, data, currentUser) => {
  const validatedId = idSchema.parse(id);
  const validatedData = userUpdateSchema.parse(data);

  // Restrict non-Super Admins from updating other users or role
  if (currentUser.role !== 'SUPER_ADMIN') {
    if (currentUser.id !== validatedId) {
      const error = new Error('Unauthorized: Can only update your own profile');
      error.statusCode = 403;
      throw error;
    }
    if (data.role) {
      const error = new Error('Only Super Admins can update role');
      error.statusCode = 403;
      throw error;
    }
  }

  // Validate specialty and hospitalId for DOCTOR role
  if (validatedData.role === 'DOCTOR' || (currentUser.id === id && currentUser.role === 'DOCTOR')) {
    if (!validatedData.specialty && !validatedData.hospitalId) {
      const existing = await prisma.user.findUnique({ where: { id: validatedId } });
      if (!existing.specialty || !existing.hospitalId) {
        const error = new Error('Specialty and hospitalId are required for doctors');
        error.statusCode = 400;
        throw error;
      }
    }
    if (validatedData.hospitalId) {
      const hospital = await prisma.hospital.findUnique({ where: { id: validatedData.hospitalId } });
      if (!hospital) {
        const error = new Error('Hospital not found');
        error.statusCode = 404;
        throw error;
      }
    }
  }

  // Prevent non-Doctors from setting specialty or hospitalId
  if (validatedData.role !== 'DOCTOR' && currentUser.role !== 'DOCTOR') {
    if (validatedData.specialty || validatedData.hospitalId) {
      const error = new Error('Only doctors can set specialty or hospitalId');
      error.statusCode = 400;
      throw error;
    }
  }

  // Check email uniqueness
  if (validatedData.email) {
    const existingUser = await prisma.user.findFirst({
      where: { email: validatedData.email, id: { not: validatedId } },
    });
    if (existingUser) {
      const error = new Error('Email is already taken');
      error.statusCode = 409;
      throw error;
    }
  }

  // Check phone uniqueness
  if (validatedData.phone) {
    const existingUser = await prisma.user.findFirst({
      where: { phone: validatedData.phone, id: { not: validatedId } },
    });
    if (existingUser) {
      const error = new Error('Phone number is already taken');
      error.statusCode = 409;
      throw error;
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
        phone: true, // Added phone to select
        role: true,
        specialty: true,
        hospitalId: true,
        profilePicture: true,
        fcmToken: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const error = new Error('Unique constraint failed');
      error.statusCode = 409;
      throw error;
    }
    throw err;
  }
};

export const deleteUser = async (id, currentUser) => {
  const validatedId = idSchema.parse(id);

  if (currentUser.role !== 'SUPER_ADMIN') {
    const error = new Error('Only Super Admins can delete users');
    error.statusCode = 403;
    throw error;
  }

  // Check for associated records
  const appointmentCount = await prisma.appointment.count({
    where: {
      OR: [
        { patientId: validatedId, status: { in: ['PENDING', 'CONFIRMED'] } },
        { doctorId: validatedId, status: { in: ['PENDING', 'CONFIRMED'] } },
      ],
    },
  });
  const paymentCount = await prisma.payment.count({
    where: { userId: validatedId, status: 'PENDING' },
  });
  const availabilityCount = await prisma.availability.count({
    where: { doctorId: validatedId, status: 'AVAILABLE' },
  });

  if (appointmentCount > 0) {
    const error = new Error('Cannot delete user with pending or confirmed appointments');
    error.statusCode = 400;
    throw error;
  }
  if (paymentCount > 0) {
    const error = new Error('Cannot delete user with pending payments');
    error.statusCode = 400;
    throw error;
  }
  if (availabilityCount > 0) {
    const error = new Error('Cannot delete doctor with available slots');
    error.statusCode = 400;
    throw error;
  }

  try {
    await prisma.user.delete({ where: { id: validatedId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    throw err;
  }
};