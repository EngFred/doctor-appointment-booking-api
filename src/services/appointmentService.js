import prisma from '../config/database.js';
import { z } from 'zod';

// Validation schemas
const initiateAppointmentSchema = z.object({
  doctorId: z.string().uuid({ message: 'Invalid doctor ID' }),
  availabilityId: z.string().uuid({ message: 'Invalid availability ID' }),
  type: z.enum(['IN_PERSON', 'VIRTUAL'], { message: 'Invalid appointment type' }),
  consultationType: z
    .enum(['VIDEO', 'AUDIO', 'TEXT'], { message: 'Invalid consultation type' })
    .optional(),
  duration: z.number().int().positive({ message: 'Duration must be a positive integer' }).optional(),
  notes: z.string().optional(),
});

const idSchema = z.string().uuid({ message: 'Invalid UUID' });

export const initiateAppointment = async (data, user, log) => {
  if (user.role !== 'PATIENT' && user.role !== 'DOCTOR') {
    const error = new Error('Only patients or doctors can initiate appointments');
    error.statusCode = 403;
    throw error;
  }

  const validatedData = initiateAppointmentSchema.parse(data);
  const { doctorId, availabilityId, type, consultationType, duration, notes } = validatedData;

  if (doctorId === user.id) {
    const error = new Error('Cannot book an appointment with yourself');
    error.statusCode = 400;
    throw error;
  }

  if (type === 'VIRTUAL' && !consultationType) {
    const error = new Error('Consultation type is required for virtual appointments');
    error.statusCode = 400;
    throw error;
  }

  try {
    const doctor = await prisma.user.findFirst({
      where: { id: doctorId, role: 'DOCTOR' },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!doctor) {
      const error = new Error('Doctor not found');
      error.statusCode = 404;
      throw error;
    }

    const availability = await prisma.availability.findFirst({
      where: { id: availabilityId },
      select: { id: true, startTime: true, endTime: true, status: true, doctorId: true },
    });

    if (!availability) {
      const error = new Error('Availability not found');
      error.statusCode = 404;
      throw error;
    }

    if (availability.status !== 'AVAILABLE') {
      const error = new Error('Availability slot is not available');
      error.statusCode = 400;
      throw error;
    }

    if (availability.doctorId !== doctorId) {
      const error = new Error('Availability does not belong to the specified doctor');
      error.statusCode = 400;
      throw error;
    }

    if (new Date(availability.startTime) <= new Date()) {
      const error = new Error('Cannot book past or current slots');
      error.statusCode = 400;
      throw error;
    }

    return await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.create({
        data: {
          patientId: user.id,
          doctorId,
          availabilityId,
          scheduledAt: availability.startTime,
          type,
          consultationType: type === 'VIRTUAL' ? consultationType : null,
          status: 'PENDING',
          duration: duration || 30,
          notes,
        },
        select: {
          id: true,
          patientId: true,
          doctorId: true,
          availabilityId: true,
          scheduledAt: true,
          type: true,
          consultationType: true,
          status: true,
          duration: true,
          notes: true,
          createdAt: true,
        },
      });

      await tx.availability.update({
        where: { id: availabilityId },
        data: { status: 'BOOKED' },
      });

      await tx.notification.create({
        data: {
          recipientId: user.id,
          title: 'Appointment Booked',
          body: `You have booked an appointment with Dr. ${doctor.firstName} ${doctor.lastName} on ${availability.startTime.toISOString()}.`,
          notificationType: 'APPOINTMENT_BOOKED',
          status: 'PENDING',
          metadata: { appointmentId: appointment.id },
        },
      });

      await tx.notification.create({
        data: {
          recipientId: doctorId,
          title: 'New Appointment',
          body: `A new appointment has been booked by ${user.firstName} ${user.lastName} on ${availability.startTime.toISOString()}.`,
          notificationType: 'APPOINTMENT_BOOKED',
          status: 'PENDING',
          metadata: { appointmentId: appointment.id },
        },
      });

      log.info(`Appointment ${appointment.id} initiated for user ${user.id} with doctor ${doctorId}`);
      return appointment;
    });
  } catch (err) {
    log.error(`Failed to initiate appointment: ${err.message}`);
    throw err;
  }
};

