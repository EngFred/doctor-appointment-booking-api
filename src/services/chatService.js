import prisma from '../config/database.js';
import { z } from 'zod';
import { messaging } from '../config/firebase.js';

const messageSchema = z.object({
  appointmentId: z.string().uuid('Invalid appointment ID'),
  content: z.string().min(1, 'Message content is required').max(1000, 'Message too long'),
});

export const createMessage = async (data, sender) => {
  const validatedData = messageSchema.parse(data);
  const { appointmentId, content } = validatedData;

  // Verify appointment and access
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      patientId: true,
      doctorId: true,
    },
  });

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  // Determine receiverId (doctor) based on sender
  let receiverId;
  if (sender.id === appointment.patientId) {
    receiverId = appointment.doctorId;
  } else if (sender.id === appointment.doctorId) {
    receiverId = appointment.patientId; // Doctor sends to patient
  } else {
    throw new Error('Unauthorized access');
  }

  // Ensure receiver is a valid doctor if sender is patient
  const receiver = sender.id === appointment.patientId
    ? await prisma.doctor.findUnique({ where: { id: receiverId } })
    : await prisma.user.findUnique({ where: { id: receiverId } });

  if (!receiver) {
    throw new Error('Receiver not found');
  }

  // Create message
  const message = await prisma.message.create({
    data: {
      appointmentId,
      senderId: sender.id,
      receiverId,
      content,
      messageType: 'TEXT',
      sentAt: new Date(),
    },
    select: {
      id: true,
      appointmentId: true,
      senderId: true,
      receiverId: true,
      content: true,
      messageType: true,
      sentAt: true,
      readAt: true,
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      receiver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Send FCM notification to receiver
  const receiverUser = await prisma.user.findUnique({
    where: { id: receiverId },
    select: { fcmToken: true, firstName: true, lastName: true },
  }) || await prisma.doctor.findUnique({
    where: { id: receiverId },
    select: { fcmToken: true, firstName: true, lastName: true },
  });

  if (receiverUser?.fcmToken) {
    await messaging.send({
      token: receiverUser.fcmToken,
      notification: {
        title: 'New Message',
        body: `You have a new message from ${sender.firstName} ${sender.lastName}.`,
      },
      data: {
        appointmentId,
        messageId: message.id,
      },
    });
  }

  return message;
};

export const getMessages = async ({ appointmentId, skip = 0, take = 50 }, user) => {
  const validatedAppointmentId = z.string().uuid('Invalid appointment ID').parse(appointmentId);

  // Verify appointment and access
  const appointment = await prisma.appointment.findUnique({
    where: { id: validatedAppointmentId },
    select: {
      id: true,
      patientId: true,
      doctorId: true,
    },
  });

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  if (user.id !== appointment.patientId && user.id !== appointment.doctorId) {
    throw new Error('Unauthorized access');
  }

  return await prisma.message.findMany({
    where: { appointmentId: validatedAppointmentId },
    skip: Number(skip),
    take: Number(take),
    orderBy: { sentAt: 'asc' },
    select: {
      id: true,
      appointmentId: true,
      senderId: true,
      receiverId: true,
      content: true,
      messageType: true,
      sentAt: true,
      readAt: true,
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      receiver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
};

export const updateMessageReadStatus = async (messageId, user) => {
  const validatedMessageId = z.string().uuid('Invalid message ID').parse(messageId);

  const message = await prisma.message.findUnique({
    where: { id: validatedMessageId },
    select: {
      id: true,
      receiverId: true,
      appointment: {
        select: {
          patientId: true,
          doctorId: true,
        },
      },
    },
  });

  if (!message) {
    throw new Error('Message not found');
  }

  if (
    user.id !== message.receiverId ||
    (user.id !== message.appointment.patientId && user.id !== message.appointment.doctorId)
  ) {
    throw new Error('Unauthorized access');
  }

  return await prisma.message.update({
    where: { id: validatedMessageId },
    data: { readAt: new Date() },
    select: {
      id: true,
      readAt: true,
    },
  });
};