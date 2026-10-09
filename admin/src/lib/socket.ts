import { io, type Socket } from 'socket.io-client';
import { API_URL } from './api';

let socket: Socket | null = null;

export function connectAdminSocket() {
  if (!socket) {
    socket = io(API_URL, {
      autoConnect: false,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
    });
  }
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectAdminSocket() {
  socket?.disconnect();
}
