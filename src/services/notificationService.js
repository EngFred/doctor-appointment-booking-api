import prisma from '../config/database.js';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Validation schemas
const idSchema = z.string().uuid({ message: 'Invalid UUID' });

const getNotificationsSchema = z.object({
  skip: z.coerce
    .number()
    .int()
    .nonnegative({ message: 'Skip must be a non-negative number' })
    .optional(),
  take: z.coerce
    .number()
    .int()
    .positive({ message: 'Take must be a positive number' })
    .optional(),
  status: z.enum(['PENDING', 'SENT', 'FAILED']).optional(),
  notificationType: z
    .enum([
      'APPOINTMENT_BOOKED',
      'APPOINTMENT_CONFIRMED',
      'APPOINTMENT_CANCELLED',
      'APPOINTMENT_COMPLETED',
      'PAYMENT_SUCCESS',
      'PAYMENT_FAILED',
    ])
    .optional(),
});

export const getNotifications = async ({ skip = 0, take = 10, status, notificationType }, user, log) => {
  try {
    const validatedParams = getNotificationsSchema.parse({ skip, take, status, notificationType });

    const where = {
      ...(user.role !== 'SUPER_ADMIN' ? { recipientId: user.id } : {}),
      ...(validatedParams.status ? { status: validatedParams.status } : {}),
      ...(validatedParams.notificationType ? { notificationType: validatedParams.notificationType } : {}),
    };

    const notifications = await prisma.notification.findMany({
      where,
      skip: Number(validatedParams.skip),
      take: Number(validatedParams.take),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        recipientId: true,
        title: true,
        body: true,
        notificationType: true,
        status: true,
        sentAt: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    log.info(`Fetched ${notifications.length} notifications for user ${user.id} with filters: ${JSON.stringify(validatedParams)}`);
    return notifications;
  } catch (err) {
    log.error(`Failed to fetch notifications for user ${user.id}: ${err.message}`);
    throw err;
  }
};

export const getNotificationById = async (id, user, log) => {
  try {
    const validatedId = idSchema.parse(id);

    const notification = await prisma.notification.findUnique({
      where: { id: validatedId },
      select: {
        id: true,
        recipientId: true,
        title: true,
        body: true,
        notificationType: true,
        status: true,
        sentAt: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!notification) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }

    if (user.role !== 'SUPER_ADMIN' && user.id !== notification.recipientId) {
      const error = new Error('Unauthorized access');
      error.statusCode = 403;
      throw error;
    }

    log.info(`Fetched notification ${id} for user ${user.id}`);
    return notification;
  } catch (err) {
    log.error(`Failed to fetch notification ${id}: ${err.message}`);
    throw err;
  }
};

export const markNotificationAsRead = async (id, user, log) => {
  try {
    const validatedId = idSchema.parse(id);

    const notification = await prisma.notification.findUnique({
      where: { id: validatedId },
      select: { id: true, recipientId: true, status: true },
    });

    if (!notification) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }

    if (user.role !== 'SUPER_ADMIN' && user.id !== notification.recipientId) {
      const error = new Error('Unauthorized access');
      error.statusCode = 403;
      throw error;
    }

    if (notification.status === 'SENT') {
      log.info(`Notification ${id} already marked as read for user ${user.id}`);
      return { id: notification.id, status: notification.status };
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: validatedId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        sentAt: true,
        updatedAt: true,
      },
    });

    log.info(`Marked notification ${id} as read for user ${user.id}`);
    return updatedNotification;
  } catch (err) {
    log.error(`Failed to mark notification ${id} as read: ${err.message}`);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }
    throw err;
  }
};

export const deleteNotification = async (id, user, log) => {
  try {
    const validatedId = idSchema.parse(id);

    const notification = await prisma.notification.findUnique({
      where: { id: validatedId },
      select: { id: true, recipientId: true },
    });

    if (!notification) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }

    if (user.role !== 'SUPER_ADMIN' && user.id !== notification.recipientId) {
      const error = new Error('Unauthorized access');
      error.statusCode = 403;
      throw error;
    }

    await prisma.notification.delete({
      where: { id: validatedId },
    });

    log.info(`Deleted notification ${id} for user ${user.id}`);
    return { id: validatedId, status: 'deleted' };
  } catch (err) {
    log.error(`Failed to delete notification ${id}: ${err.message}`);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }
    throw err;
  }
};