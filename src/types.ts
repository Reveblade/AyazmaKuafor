import type { ObjectId } from 'mongodb';

export type AppointmentStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'completed';

export interface LocalizedText {
  tr: string;
  en: string;
}

export interface ServiceCategory {
  _id?: ObjectId;
  name: LocalizedText;
  sortOrder: number;
  active: boolean;
}

export interface Service {
  _id?: ObjectId;
  categoryId?: ObjectId;
  name: LocalizedText;
  description: LocalizedText;
  price: number;
  durationMinutes: number;
  active: boolean;
  sortOrder: number;
}

export interface ServiceCombo {
  _id?: ObjectId;
  name: LocalizedText;
  serviceIds: ObjectId[];
  discountAmount: number;
  active: boolean;
  sortOrder: number;
}

export interface Appointment {
  _id?: ObjectId;
  sessionId: string;
  firstName: string;
  lastName: string;
  phone: string;
  serviceIds: ObjectId[];
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
  status: AppointmentStatus;
  adminNote?: string;
  subtotal?: number;
  discountAmount?: number;
  totalPrice?: number;
  appliedComboIds?: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AvailabilityRule {
  _id?: ObjectId;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  active: boolean;
}

export interface AvailabilityBlock {
  _id?: ObjectId;
  date: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  reason?: string;
}

export interface ShopSettings {
  _id?: ObjectId;
  phone: string;
  whatsapp: string;
  address: string;
  owner: string;
  name: string;
  defaultLocale: 'tr' | 'en';
  slotIntervalMinutes: number;
  adminPasswordHash?: string;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export type ScheduleSlotStatus = 'available' | 'blocked' | 'booked';

export interface ScheduleSlot {
  startTime: string;
  endTime: string;
  status: ScheduleSlotStatus;
  bookable: boolean;
}
