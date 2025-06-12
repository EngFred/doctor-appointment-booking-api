import prisma from '../config/database.js';
import * as chatService from '../services/chatService.js';
// import { io } from '../server.js';

// export const sendMessage = async (socket, data) => {
//   try {
//     const user = socket.user;
//     const message = await chatService.createMessage(data, user);

//     // Emit message to the appointment room
//     io.to(`appointment:${data.appointmentId}`).emit('message-sent', message);
//   } catch (err) {
//     socket.emit('error', { message: err.message });
//   }
// };

// export const updateMessageReadStatus = async (socket, messageId) => {
//   try {
//     const user = socket.user;
//     const updatedMessage = await chatService.updateMessageReadStatus(messageId, user);

//     // Emit read status update to the appointment room
//     const message = await prisma.message.findUnique({
//       where: { id: messageId },
//       select: { appointmentId: true },
//     });
//     io.to(`appointment:${message.appointmentId}`).emit('message-read', updatedMessage);
//   } catch (err) {
//     socket.emit('error', { message: err.message });
//   }
// };

export const joinRoom = async (socket, { appointmentId }) => {
  try {
    const user = socket.user;
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { patientId: true, doctorId: true },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (user.id !== 'PATIENT' && user.id !== 'DOCTOR' || user.id !== appointment.patientId && user.id !== appointment.doctorId) {
      throw new Error('Unauthorized access');
    }

    socket.join(`appointment:${appointmentId}`);
    socket.emit('room-joined', { appointmentId });
  } catch (err) {
    socket.emit('error', { message: err.message });
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const { appointmentId, skip, take } = req.query;
    const messages = await chatService.getMessages(
      { appointmentId, skip, take },
      req.user,
    );
    res.status(200).json({
      status: 'success',
      data: messages,
    });
  } catch (err) {
    next(err);
  }
};