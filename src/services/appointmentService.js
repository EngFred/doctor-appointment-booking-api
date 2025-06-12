import prisma from '../config/database.js';
import { z } from 'zod';
import { messaging } from '../config/firebase.js';
import pkg from 'agora-access-token';
const { RtcTokenBuilder, RtcRole } = pkg;
import { v4 as uuidv4 } from 'uuid';

// Validation schemas
const initiateAppointmentSchema = z.object({
  doctorId: z.string().uuid('Invalid doctor ID'),
  availabilityId: z.string().uuid('Invalid availability ID'),
  type: z.enum(['IN_PERSON', 'VIRTUAL'], { message: 'Invalid appointment type' }),
  consultationType: z
    .enum(['VIDEO', 'AUDIO', 'TEXT'], { message: 'Invalid consultation type' })
    .optional(),
  duration: z.number().int().positive('Duration must be a positive integer').optional(),
});

const idSchema = z.string().uuid('Invalid UUID');

const cancelAppointmentSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required').optional(),
});

const sendMessageSchema = z.object({
  appointmentId: z.string().uuid('Invalid appointment ID'),
  content: z.string().min(1, 'Message content is required').max(1000, 'Message too long'),
});

const getMessagesSchema = z.object({
  appointmentId: z.string().uuid('Invalid appointment ID'),
  skip: z.number().int().nonnegative('Skip must be a non-negative integer').optional().default(0),
  take: z
    .number()
    .int()
    .positive('Take must be a positive integer')
    .max(100, 'Take cannot exceed 100')
    .optional()
    .default(20),
});

export const initiateAppointment = async (data, user, log) => {
  if (user.role !== 'PATIENT') {
    throw new Error('Only patients can initiate appointments');
  }

  const validatedData = initiateAppointmentSchema.parse(data);
  const { doctorId, availabilityId, type, consultationType, duration } = validatedData;

  if (type === 'VIRTUAL' && !consultationType) {
    throw new Error('Consultation type is required for virtual appointments');
  }

  try {
    const doctor = await prisma.doctor.findFirst({
      where: { id: doctorId },
      select: { id: true, firstName: true, lastName: true, metadata: true },
    });

    if (!doctor) {
      throw new Error('Doctor not found');
    }

    const availability = await prisma.availability.findFirst({
      where: { id: availabilityId },
      select: { id: true, startTime: true, endTime: true, status: true, doctorId: true },
    });

    if (!availability) {
      throw new Error('Availability not found');
    }

    if (availability.status !== 'AVAILABLE') {
      throw new Error('Availability slot is not available');
    }

    if (availability.doctorId !== doctorId) {
      throw new Error('Availability does not belong to the specified doctor');
    }

    if (new Date(availability.startTime) <= new Date()) {
      throw new Error('Cannot book past or current slots');
    }

    return await prisma.$transaction(async (tx) => {
      const sessionId = type === 'VIRTUAL' ? uuidv4() : null;

      const appointment = await tx.appointment.create({
        data: {
          patientId: user.id,
          doctorId,
          availabilityId,
          scheduledAt: availability.startTime,
          type,
          consultationType: type === 'VIRTUAL' ? consultationType : null,
          status: 'PENDING',
          sessionId,
          duration: type === 'VIRTUAL' ? duration || 30 : null,
        },
      });

      await tx.availability.update({
        where: { id: availabilityId },
        data: { status: 'BOOKED' },
      });

      const patientFcmToken = user.metadata?.fcmToken;
      const doctorFcmToken = doctor.metadata?.fcmToken;

      if (patientFcmToken) {
        await messaging.send({
          token: patientFcmToken,
          notification: {
            title: 'Appointment Booked',
            body: `Your ${type.toLowerCase()} appointment with Dr. ${doctor.firstName} ${doctor.lastName} is pending confirmation.`,
          },
          data: { appointmentId: appointment.id },
        });
      }

      if (doctorFcmToken) {
        await messaging.send({
          token: doctorFcmToken,
          notification: {
            title: 'New Appointment',
            body: `${user.firstName} ${user.lastName} booked a ${type.toLowerCase()} appointment with you.`,
          },
          data: { appointmentId: appointment.id },
        });
      }

      const admins = await tx.user.findMany({
        where: { role: 'ADMIN' },
        select: { metadata: true },
      });

      for (const admin of admins) {
        const adminFcmToken = admin.metadata?.fcmToken;
        if (adminFcmToken) {
          await messaging.send({
            token: adminFcmToken,
            notification: {
              title: 'New Appointment',
              body: `${user.firstName} ${user.lastName} booked a ${type.toLowerCase()} appointment with Dr. ${doctor.firstName} ${doctor.lastName}.`,
            },
            data: { appointmentId: appointment.id },
          });
        }
      }

      log.info(`Appointment ${appointment.id} initiated for patient ${user.id}`);
      return appointment;
    });
  } catch (err) {
    console.log(`Error initiating appointment: ${err.message}`);
    log.error(`Failed to initiate appointment: ${err.message}`);
    throw err;
  }
};

