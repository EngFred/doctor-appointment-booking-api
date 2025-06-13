import prisma from '../config/database.js';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Validation schemas
const availabilitySchema = z.object({
  doctorId: z.string().uuid({ message: 'Invalid doctor ID' }),
  startTime: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid start time' })
    .refine((val) => new Date(val) > new Date(), { message: 'Start time must be in the future' }),
  endTime: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid end time' }),
  status: z.enum(['AVAILABLE', 'BOOKED'], { message: 'Invalid status' }).optional(),
}).refine((data) => new Date(data.startTime) < new Date(data.endTime), {
  message: 'Start time must be before end time',
  path: ['endTime'],
});

const idSchema = z.string().uuid({ message: 'Invalid UUID' });

export const getAvailabilities = async ({ skip = 0, take = 10, doctorId, status, startTime, endTime }, log) => {
  try {
    const where = {};
    if (doctorId) {
      where.doctorId = idSchema.parse(doctorId);
      // Ensure doctorId belongs to a DOCTOR
      const doctor = await prisma.user.findUnique({
        where: { id: doctorId, role: 'DOCTOR' },
        select: { id: true },
      });
      if (!doctor) {
        const error = new Error('Doctor not found');
        error.statusCode = 404;
        throw error;
      }
    }
    if (status) where.status = status;
    if (startTime && endTime) {
      where.startTime = { gte: new Date(startTime) };
      where.endTime = { lte: new Date(endTime) };
    } else if (startTime) {
      where.startTime = { gte: new Date(startTime) };
    }

    const availabilities = await prisma.availability.findMany({
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
            email: true,
            specialty: true,
          },
        },
      },
    });

    log.info(`Fetched ${availabilities.length} availabilities with filters: ${JSON.stringify({ skip, take, doctorId, status, startTime, endTime })}`);
    return availabilities;
  } catch (err) {
    log.error(`Failed to fetch availabilities: ${err.message}`);
    throw err;
  }
};

export const getMyAvailabilities = async (doctorId, { skip = 0, take = 10, status, startTime, endTime }, log) => {
  try {
    const where = { doctorId: idSchema.parse(doctorId) };
    if (status) where.status = status;
    if (startTime && endTime) {
      where.startTime = { gte: new Date(startTime) };
      where.endTime = { lte: new Date(endTime) };
    } else if (startTime) {
      where.startTime = { gte: new Date(startTime) };
    }

    const availabilities = await prisma.availability.findMany({
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
      },
    });

    log.info(`Fetched ${availabilities.length} availabilities for doctor ${doctorId} with filters: ${JSON.stringify({ skip, take, status, startTime, endTime })}`);
    return availabilities;
  } catch (err) {
    log.error(`Failed to fetch availabilities for doctor ${doctorId}: ${err.message}`);
    throw err;
  }
};

export const getAvailabilityById = async (id, log) => {
  try {
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
            email: true,
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
      const error = new Error('Availability not found');
      error.statusCode = 404;
      throw error;
    }

    // Ensure doctor is a DOCTOR
    const doctor = await prisma.user.findUnique({
      where: { id: availability.doctorId, role: 'DOCTOR' },
      select: { id: true },
    });
    if (!doctor) {
      const error = new Error('Doctor not found');
      error.statusCode = 404;
      throw error;
    }

    log.info(`Fetched availability ${id}`);
    return availability;
  } catch (err) {
    log.error(`Failed to fetch availability ${id}: ${err.message}`);
    throw err;
  }
};

export const createAvailability = async (data, userId, log) => {
  try {
    const validatedData = availabilitySchema.parse(data);
    const { doctorId, startTime, endTime, status } = validatedData;

    if (doctorId !== userId) {
      const error = new Error('Unauthorized: Can only create availability for yourself');
      error.statusCode = 403;
      throw error;
    }

    const doctor = await prisma.user.findUnique({ where: { id: doctorId, role: 'DOCTOR' } });
    if (!doctor) {
      const error = new Error('Doctor not found');
      error.statusCode = 404;
      throw error;
    }

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
      const error = new Error('Availability slot overlaps with existing slot');
      error.statusCode = 400;
      throw error;
    }

    const availability = await prisma.availability.create({
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

    log.info(`Created availability ${availability.id} for doctor ${doctorId}`);
    return availability;
  } catch (err) {
    log.error(`Failed to create availability for doctor ${userId}: ${err.message}`);
    throw err;
  }
};

export const updateAvailability = async (id, data, userId, log) => {
  try {
    const validatedId = idSchema.parse(id);
    const validatedData = availabilitySchema.partial().parse(data);

    const existing = await prisma.availability.findUnique({ where: { id: validatedId } });
    if (!existing) {
      const error = new Error('Availability not found');
      error.statusCode = 404;
      throw error;
    }

    if (existing.doctorId !== userId) {
      const error = new Error('Unauthorized: Can only update your own availability');
      error.statusCode = 403;
      throw error;
    }

    if (validatedData.startTime && validatedData.endTime) {
      if (new Date(validatedData.startTime) >= new Date(validatedData.endTime)) {
        const error = new Error('Start time must be before end time');
        error.statusCode = 400;
        throw error;
      }
    }

    if (validatedData.doctorId && validatedData.doctorId !== userId) {
      const error = new Error('Unauthorized: Cannot change doctor ID');
      error.statusCode = 403;
      throw error;
    }

    // Check for overlapping slots if updating times
    if (validatedData.startTime || validatedData.endTime) {
      const startTime = validatedData.startTime ? new Date(validatedData.startTime) : existing.startTime;
      const endTime = validatedData.endTime ? new Date(validatedData.endTime) : existing.endTime;

      const overlapping = await prisma.availability.count({
        where: {
          doctorId: existing.doctorId,
          id: { not: validatedId },
          OR: [
            { startTime: { lte: endTime, gte: startTime } },
            { endTime: { lte: endTime, gte: startTime } },
            { startTime: { lte: startTime }, endTime: { gte: endTime } },
          ],
        },
      });

      if (overlapping > 0) {
        const error = new Error('Availability slot overlaps with existing slot');
        error.statusCode = 400;
        throw error;
      }
    }

    const availability = await prisma.availability.update({
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

    log.info(`Updated availability ${id} for doctor ${userId}`);
    return availability;
  } catch (err) {
    log.error(`Failed to update availability ${id}: ${err.message}`);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      const error = new Error('Availability not found');
      error.statusCode = 404;
      throw error;
    }
    throw err;
  }
};

export const deleteAvailability = async (id, userId, log) => {
  try {
    const validatedId = idSchema.parse(id);

    const availability = await prisma.availability.findUnique({
      where: { id: validatedId },
      include: { appointment: true },
    });

    if (!availability) {
      const error = new Error('Availability not found');
      error.statusCode = 404;
      throw error;
    }

    if (availability.doctorId !== userId) {
      const error = new Error('Unauthorized: Can only delete your own availability');
      error.statusCode = 403;
      throw error;
    }

    if (availability.appointment) {
      const error = new Error('Cannot delete availability slot linked to an appointment');
      error.statusCode = 400;
      throw error;
    }

    await prisma.availability.delete({ where: { id: validatedId } });
    log.info(`Deleted availability ${id} for doctor ${userId}`);
    return { message: 'Availability deleted successfully' };
  } catch (err) {
    log.error(`Failed to delete availability ${id}: ${err.message}`);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      const error = new Error('Availability not found');
      error.statusCode = 404;
      throw error;
    }
    throw err;
  }
};