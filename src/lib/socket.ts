import { io, type Socket } from 'socket.io-client';
import { API_URL } from './api';
import { getSessionId } from './session';

let socket: Socket | null = null;
let currentSessionId: string | undefined;
let sessionEventsBound = false;

function joinSessionRoom(s: Socket) {
  if (currentSessionId) s.emit('join:session', currentSessionId);
}

function bindSessionEvents(s: Socket) {
  if (sessionEventsBound) return;
  sessionEventsBound = true;
  s.on('connect', () => joinSessionRoom(s));
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      autoConnect: false,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      auth: { sessionId: getSessionId() },
    });
    bindSessionEvents(socket);
  }
  return socket;
}

export function connectSocket(sessionId?: string) {
  const id = sessionId ?? getSessionId();
  currentSessionId = id;
  const s = getSocket();
  s.auth = { sessionId: id };
  bindSessionEvents(s);
  if (!s.connected) {
    s.connect();
  } else {
    joinSessionRoom(s);
  }
  return s;
}

export function connectBookingSocket() {
  return connectSocket();
}

export function disconnectSocket() {
  socket?.disconnect();
}