export const getAppointments = async ({ skip = 0, take = 10, status, doctorId }, user, logger) => {
  try {
    const where = {
      OR: [
        { patientId: user.id },
        { doctorId: user.id },
        ...(user.role === 'ADMIN' ? [{ id: { not: null } }] : []),
      ],
    };

    if (status) where.status = status;
    if (doctorId) where.doctorId = idSchema.parse(doctorId);

    const appointments = await prisma.appointment.findMany({
      where,
      skip: Number(skip),
      take: Number(take),
      orderBy: { scheduledAt: 'asc' },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        availabilityId: true,
        scheduledAt: true,
        type: true,
        consultationType: true,
        status: true,
        sessionId: true,
        duration: true,
        createdAt: true,
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        doctor: {
          select: { id: true, firstName: true, lastName: true, specialty: true },
        },
        availability: {
          select: { id: true, startTime: true, endTime: true },
        },
      },
    });

    logger.info(`Fetched ${appointments.length} appointments for user ${user.id}`);
    return appointments;
  } catch (err) {
    logger.error(`Failed to fetch appointments: ${err.message}`);
    throw err;
  }
};

export const getAppointmentById = async (id, user, logger) => {
  try {
    const validatedId = idSchema.parse(id);
    const appointment = await prisma.appointment.findUnique({
      where: { id: validatedId },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        availabilityId: true,
        scheduledAt: true,
        type: true,
        consultationType: true,
        status: true,
        sessionId: true,
        duration: true,
        createdAt: true,
        updatedAt: true,
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        doctor: {
          select: { id: true, firstName: true, lastName: true, specialty: true },
        },
        availability: {
          select: { id: true, startTime: true, endTime: true },
        },
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (
      user.role !== 'ADMIN' &&
      user.id !== appointment.patientId &&
      user.id !== appointment.doctorId
    ) {
      throw new Error('Unauthorized access');
    }

    logger.info(`Fetched appointment ${id} for user ${user.id}`);
    return appointment;
  } catch (err) {
    logger.error(`Failed to fetch appointment ${id}: ${err.message}`);
    throw err;
  }
};

export const cancelAppointment = async (id, user, reason, logger) => {
  try {
    const validatedId = idSchema.parse(id);
    const validatedReason = cancelAppointmentSchema.parse({ reason });

    const appointment = await prisma.appointment.findUnique({
      where: { id: validatedId },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        availabilityId: true,
        scheduledAt: true,
        type: true,
        status: true,
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (user.role !== 'ADMIN' && user.id !== appointment.patientId) {
      throw new Error('Unauthorized access');
    }

    if (appointment.status !== 'PENDING' && appointment.status !== 'CONFIRMED') {
      throw new Error('Only pending or confirmed appointments can be cancelled');
    }

    const now = new Date();
    const cancellationWindow = new Date(appointment.scheduledAt);
    cancellationWindow.setHours(cancellationWindow.getHours() - 24);
    if (now > cancellationWindow) {
      throw new Error('Cancellation window closed 24 hours before appointment');
    }

    return await prisma.$transaction(async (tx) => {
      const updatedAppointment = await tx.appointment.update({
        where: { id: validatedId },
        data: {
          status: 'CANCELLED',
          metadata: { cancellationReason: reason },
        },
      });

      await tx.availability.update({
        where: { id: appointment.availabilityId },
        data: { status: 'AVAILABLE' },
      });

      const patient = await tx.user.findUnique({
        where: { id: appointment.patientId },
        select: { metadata: true, firstName: true, lastName: true },
      });
      const doctor = await tx.doctor.findUnique({
        where: { id: appointment.doctorId },
        select: { id: true, firstName: true, lastName: true, metadata: true },
      });

      const patientFcmToken = patient?.metadata?.fcmToken;
      const doctorFcmToken = doctor?.metadata?.fcmToken;

      if (patientFcmToken) {
        await messaging.send({
          token: patientFcmToken,
          notification: {
            title: 'Appointment Cancelled',
            body: `Your ${appointment.type.toLowerCase()} appointment with Dr. ${doctor.firstName} ${doctor.lastName} has been cancelled.`,
          },
          data: { appointmentId: id },
        });
      }

      if (doctorFcmToken) {
        await messaging.send({
          token: doctorFcmToken,
          notification: {
            title: 'Appointment Cancelled',
            body: `${patient.firstName} ${patient.lastName} cancelled their ${appointment.type.toLowerCase()} appointment with you.`,
          },
          data: { appointmentId: id },
        });
      }

      const admins = await tx.user.findMany({
        where: { role: 'ADMIN' },
        select: { metadata: true },
      });

      for (const admin of admins) {
        const adminFcmToken = admin.metadata?.fcmToken;
        if (adminFcmToken) {
          await messaging.send({
            token: adminFcmToken,
            notification: {
              title: 'Appointment Cancelled',
              body: `${patient.firstName} ${patient.lastName} cancelled a ${appointment.type.toLowerCase()} appointment with Dr. ${doctor.firstName} ${doctor.lastName}.`,
            },
            data: { appointmentId: id },
          });
        }
      }

      logger.info(`Appointment ${id} cancelled by user ${user.id}`);
      return await tx.appointment.findUnique({
        where: { id: validatedId },
        select: { id: true, status: true, metadata: true },
      });
    });
  } catch (err) {
    logger.error(`Failed to cancel appointment ${id}: ${err.message}`);
    throw err;
  }
};

export const joinAppointment = async (id, user, logger) => {
  try {
    const validatedId = idSchema.parse(id);
    const appointment = await prisma.appointment.findUnique({
      where: { id: validatedId },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        status: true,
        type: true,
        consultationType: true,
        sessionId: true,
        scheduledAt: true,
        duration: true,
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (
      user.role !== 'ADMIN' &&
      user.id !== appointment.patientId &&
      user.id !== appointment.doctorId
    ) {
      throw new Error('Unauthorized access');
    }

    if (appointment.status !== 'CONFIRMED') {
      throw new Error('Appointment is not confirmed');
    }

    const now = new Date();
    const startTime = new Date(appointment.scheduledAt);
    const endTime = new Date(startTime.getTime() + (appointment.duration || 30) * 60 * 1000);
    if (now < startTime || now > endTime) {
      throw new Error('Appointment time window has expired or not yet started');
    }

    if (appointment.type === 'VIRTUAL' && appointment.consultationType === 'TEXT') {
      logger.info(`User ${user.id} joined TEXT appointment ${id}`);
      return {
        sessionId: appointment.sessionId,
        type: 'TEXT',
        userId: user.id,
        role: user.role,
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
      };
    }

    if (appointment.type === 'VIRTUAL' && ['VIDEO', 'AUDIO'].includes(appointment.consultationType)) {
      const appId = process.env.AGORA_APP_ID;
      const appCertificate = process.env.AGORA_APP_CERTIFICATE;
      const channelName = appointment.sessionId;
      const uid = user.id;
      const role = RtcRole.PUBLISHER;
      const expirationTimeInSeconds = 3600;
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

      if (!appId || !appCertificate) {
        throw new Error('Agora configuration missing');
      }

      const token = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channelName,
        uid,
        role,
        privilegeExpiredTs,
      );

      logger.info(`User ${user.id} joined ${appointment.consultationType} appointment ${id}`);
      return {
        token,
        sessionId: channelName,
        appId,
        type: appointment.consultationType,
        userId: user.id,
        role: user.role,
      };
    }

    if (appointment.type === 'IN_PERSON') {
      logger.info(`User ${user.id} accessed IN_PERSON appointment ${id}`);
      return {
        sessionId: null,
        type: 'IN_PERSON',
        message: 'In-person appointment. No virtual session required.',
      };
    }

    throw new Error('Invalid appointment type or consultation type');
  } catch (err) {
    logger.error(`Failed to join appointment ${id}: ${err.message}`);
    throw err;
  }
};

export const sendMessage = async (data, user, logger) => {
  try {
    const validatedData = sendMessageSchema.parse(data);
    const { appointmentId, content } = validatedData;

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        status: true,
        type: true,
        consultationType: true,
        scheduledAt: true,
        duration: true,
        sessionId: true,
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (
      user.role !== 'ADMIN' &&
      user.id !== appointment.patientId &&
      user.id !== appointment.doctorId
    ) {
      throw new Error('Unauthorized access');
    }

    if (appointment.status !== 'CONFIRMED') {
      throw new Error('Appointment is not confirmed');
    }

    if (appointment.type !== 'VIRTUAL' || appointment.consultationType !== 'TEXT') {
      throw new Error('Messages can only be sent for TEXT consultation appointments');
    }

    const now = new Date();
    const startTime = new Date(appointment.scheduledAt);
    const endTime = new Date(startTime.getTime() + (appointment.duration || 30) * 60 * 1000);
    if (now < startTime || now > endTime) {
      throw new Error('Appointment time window has expired or not yet started');
    }

    const receiverId = user.id === appointment.patientId ? appointment.doctorId : appointment.patientId;

    const message = await prisma.message.create({
      data: {
        appointmentId,
        senderId: user.id,
        receiverId,
        content,
        messageType: 'TEXT',
      },
      select: {
        id: true,
        appointmentId: true,
        senderId: true,
        receiverId: true,
        content: true,
        messageType: true,
        sentAt: true,
      },
    });

    logger.info(`Message sent for appointment ${appointmentId} by user ${user.id}`);
    return {
      message,
      sessionId: appointment.sessionId,
    };
  } catch (err) {
    logger.error(`Failed to send message for appointment ${data.appointmentId}: ${err.message}`);
    throw err;
  }
};

export const getMessages = async ({ appointmentId, skip = 0, take = 20 }, user, logger) => {
  try {
    const validatedData = getMessagesSchema.parse({ appointmentId, skip, take });

    const appointment = await prisma.appointment.findUnique({
      where: { id: validatedData.appointmentId },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        status: true,
        type: true,
        consultationType: true,
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (
      user.role !== 'ADMIN' &&
      user.id !== appointment.patientId &&
      user.id !== appointment.doctorId
    ) {
      throw new Error('Unauthorized access');
    }

    if (appointment.type !== 'VIRTUAL' || appointment.consultationType !== 'TEXT') {
      throw new Error('Messages can only be retrieved for TEXT consultation appointments');
    }

    if (!['CONFIRMED', 'COMPLETED'].includes(appointment.status)) {
      throw new Error('Messages can only be retrieved for confirmed or completed appointments');
    }

    const messages = await prisma.message.findMany({
      where: {
        appointmentId: validatedData.appointmentId,
      },
      skip: Number(validatedData.skip),
      take: Number(validatedData.take),
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
      },
    });

    logger.info(`Fetched ${messages.length} messages for appointment ${appointmentId}`);
    return messages;
  } catch (err) {
    logger.error(`Failed to fetch messages for appointment ${appointmentId}: ${err.message}`);
    throw err;
  }
};

export const confirmAppointment = async (id, user, logger) => {
  try {
    const validatedId = idSchema.parse(id);

    const appointment = await prisma.appointment.findUnique({
      where: { id: validatedId },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        status: true,
        type: true,
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (user.role !== 'ADMIN' && user.id !== appointment.doctorId) {
      throw new Error('Unauthorized access');
    }

    if (appointment.status !== 'PENDING') {
      throw new Error('Only pending appointments can be confirmed');
    }

    return await prisma.$transaction(async (tx) => {
      const updatedAppointment = await tx.appointment.update({
        where: { id: validatedId },
        data: { status: 'CONFIRMED' },
      });

      const patient = await tx.user.findUnique({
        where: { id: appointment.patientId },
        select: { metadata: true, firstName: true, lastName: true },
      });
      const doctor = await tx.doctor.findUnique({
        where: { id: appointment.doctorId },
        select: { firstName: true, lastName: true, metadata: true },
      });

      const patientFcmToken = patient?.metadata?.fcmToken;
      const doctorFcmToken = doctor?.metadata?.fcmToken;

      if (patientFcmToken) {
        await messaging.send({
          token: patientFcmToken,
          notification: {
            title: 'Appointment Confirmed',
            body: `Your ${appointment.type.toLowerCase()} appointment with Dr. ${doctor.firstName} ${doctor.lastName} has been confirmed.`,
          },
          data: { appointmentId: id },
        });
      }

      if (doctorFcmToken) {
        await messaging.send({
          token: doctorFcmToken,
          notification: {
            title: 'Appointment Confirmed',
            body: `${patient.firstName} ${patient.lastName}'s ${appointment.type.toLowerCase()} appointment with you has been confirmed.`,
          },
          data: { appointmentId: id },
        });
      }

      const admins = await tx.user.findMany({
        where: { role: 'ADMIN' },
        select: { metadata: true },
      });

      for (const admin of admins) {
        const adminFcmToken = admin.metadata?.fcmToken;
        if (adminFcmToken) {
          await messaging.send({
            token: adminFcmToken,
            notification: {
              title: 'Appointment Confirmed',
              body: `${patient.firstName} ${patient.lastName}'s ${appointment.type.toLowerCase()} appointment with Dr. ${doctor.firstName} ${doctor.lastName} has been confirmed.`,
            },
            data: { appointmentId: id },
          });
        }
      }

      logger.info(`Appointment ${id} confirmed by user ${user.id}`);
      return await tx.appointment.findUnique({
        where: { id: validatedId },
        select: { id: true, status: true },
      });
    });
  } catch (err) {
    logger.error(`Failed to confirm appointment ${id}: ${err.message}`);
    throw err;
  }
};

export const completeAppointment = async (id, user, logger) => {
  try {
    const validatedId = idSchema.parse(id);

    const appointment = await prisma.appointment.findUnique({
      where: { id: validatedId },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        status: true,
        type: true,
        scheduledAt: true,
        duration: true,
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (
      user.role !== 'ADMIN' &&
      user.id !== appointment.patientId &&
      user.id !== appointment.doctorId
    ) {
      throw new Error('Unauthorized access');
    }

    if (appointment.status !== 'CONFIRMED') {
      throw new Error('Only confirmed appointments can be completed');
    }

    const now = new Date();
    const startTime = new Date(appointment.scheduledAt);
    const endTime = new Date(startTime.getTime() + (appointment.duration || 30) * 60 * 1000);
    if (now < startTime) {
      throw new Error('Appointment has not yet started');
    }

    return await prisma.$transaction(async (tx) => {
      const updatedAppointment = await tx.appointment.update({
        where: { id: validatedId },
        data: { status: 'COMPLETED' },
      });

      const patient = await tx.user.findUnique({
        where: { id: appointment.patientId },
        select: { metadata: true, firstName: true, lastName: true },
      });
      const doctor = await tx.doctor.findUnique({
        where: { id: appointment.doctorId },
        select: { firstName: true, lastName: true, metadata: true },
      });

      const patientFcmToken = patient?.metadata?.fcmToken;
      const doctorFcmToken = doctor?.metadata?.fcmToken;

      if (patientFcmToken) {
        await messaging.send({
          token: patientFcmToken,
          notification: {
            title: 'Appointment Completed',
            body: `Your ${appointment.type.toLowerCase()} appointment with Dr. ${doctor.firstName} ${doctor.lastName} has been completed.`,
          },
          data: { appointmentId: id },
        });
      }

      if (doctorFcmToken) {
        await messaging.send({
          token: doctorFcmToken,
          notification: {
            title: 'Appointment Completed',
            body: `${patient.firstName} ${patient.lastName}'s ${appointment.type.toLowerCase()} appointment with you has been completed.`,
          },
          data: { appointmentId: id },
        });
      }

      const admins = await tx.user.findMany({
        where: { role: 'ADMIN' },
        select: { metadata: true },
      });

      for (const admin of admins) {
        const adminFcmToken = admin.metadata?.fcmToken;
        if (adminFcmToken) {
          await messaging.send({
            token: adminFcmToken,
            notification: {
              title: 'Appointment Completed',
              body: `${patient.firstName} ${patient.lastName}'s ${appointment.type.toLowerCase()} appointment with Dr. ${doctor.firstName} ${doctor.lastName} has been completed.`,
            },
            data: { appointmentId: id },
          });
        }
      }

      logger.info(`Appointment ${id} completed by user ${user.id}`);
      return await tx.appointment.findUnique({
        where: { id: validatedId },
        select: { id: true, status: true },
      });
    });
  } catch (err) {
    logger.error(`Failed to complete appointment ${id}: ${err.message}`);
    throw err;
  }
};