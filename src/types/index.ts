export interface LocalizedText {
  tr: string;
  en: string;
}

export interface Service {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  price: number;
  durationMinutes: number;
  active: boolean;
  sortOrder: number;
}

export type AppointmentStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'completed';

export interface Appointment {
  id: string;
  sessionId: string;
  firstName: string;
  lastName: string;
  phone: string;
  serviceIds: string[];
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
  status: AppointmentStatus;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
  services?: Service[];
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface ShopSettings {
  phone: string;
  whatsapp: string;
  address: string;
  owner: string;
  name: string;
  defaultLocale: 'tr' | 'en';
  slotIntervalMinutes: number;
}

export type DayAvailability = 'closed' | 'available' | 'full';
