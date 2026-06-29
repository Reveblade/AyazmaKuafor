import { io, type Socket } from 'socket.io-client';
import { API_URL } from './api';
import { getSessionId } from './session';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      autoConnect: false,
      auth: { sessionId: getSessionId() },
    });
  }
  return socket;
}

export function connectSocket(sessionId?: string) {
  const s = getSocket();
  s.auth = { sessionId: sessionId ?? getSessionId() };
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  socket?.disconnect();
}
