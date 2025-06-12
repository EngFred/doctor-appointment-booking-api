import prisma from '../config/database.js';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Validation schemas
const availabilitySchema = z.object({
  doctorId: z.string().uuid('Invalid doctor ID'),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid start time' }).refine(
    (val) => new Date(val) > new Date(),
    { message: 'Start time must be in the future' },
  ),
  endTime: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid end time' }),
  status: z.enum(['AVAILABLE', 'BOOKED']).optional(),
}).refine((data) => new Date(data.startTime) < new Date(data.endTime), {
  message: 'Start time must be before end time',
  path: ['endTime'],
});

const idSchema = z.string().uuid('Invalid UUID');

export const getAvailabilities = async ({ skip = 0, take = 10, doctorId, status, startTime, endTime }) => {
  const where = {};
  if (doctorId) where.doctorId = idSchema.parse(doctorId);
  if (status) where.status = status;
  if (startTime && endTime) {
    where.startTime = { gte: new Date(startTime) };
    where.endTime = { lte: new Date(endTime) };
  } else if (startTime) {
    where.startTime = { gte: new Date(startTime) };
  }

  return await prisma.availability.findMany({
    where,
    skip: Number(skip),
    take: Number(take),
    orderBy: { startTime: 'asc' },
    select: {
      id: true,
      doctorId: true,
      startTime: true,
      endTime: true,
      status: true,
      createdAt: true,
      doctor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          specialty: true,
        },
      },
    },
  });
};

export const getAvailabilityById = async (id) => {
  const validatedId = idSchema.parse(id);
  const availability = await prisma.availability.findUnique({
    where: { id: validatedId },
    select: {
      id: true,
      doctorId: true,
      startTime: true,
      endTime: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      doctor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          specialty: true,
        },
      },
      appointment: {
        select: {
          id: true,
          scheduledAt: true,
          status: true,
        },
      },
    },
  });

  if (!availability) {
    throw new Error('Availability not found');
  }

  return availability;
};

export const createAvailability = async (data) => {
  const validatedData = availabilitySchema.parse(data);
  const { doctorId, startTime, endTime, status } = validatedData;

  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) throw new Error('Doctor not found');

  // Check for overlapping slots
  const overlapping = await prisma.availability.count({
    where: {
      doctorId,
      OR: [
        { startTime: { lte: new Date(endTime), gte: new Date(startTime) } },
        { endTime: { lte: new Date(endTime), gte: new Date(startTime) } },
        { startTime: { lte: new Date(startTime) }, endTime: { gte: new Date(endTime) } },
      ],
    },
  });

  if (overlapping > 0) {
    throw new Error('Availability slot overlaps with existing slot');
  }

  return await prisma.availability.create({
    data: {
      doctorId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status: status || 'AVAILABLE',
    },
    select: {
      id: true,
      doctorId: true,
      startTime: true,
      endTime: true,
      status: true,
      createdAt: true,
    },
  });
};

export const updateAvailability = async (id, data) => {
  const validatedId = idSchema.parse(id);
  const validatedData = availabilitySchema.partial().parse(data);

  if (validatedData.startTime && validatedData.endTime) {
    if (new Date(validatedData.startTime) >= new Date(validatedData.endTime)) {
      throw new Error('Start time must be before end time');
    }
  }

  if (validatedData.doctorId) {
    const doctor = await prisma.doctor.findUnique({ where: { id: validatedData.doctorId } });
    if (!doctor) throw new Error('Doctor not found');
  }

  // Check for overlapping slots if updating times
  if (validatedData.startTime || validatedData.endTime) {
    const existing = await prisma.availability.findUnique({ where: { id: validatedId } });
    if (!existing) throw new Error('Availability not found');

    const startTime = validatedData.startTime ? new Date(validatedData.startTime) : existing.startTime;
    const endTime = validatedData.endTime ? new Date(validatedData.endTime) : existing.endTime;

    const overlapping = await prisma.availability.count({
      where: {
        doctorId: validatedData.doctorId || existing.doctorId,
        id: { not: validatedId },
        OR: [
          { startTime: { lte: endTime, gte: startTime } },
          { endTime: { lte: endTime, gte: startTime } },
          { startTime: { lte: startTime }, endTime: { gte: endTime } },
        ],
      },
    });

    if (overlapping > 0) {
      throw new Error('Availability slot overlaps with existing slot');
    }
  }

  try {
    return await prisma.availability.update({
      where: { id: validatedId },
      data: {
        ...validatedData,
        startTime: validatedData.startTime ? new Date(validatedData.startTime) : undefined,
        endTime: validatedData.endTime ? new Date(validatedData.endTime) : undefined,
      },
      select: {
        id: true,
        doctorId: true,
        startTime: true,
        endTime: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new Error('Availability not found');
    }
    throw err;
  }
};

export const deleteAvailability = async (id) => {
  const validatedId = idSchema.parse(id);

  // Check if slot is booked
  const availability = await prisma.availability.findUnique({
    where: { id: validatedId },
    include: { appointment: true },
  });

  if (!availability) {
    throw new Error('Availability not found');
  }

  if (availability.appointment) {
    throw new Error('Cannot delete availability slot linked to an appointment');
  }

  try {
    await prisma.availability.delete({ where: { id: validatedId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new Error('Availability not found');
    }
    throw err;
  }
};