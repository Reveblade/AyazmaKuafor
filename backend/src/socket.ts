import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config.js';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from './middleware/auth.js';
import { serializeAppointment } from './routes/public.js';
import type { Appointment } from './types.js';

let io: SocketIOServer | null = null;

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    out[part.slice(0, eq).trim()] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return out;
}

async function joinRooms(socket: import('socket.io').Socket) {
  const sessionId = socket.handshake.auth.sessionId as string | undefined;
  const adminToken = socket.handshake.auth.adminToken as string | undefined;
  const cookieToken = parseCookies(socket.handshake.headers.cookie)[ADMIN_COOKIE_NAME];

  if (sessionId) socket.join(`session:${sessionId}`);

  const token = adminToken ?? cookieToken;
  if (token && (await verifyAdminToken(token))) {
    socket.join('admin');
  } else {
    socket.join('booking');
  }
}

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.corsOrigins,
      credentials: true,
    },
  });

  io.on('connection', async (socket) => {
    await joinRooms(socket);

    socket.on('join:session', (id: string) => socket.join(`session:${id}`));
    socket.on('join:admin', async (token: string) => {
      if (await verifyAdminToken(token)) socket.join('admin');
    });
    socket.on('join:booking', () => socket.join('booking'));
  });

  return io;
}

export function emitScheduleUpdated(date: string) {
  if (!io) return;
  const payload = { date };
  io.to('admin').emit('schedule:updated', payload);
  io.to('booking').emit('schedule:updated', payload);
}

export function emitAvailabilityRulesUpdated() {
  if (!io) return;
  io.to('admin').emit('availability:rules-updated', {});
  io.to('booking').emit('availability:rules-updated', {});
}

export function emitAppointmentCreated(appointment: Appointment) {
  if (!io) return;
  const serialized = serializeAppointment(appointment);
  io.to('admin').emit('appointment:created', serialized);
  io.to(`session:${appointment.sessionId}`).emit('appointment:updated', serialized);
  emitScheduleUpdated(appointment.date);
}

export function emitAppointmentUpdated(appointment: Appointment) {
  if (!io) return;
  const serialized = serializeAppointment(appointment);
  io.to('admin').emit('appointment:updated', serialized);
  io.to(`session:${appointment.sessionId}`).emit('appointment:updated', serialized);
  emitScheduleUpdated(appointment.date);
}