export const getAppointments = async ({ skip = 0, take = 10, status, doctorId }, user, log) => {
  try {
    let where = {};
    if (user.role === 'SUPER_ADMIN') {
    } else {
      where.OR = [
        { patientId: user.id },
        { doctorId: user.id },
      ];
    }

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
        duration: true,
        notes: true,
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

    log.info(`Fetched ${appointments.length} appointments for user ${user.id}`);
    return appointments;
  } catch (err) {
    log.error(`Failed to fetch appointments: ${err.message}`);
    throw err;
  }
};

export const getAppointmentById = async (id, user, log) => {
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
        duration: true,
        notes: true,
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
      const error = new Error('Appointment not found');
      error.statusCode = 404;
      throw error;
    }

    if (
      user.role !== 'SUPER_ADMIN' &&
      user.id !== appointment.patientId &&
      user.id !== appointment.doctorId
    ) {
      const error = new Error('Unauthorized access');
      error.statusCode = 403;
      throw error;
    }

    log.info(`Fetched appointment ${id} for user ${user.id}`);
    return appointment;
  } catch (err) {
    log.error(`Failed to fetch appointment ${id}: ${err.message}`);
    throw err;
  }
};

export const cancelAppointment = async (id, user, log) => {
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
        status: true,
        patient: { select: { firstName: true, lastName: true } },
        doctor: { select: { firstName: true, lastName: true } },
      },
    });

    if (!appointment) {
      const error = new Error('Appointment not found');
      error.statusCode = 404;
      throw error;
    }

    if (user.role !== 'SUPER_ADMIN' && user.id !== appointment.patientId) {
      const error = new Error('Unauthorized: Only patients or Super Admins can cancel appointments');
      error.statusCode = 403;
      throw error;
    }

    if (appointment.status !== 'PENDING' && appointment.status !== 'CONFIRMED') {
      const error = new Error('Only pending or confirmed appointments can be cancelled');
      error.statusCode = 400;
      throw error;
    }

    const now = new Date();
    const cancellationWindow = new Date(appointment.scheduledAt);
    cancellationWindow.setHours(cancellationWindow.getHours() - 24);
    if (now > cancellationWindow) {
      const error = new Error('Cancellation window closed 24 hours before appointment');
      error.statusCode = 400;
      throw error;
    }

    return await prisma.$transaction(async (tx) => {
      const updatedAppointment = await tx.appointment.update({
        where: { id: validatedId },
        data: {
          status: 'CANCELLED',
          metadata: {},
        },
      });

      if (appointment.availabilityId) {
        await tx.availability.update({
          where: { id: appointment.availabilityId },
          data: { status: 'AVAILABLE' },
        });
      }

      await tx.notification.create({
        data: {
          recipientId: appointment.patientId,
          title: 'Appointment Cancelled',
          body: `Your appointment with Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName} has been cancelled.`,
          notificationType: 'APPOINTMENT_CANCELLED',
          status: 'PENDING',
          metadata: { appointmentId: appointment.id },
        },
      });

      await tx.notification.create({
        data: {
          recipientId: appointment.doctorId,
          title: 'Appointment Cancelled',
          body: `An appointment with ${appointment.patient.firstName} ${appointment.patient.lastName} has been cancelled.`,
          notificationType: 'APPOINTMENT_CANCELLED',
          status: 'PENDING',
          metadata: { appointmentId: appointment.id },
        },
      });

      log.info(`Appointment ${id} cancelled by user ${user.id}`);
      return await tx.appointment.findUnique({
        where: { id: validatedId },
        select: { id: true, status: true, metadata: true },
      });
    });
  } catch (err) {
    log.error(`Failed to cancel appointment ${id}: ${err.message}`);
    throw err;
  }
};

export const joinAppointment = async (id, user, log) => {
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
        scheduledAt: true,
        duration: true,
      },
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
      const error = new Error('Unauthorized access');
      error.statusCode = 403;
      throw error;
    }

    if (appointment.status !== 'CONFIRMED') {
      const error = new Error('Appointment is not confirmed');
      error.statusCode = 400;
      throw error;
    }

    const now = new Date();
    const startTime = new Date(appointment.scheduledAt);
    const endTime = new Date(startTime.getTime() + (appointment.duration || 30) * 60 * 1000);
    if (now < startTime || now > endTime) {
      const error = new Error('Appointment time window has expired or not yet started');
      error.statusCode = 400;
      throw error;
    }

    if (appointment.type === 'IN_PERSON') {
      log.info(`User ${user.id} accessed IN_PERSON appointment ${id}`);
      return {
        type: 'IN_PERSON',
        message: 'In-person appointment. No virtual session required.',
      };
    }

    if (appointment.type === 'VIRTUAL' && ['VIDEO', 'AUDIO', 'TEXT'].includes(appointment.consultationType)) {
      log.info(`User ${user.id} joined VIRTUAL appointment ${id}`);
      return {
        type: 'VIRTUAL',
        consultationType: appointment.consultationType,
        joinUrl: `https://video.afrodoctor.com/room/${appointment.id}`,
      };
    }

    const error = new Error('Invalid appointment type or consultation type');
    error.statusCode = 400;
    throw error;
  } catch (err) {
    log.error(`Failed to join appointment ${id}: ${err.message}`);
    throw err;
  }
};

