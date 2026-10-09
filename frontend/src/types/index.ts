export interface LocalizedText {
  tr: string;
  en: string;
}

export interface ServiceCategory {
  id: string;
  name: LocalizedText;
  sortOrder: number;
  active: boolean;
}

export interface Service {
  id: string;
  categoryId: string | null;
  name: LocalizedText;
  description: LocalizedText;
  price: number;
  durationMinutes: number;
  active: boolean;
  sortOrder: number;
}

export interface ServiceCombo {
  id: string;
  name: LocalizedText;
  serviceIds: string[];
  discountAmount: number;
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
  subtotal?: number;
  discountAmount?: number;
  totalPrice?: number;
  appliedComboIds?: string[];
  createdAt: string;
  updatedAt: string;
  services?: Service[];
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

export interface DaySchedule {
  openTime: string | null;
  closeTime: string | null;
  closed: boolean;
  allDayBlocked: boolean;
  slots: ScheduleSlot[];
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

export interface WorkingHoursRule {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  active: boolean;
}

export type DayAvailability = 'closed' | 'available' | 'full';
