import prisma from '../config/database.js';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Validation schemas
const sendMessageSchema = z.object({
  receiverId: z.string().uuid({ message: 'Invalid receiver ID' }),
  appointmentId: z.string().uuid({ message: 'Invalid appointment ID' }).optional(),
  content: z.string().min(1, { message: 'Message content is required' }).max(2000, { message: 'Message too long' }),
  type: z.enum(['TEXT', 'IMAGE', 'FILE']).default('TEXT'),
});

const idSchema = z.string().uuid({ message: 'Invalid UUID' });

const updateStatusSchema = z.object({
  status: z.enum(['SENT', 'DELIVERED', 'READ'], { message: 'Invalid status' }),
});

export const sendMessage = async (data, user, log) => {
  try {
    const validatedData = sendMessageSchema.parse(data);
    const { receiverId, appointmentId, content, type } = validatedData;

    if (receiverId === user.id) {
      const error = new Error('Cannot send message to yourself');
      error.statusCode = 400;
      throw error;
    }

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true, role: true },
    });

    if (!receiver) {
      const error = new Error('Receiver not found');
      error.statusCode = 404;
      throw error;
    }

    if (appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { id: true, patientId: true, doctorId: true },
      });

      if (!appointment) {
        const error = new Error('Appointment not found');
        error.statusCode = 404;
        throw error;
      }

      if (
        user.role !== 'SUPER_ADMIN' &&
        user.id !== appointment.patientId &&
        user.id !== appointment.doctorId
      ) {
        const error = new Error('Unauthorized: Not part of this appointment');
        error.statusCode = 403;
        throw error;
      }

      if (
        receiver.id !== appointment.patientId &&
        receiver.id !== appointment.doctorId
      ) {
        const error = new Error('Receiver is not part of this appointment');
        error.statusCode = 400;
        throw error;
      }
    }

    const message = await prisma.message.create({
      data: {
        senderId: user.id,
        receiverId,
        appointmentId,
        content,
        type,
        status: 'SENT',
      },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        appointmentId: true,
        content: true,
        type: true,
        status: true,
        createdAt: true,
      },
    });

    log.info(`Message ${message.id} sent by user ${user.id} to ${receiverId}`);
    return message;
  } catch (err) {
    log.error(`Failed to send message: ${err.message}`);
    throw err;
  }
};

export const getMessages = async ({ skip = 0, take = 20, appointmentId, receiverId }, user, log) => {
  try {
    const validatedParams = z
      .object({
        skip: z.coerce.number().int().min(0, { message: 'Skip must be non-negative' }).optional(),
        take: z.coerce.number().int().min(1, { message: 'Take must be positive' }).optional(),
        appointmentId: z.string().uuid().optional(),
        receiverId: z.string().uuid().optional(),
      })
      .parse({ skip, take, appointmentId, receiverId });

    const where = {
      OR: [
        { senderId: user.id },
        { receiverId: user.id },
        ...(user.role === 'SUPER_ADMIN' ? [{ id: { not: null } }] : []),
      ],
      ...(validatedParams.appointmentId ? { appointmentId: validatedParams.appointmentId } : {}),
      ...(validatedParams.receiverId
        ? {
            OR: [
              { senderId: validatedParams.receiverId, receiverId: user.id },
              { senderId: user.id, receiverId: validatedParams.receiverId },
            ],
          }
        : {}),
    };

    const messages = await prisma.message.findMany({
      where,
      skip: Number(validatedParams.skip),
      take: Number(validatedParams.take),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        appointmentId: true,
        content: true,
        type: true,
        status: true,
        createdAt: true,
        sender: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        receiver: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        appointment: {
          select: { id: true, scheduledAt: true },
        },
      },
    });

    log.info(`Fetched ${messages.length} messages for user ${user.id}`);
    return messages;
  } catch (err) {
    log.error(`Failed to fetch messages: ${err.message}`);
    throw err;
  }
};

export const getMessageById = async (id, user, log) => {
  try {
    const validatedId = idSchema.parse(id);

    const message = await prisma.message.findUnique({
      where: { id: validatedId },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        appointmentId: true,
        content: true,
        type: true,
        status: true,
        createdAt: true,
        sender: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        receiver: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        appointment: {
          select: { id: true, scheduledAt: true },
        },
      },
    });

    if (!message) {
      const error = new Error('Message not found');
      error.statusCode = 404;
      throw error;
    }

    if (
      user.role !== 'SUPER_ADMIN' &&
      user.id !== message.senderId &&
      user.id !== message.receiverId
    ) {
      const error = new Error('Unauthorized access');
      error.statusCode = 403;
      throw error;
    }

    log.info(`Fetched message ${id} for user ${user.id}`);
    return message;
  } catch (err) {
    log.error(`Failed to fetch message ${id}: ${err.message}`);
    throw err;
  }
};

export const updateMessageStatus = async (id, status, user, log) => {
  try {
    const validatedData = updateStatusSchema.parse({ status });
    const validatedId = idSchema.parse(id);

    const message = await prisma.message.findUnique({
      where: { id: validatedId },
      select: { id: true, senderId: true, receiverId: true, status: true },
    });

    if (!message) {
      const error = new Error('Message not found');
      error.statusCode = 404;
      throw error;
    }

    if (user.role !== 'SUPER_ADMIN' && user.id !== message.receiverId) {
      const error = new Error('Unauthorized: Only receiver can update message status');
      error.statusCode = 403;
      throw error;
    }

    if (message.status === validatedData.status) {
      log.info(`Message ${id} already has status ${status} for user ${user.id}`);
      return message;
    }

    const updatedMessage = await prisma.message.update({
      where: { id: validatedId },
      data: { status: validatedData.status },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    log.info(`Updated message ${id} status to ${status} for user ${user.id}`);
    return updatedMessage;
  } catch (err) {
    log.error(`Failed to update message ${id} status: ${err.message}`);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      const error = new Error('Message not found');
      error.statusCode = 404;
      throw error;
    }
    throw err;
  }
};

export const deleteMessage = async (id, user, log) => {
  try {
    const validatedId = idSchema.parse(id);

    const message = await prisma.message.findUnique({
      where: { id: validatedId },
      select: { id: true, senderId: true, receiverId: true },
    });

    if (!message) {
      const error = new Error('Message not found');
      error.statusCode = 404;
      throw error;
    }

    if (
      user.role !== 'SUPER_ADMIN' &&
      user.id !== message.senderId &&
      user.id !== message.receiverId
    ) {
      const error = new Error('Unauthorized: Only sender, receiver, or Super Admin can delete message');
      error.statusCode = 403;
      throw error;
    }

    await prisma.message.delete({
      where: { id: validatedId },
    });

    log.info(`Deleted message ${id} by user ${user.id}`);
    return { id: validatedId, status: 'deleted' };
  } catch (err) {
    log.error(`Failed to delete message ${id}: ${err.message}`);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      const error = new Error('Message not found');
      error.statusCode = 404;
      throw error;
    }
    throw err;
  }
};