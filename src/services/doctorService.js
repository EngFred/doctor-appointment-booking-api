import prisma from '../config/database.js';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { uploadToCloudinary } from '../config/cloudinary.js';
import bcrypt from 'bcryptjs';

// Validation schemas
const doctorSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().min(1, { message: 'Last name is required' }),
  email: z.string().email({ message: 'Invalid email format' }),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, { message: 'Invalid phone number format (E.164 expected, e.g., +256123456789)' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }), // Removed .optional()
  specialty: z.string().min(1, { message: 'Specialty is required' }),
  hospitalId: z.string().uuid({ message: 'Invalid hospital ID' }),
  profilePicture: z.string().url({ message: 'Invalid URL' }).optional(),
  fcmToken: z.string().optional(),
});

const idSchema = z.string().uuid({ message: 'Invalid UUID' });

const fcmTokenSchema = z.object({
  fcmToken: z.string().min(1, { message: 'FCM token is required' }),
});

export const createDoctor = async (data, file) => {
  const validatedData = doctorSchema.parse(data);
  const { email, phone, password, hospitalId, specialty, firstName, lastName, fcmToken } = validatedData;

  // Check email uniqueness
  const existingUserByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingUserByEmail) {
    const error = new Error('Email already in use');
    error.statusCode = 409;
    throw error;
  }

  // Check phone uniqueness
  const existingUserByPhone = await prisma.user.findUnique({ where: { phone } });
  if (existingUserByPhone) {
    const error = new Error('Phone number already in use');
    error.statusCode = 409;
    throw error;
  }

  // Validate hospital
  const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
  if (!hospital) {
    const error = new Error('Hospital not found');
    error.statusCode = 404;
    throw error;
  }

  let profilePicture = null;
  if (file) {
    profilePicture = await uploadToCloudinary(file.buffer, file.originalname, 'profiles', 'doctor');
  }

  const hashedPassword = await bcrypt.hash(password, 12); // Always hash password since it's required

  return await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      role: 'DOCTOR',
      specialty,
      profilePicture,
      fcmToken,
      hospital: { connect: { id: hospitalId } },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      specialty: true,
      hospitalId: true,
      profilePicture: true,
      createdAt: true,
    },
  });
};

// Other functions remain unchanged
export const getDoctors = async ({ skip = 0, take = 10, specialty, hospitalId, name }) => {
  const where = { role: 'DOCTOR' };
  if (specialty) where.specialty = { contains: specialty, mode: 'insensitive' };
  if (hospitalId) where.hospitalId = idSchema.parse(hospitalId);
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
    orderBy: { firstName: 'asc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      specialty: true,
      hospitalId: true,
      profilePicture: true,
      createdAt: true,
      hospital: {
        select: {
          id: true,
          name: true,
          address: true,
          about: true,
        },
      },
      availability: {
        where: { status: 'AVAILABLE' },
        select: {
          id: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  });
};

export const getDoctorById = async (id) => {
  const validatedId = idSchema.parse(id);
  const doctor = await prisma.user.findUnique({
    where: { id: validatedId, role: 'DOCTOR' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      specialty: true,
      hospitalId: true,
      profilePicture: true,
      createdAt: true,
      updatedAt: true,
      hospital: {
        select: {
          id: true,
          name: true,
          address: true,
          about: true,
        },
      },
      availability: {
        where: { status: 'AVAILABLE' },
        select: {
          id: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  });

  if (!doctor) {
    const error = new Error('Doctor not found');
    error.statusCode = 404;
    throw error;
  }

  return doctor;
};

export const getCurrentDoctor = async (id) => {
  const doctor = await prisma.user.findUnique({
    where: { id, role: 'DOCTOR' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      specialty: true,
      hospitalId: true,
      profilePicture: true,
      createdAt: true,
      updatedAt: true,
      hospital: {
        select: {
          id: true,
          name: true,
          address: true,
          about: true,
        },
      },
    },
  });

  if (!doctor) {
    const error = new Error('Doctor not found');
    error.statusCode = 404;
    throw error;
  }

  return doctor;
};

export const updateDoctor = async (id, data, file) => {
  const validatedId = idSchema.parse(id);
  const validatedData = doctorSchema.partial().parse(data);

  if (validatedData.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email, id: { not: validatedId } },
    });
    if (existingUser) {
      const error = new Error('Email already in use');
      error.statusCode = 409;
      throw error;
    }
  }

  if (validatedData.phone) {
    const existingUser = await prisma.user.findUnique({
      where: { phone: validatedData.phone, id: { not: validatedId } },
    });
    if (existingUser) {
      const error = new Error('Phone number already in use');
      error.statusCode = 409;
      throw error;
    }
  }

  let updateData = { ...validatedData };
  if (validatedData.hospitalId) {
    const hospital = await prisma.hospital.findUnique({ where: { id: validatedData.hospitalId } });
    if (!hospital) {
      const error = new Error('Hospital not found');
      error.statusCode = 404;
      throw error;
    }
    updateData.hospital = { connect: { id: validatedData.hospitalId } };
    delete updateData.hospitalId;
  }

  if (validatedData.password) {
    updateData.password = await bcrypt.hash(validatedData.password, 12);
  }

  if (file) {
    updateData.profilePicture = await uploadToCloudinary(file.buffer, file.originalname, 'profiles', 'doctor');
  }

  try {
    return await prisma.user.update({
      where: { id: validatedId, role: 'DOCTOR' },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        specialty: true,
        hospitalId: true,
        profilePicture: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      const error = new Error('Doctor not found');
      error.statusCode = 404;
      throw error;
    }
    throw err;
  }
};

export const updateDoctorFcmToken = async (id, fcmToken) => {
  const validatedId = idSchema.parse(id);
  const validatedFcmToken = fcmTokenSchema.parse({ fcmToken });

  try {
    const doctor = await prisma.user.update({
      where: { id: validatedId, role: 'DOCTOR' },
      data: { fcmToken: validatedFcmToken.fcmToken },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        specialty: true,
        hospitalId: true,
        profilePicture: true,
        fcmToken: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return doctor;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      const error = new Error('Doctor not found');
      error.statusCode = 404;
      throw error;
    }
    throw err;
  }
};

export const deleteDoctor = async (id) => {
  const validatedId = idSchema.parse(id);

  const appointmentCount = await prisma.appointment.count({
    where: { doctorId: validatedId, status: { in: ['PENDING', 'CONFIRMED'] } },
  });

  const availabilityCount = await prisma.availability.count({
    where: { doctorId: validatedId, status: 'AVAILABLE' },
  });

  if (appointmentCount > 0) {
    const error = new Error('Cannot delete doctor with pending or confirmed appointments');
    error.statusCode = 400;
    throw error;
  }
  if (availabilityCount > 0) {
    const error = new Error('Cannot delete doctor with available slots');
    error.statusCode = 400;
    throw error;
  }

  try {
    await prisma.user.delete({ where: { id: validatedId, role: 'DOCTOR' } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      const error = new Error('Doctor not found');
      error.statusCode = 404;
      throw error;
    }
    throw err;
  }
};