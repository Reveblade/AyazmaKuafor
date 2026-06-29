import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config.js';
import { verifyAdminToken } from './middleware/auth.js';
import { serializeAppointment } from './routes/public.js';
import type { Appointment } from './types.js';

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.corsOrigins,
      credentials: true,
    },
  });

  io.on('connection', async (socket) => {
    const sessionId = socket.handshake.auth.sessionId as string | undefined;
    const adminToken = socket.handshake.auth.adminToken as string | undefined;

    if (sessionId) socket.join(`session:${sessionId}`);
    if (adminToken && (await verifyAdminToken(adminToken))) socket.join('admin');

    socket.on('join:session', (id: string) => socket.join(`session:${id}`));
    socket.on('join:admin', async (token: string) => {
      if (await verifyAdminToken(token)) socket.join('admin');
    });
  });

  return io;
}

export function emitAppointmentCreated(appointment: Appointment) {
  if (!io) return;
  const serialized = serializeAppointment(appointment);
  io.to('admin').emit('appointment:created', serialized);
  io.to(`session:${appointment.sessionId}`).emit('appointment:updated', serialized);
}

export function emitAppointmentUpdated(appointment: Appointment) {
  if (!io) return;
  const serialized = serializeAppointment(appointment);
  io.to('admin').emit('appointment:updated', serialized);
  io.to(`session:${appointment.sessionId}`).emit('appointment:updated', serialized);
}
