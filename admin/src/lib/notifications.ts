import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Appointment } from './api';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) audioContext = new AudioContext();
  if (audioContext.state === 'suspended') void audioContext.resume();
  return audioContext;
}

export function unlockNotificationAudio() {
  getAudioContext();
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (notificationPermission() === 'unsupported') return 'unsupported';
  unlockNotificationAudio();
  return Notification.requestPermission();
}

export function playNotificationSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const playTone = (freq: number, start: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.25, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.start(start);
    osc.stop(start + duration);
  };

  const now = ctx.currentTime;
  playTone(880, now, 0.12);
  playTone(1100, now + 0.13, 0.18);
}

function formatAppointmentDate(date: string) {
  return format(parseISO(date), 'd MMMM yyyy', { locale: tr });
}

export function notifyNewAppointment(
  appointment: Appointment,
  onClick?: () => void,
) {
  if (notificationPermission() !== 'granted') return;

  const name = `${appointment.firstName} ${appointment.lastName}`.trim();
  const body = `${formatAppointmentDate(appointment.date)} · ${appointment.startTime} – ${name}`;

  const notification = new Notification('Yeni randevu', {
    body,
    tag: `appointment-${appointment.id}`,
    requireInteraction: false,
  });

  playNotificationSound();

  notification.onclick = () => {
    window.focus();
    notification.close();
    onClick?.();
  };
}
