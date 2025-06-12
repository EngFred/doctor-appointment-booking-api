import prisma from '../config/database.js';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Validation schemas
const doctorSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  specialty: z.string().min(1, 'Specialty is required'),
  hospitalId: z.string().uuid('Invalid hospital ID'),
  profilePicture: z.string().url('Invalid URL').optional(),
});

const idSchema = z.string().uuid('Invalid UUID');

export const getDoctors = async ({ skip = 0, take = 10, specialty, hospitalId, name }) => {
  const where = {};
  if (specialty) where.specialty = { contains: specialty, mode: 'insensitive' };
  if (hospitalId) where.hospitalId = idSchema.parse(hospitalId);
  if (name) {
    where.OR = [
      { firstName: { contains: name, mode: 'insensitive' } },
      { lastName: { contains: name, mode: 'insensitive' } },
    ];
  }

  return await prisma.doctor.findMany({
    where,
    skip: Number(skip),
    take: Number(take),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      specialty: true,
      hospitalId: true,
      profilePicture: true,
      createdAt: true,
      hospital: {
        select: {
          id: true,
          name: true,
          address: true,
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
  const doctor = await prisma.doctor.findUnique({
    where: { id: validatedId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
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
    throw new Error('Doctor not found');
  }

  return doctor;
};

export const createDoctor = async (data) => {
  const validatedData = doctorSchema.parse(data);
  const { hospitalId } = validatedData;

  const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
  if (!hospital) throw new Error('Hospital not found');

  return await prisma.doctor.create({
    data: {
      ...validatedData,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      specialty: true,
      hospitalId: true,
      profilePicture: true,
      createdAt: true,
    },
  });
};

export const updateDoctor = async (id, data) => {
  const validatedId = idSchema.parse(id);
  const validatedData = doctorSchema.partial().parse(data); // Allow partial updates

  if (validatedData.hospitalId) {
    const hospital = await prisma.hospital.findUnique({ where: { id: validatedData.hospitalId } });
    if (!hospital) throw new Error('Hospital not found');
  }

  try {
    return await prisma.doctor.update({
      where: { id: validatedId },
      data: validatedData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialty: true,
        hospitalId: true,
        profilePicture: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new Error('Doctor not found');
    }
    throw err;
  }
};

export const deleteDoctor = async (id) => {
  const validatedId = idSchema.parse(id);

  // Check for associated appointments or availability
  const appointmentCount = await prisma.appointment.count({
    where: { doctorId: validatedId, status: { in: ['PENDING', 'CONFIRMED'] } },
  });
  const availabilityCount = await prisma.availability.count({
    where: { doctorId: validatedId, status: 'AVAILABLE' },
  });

  if (appointmentCount > 0) {
    throw new Error('Cannot delete doctor with pending or confirmed appointments');
  }
  if (availabilityCount > 0) {
    throw new Error('Cannot delete doctor with available slots');
  }

  try {
    await prisma.doctor.delete({ where: { id: validatedId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new Error('Doctor not found');
    }
    throw err;
  }
};