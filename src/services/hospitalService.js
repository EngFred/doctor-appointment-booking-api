import prisma from '../config/database.js';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { uploadToCloudinary } from '../config/cloudinary.js';

// Validation schemas
const hospitalSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  address: z.string().min(1, { message: 'Address is required' }),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, { message: 'Invalid phone number format (E.164 expected, e.g., +256123456789)' }),
  image: z.string().url({ message: 'Invalid URL' }).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  about: z.string().optional(),
  services: z.array(z.string()).optional(),
  field: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email({ message: 'Invalid email' }).optional(),
  rating: z.number().min(0).max(5).optional(),
});

const idSchema = z.string().uuid({ message: 'Invalid UUID' });

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
      field: true,
      contactPhone: true,
      contactEmail: true,
      rating: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

// Other functions (getHospitals, getHospitalById, updateHospital, deleteHospital) remain unchanged
export const getHospitals = async ({ skip = 0, take = 10, name, services, latitude, longitude, field }) => {
  const where = {};
  if (name) where.name = { contains: name, mode: 'insensitive' };
  if (services) where.services = { hasSome: Array.isArray(services) ? services : services.split(',') };
  if (latitude && longitude) {
    where.latitude = { gte: latitude - 0.1, lte: latitude + 0.1 };
    where.longitude = { gte: longitude - 0.1, lte: longitude + 0.1 };
  }
  if (field) where.field = { contains: field, mode: 'insensitive' };

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
      field: true,
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
      field: true,
      contactPhone: true,
      contactEmail: true,
      rating: true,
      createdAt: true,
      updatedAt: true,
      doctors: {
        where: { role: 'DOCTOR' },
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
        field: true,
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
    const doctorCount = await prisma.user.count({ where: { hospitalId: validatedId, role: 'DOCTOR' } });
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