export const confirmAppointment = async (id, user, log) => {
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
        patient: { select: { firstName: true, lastName: true } },
        doctor: { select: { firstName: true, lastName: true } },
      },
    });

    if (!appointment) {
      const error = new Error('Appointment not found');
      error.statusCode = 404;
      throw error;
    }

    if (user.role !== 'SUPER_ADMIN' && user.id !== appointment.doctorId) {
      const error = new Error('Unauthorized: Only doctors or Super Admins can confirm appointments');
      error.statusCode = 403;
      throw error;
    }

    if (appointment.status !== 'PENDING') {
      const error = new Error('Only pending appointments can be confirmed');
      error.statusCode = 400;
      throw error;
    }

    return await prisma.$transaction(async (tx) => {
      const updatedAppointment = await tx.appointment.update({
        where: { id: validatedId },
        data: { status: 'CONFIRMED' },
      });

      await tx.notification.create({
        data: {
          recipientId: appointment.patientId,
          title: 'Appointment Confirmed',
          body: `Your appointment with Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName} on ${appointment.scheduledAt.toISOString()} has been confirmed.`,
          notificationType: 'APPOINTMENT_CONFIRMED',
          status: 'PENDING',
          metadata: { appointmentId: appointment.id },
        },
      });

      await tx.notification.create({
        data: {
          recipientId: appointment.doctorId,
          title: 'Appointment Confirmed',
          body: `You have confirmed an appointment with ${appointment.patient.firstName} ${appointment.patient.lastName} on ${appointment.scheduledAt.toISOString()}.`,
          notificationType: 'APPOINTMENT_CONFIRMED',
          status: 'PENDING',
          metadata: { appointmentId: appointment.id },
        },
      });

      log.info(`Appointment ${id} confirmed by user ${user.id}`);
      return await tx.appointment.findUnique({
        where: { id: validatedId },
        select: { id: true, status: true },
      });
    });
  } catch (err) {
    log.error(`Failed to confirm appointment ${id}: ${err.message}`);
    throw err;
  }
};

export const completeAppointment = async (id, user, log) => {
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
        patient: { select: { firstName: true, lastName: true } },
        doctor: { select: { firstName: true, lastName: true } },
      },
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
      const error = new Error('Unauthorized access');
      error.statusCode = 403;
      throw error;
    }

    if (appointment.status !== 'CONFIRMED') {
      const error = new Error('Only confirmed appointments can be completed');
      error.statusCode = 400;
      throw error;
    }

    const now = new Date();
    const startTime = new Date(appointment.scheduledAt);
    if (now < startTime) {
      const error = new Error('Appointment has not yet started');
      error.statusCode = 400;
      throw error;
    }

    return await prisma.$transaction(async (tx) => {
      const updatedAppointment = await tx.appointment.update({
        where: { id: validatedId },
        data: { status: 'COMPLETED' },
      });

      await tx.notification.create({
        data: {
          recipientId: appointment.patientId,
          title: 'Appointment Completed',
          body: `Your appointment with Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName} has been completed.`,
          notificationType: 'APPOINTMENT_COMPLETED',
          status: 'PENDING',
          metadata: { appointmentId: appointment.id },
        },
      });

      await tx.notification.create({
        data: {
          recipientId: appointment.doctorId,
          title: 'Appointment Completed',
          body: `You have completed an appointment with ${appointment.patient.firstName} ${appointment.patient.lastName}.`,
          notificationType: 'APPOINTMENT_COMPLETED',
          status: 'PENDING',
          metadata: { appointmentId: appointment.id },
        },
      });

      log.info(`Appointment ${id} completed by user ${user.id}`);
      return await tx.appointment.findUnique({
        where: { id: validatedId },
        select: { id: true, status: true },
      });
    });
  } catch (err) {
    log.error(`Failed to complete appointment ${id}: ${err.message}`);
    throw err;
  }
};