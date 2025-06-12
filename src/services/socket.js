import { Server } from 'socket.io';

export const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*', // Update with mobile app origin in production
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join a consultation room
    socket.on('join_consultation', (consultationId) => {
      socket.join(`consultation_${consultationId}`);
      socket.emit('joined_consultation', { consultationId });
    });

    // Handle text message
    socket.on('send_message', async ({ consultationId, content, senderId, receiverId }) => {
      try {
        // Save message to database
        const message = await prisma.message.create({
          data: {
            consultationId,
            content,
            senderId: senderId,
            receiverId: receiverId,
            sentAt: new Date(),
          },
        });

        // Broadcast message to consultation room
        io.to(`consultation_${consultationId}`).emit('receive_message', {
          id: message.id,
          consultationId,
          content,
          senderId,
          receiverId,
          sentAt: message.sentAt,
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  return io;
};