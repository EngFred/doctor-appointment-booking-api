import prisma from '../config/database.js';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { uploadToCloudinary } from '../config/cloudinary.js';

// Validation schemas
const hospitalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().min(1, 'Phone is required'),
  image: z.string().url().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  about: z.string().optional(),
  services: z.array(z.string()).optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  rating: z.number().min(0).max(5).optional(),
  metadata: z.record(z.any()).optional(),
});

const idSchema = z.string().uuid('Invalid UUID');

export const createHospital = async (data, file) => {
  const validatedData = hospitalSchema.parse(data);

  let image = null;
  if (file) {
    image = await uploadToCloudinary(file.buffer, file.originalname, 'hospitals', 'hospital');
  }

  return await prisma.hospital.create({
    data: {
      ...validatedData,
      image,
      metadata: validatedData.metadata || {},
    },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      image: true,
      latitude: true,
      longitude: true,
      about: true,
      services: true,
      contactPhone: true,
      contactEmail: true,
      rating: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const getHospitals = async ({ skip = 0, take = 10, name, services, latitude, longitude }) => {
  const where = {};
  if (name) where.name = { contains: name, mode: 'insensitive' };
  if (services) where.services = { hasSome: services };
  if (latitude && longitude) {
    where.latitude = { gte: latitude - 0.1, lte: latitude + 0.1 };
    where.longitude = { gte: longitude - 0.1, lte: longitude + 0.1 };
  }

  return await prisma.hospital.findMany({
    where,
    skip: Number(skip),
    take: Number(take),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      image: true,
      latitude: true,
      longitude: true,
      about: true,
      services: true,
      contactPhone: true,
      contactEmail: true,
      rating: true,
      createdAt: true,
    },
  });
};

export const getHospitalById = async (id) => {
  const validatedId = idSchema.parse(id);
  const hospital = await prisma.hospital.findUnique({
    where: { id: validatedId },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      image: true,
      latitude: true,
      longitude: true,
      about: true,
      services: true,
      contactPhone: true,
      contactEmail: true,
      rating: true,
      createdAt: true,
      updatedAt: true,
      doctors: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          specialty: true,
        },
      },
    },
  });

  if (!hospital) {
    const error = new Error('Hospital not found');
    error.statusCode = 404;
    throw error;
  }

  return hospital;
};

export const updateHospital = async (id, data, file) => {
  const validatedId = idSchema.parse(id);
  const validatedData = hospitalSchema.partial().parse(data);

  if (file) {
    validatedData.image = await uploadToCloudinary(file.buffer, file.originalname, 'hospitals', 'hospital');
  }

  try {
    return await prisma.hospital.update({
      where: { id: validatedId },
      data: validatedData,
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        image: true,
        latitude: true,
        longitude: true,
        about: true,
        services: true,
        contactPhone: true,
        contactEmail: true,
        rating: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      const error = new Error('Hospital not found');
      error.statusCode = 404;
      throw error;
    }
    throw err;
  }
};

export const deleteHospital = async (id) => {
  const validatedId = idSchema.parse(id);
  try {
    const doctorCount = await prisma.doctor.count({ where: { hospitalId: validatedId } });
    if (doctorCount > 0) {
      const error = new Error('Cannot delete hospital with associated doctors');
      error.statusCode = 400;
      throw error;
    }
    await prisma.hospital.delete({ where: { id: validatedId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      const error = new Error('Hospital not found');
      error.statusCode = 404;
      throw error;
    }
    throw err;
  }
};