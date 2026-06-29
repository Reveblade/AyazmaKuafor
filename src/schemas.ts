import { z } from 'zod';

export const createAppointmentSchema = z.object({
  sessionId: z.string().uuid().optional(),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  phone: z.string().min(10).max(20),
  serviceIds: z.array(z.string()).min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(500).optional().default(''),
});

export const adminAuthSchema = z.object({
  pin: z.string().min(4).max(20),
});

export const updateAppointmentSchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected', 'cancelled', 'completed']).optional(),
  adminNote: z.string().max(500).optional(),
});

export const serviceSchema = z.object({
  name: z.object({ tr: z.string(), en: z.string() }),
  description: z.object({ tr: z.string(), en: z.string() }),
  price: z.number().positive(),
  durationMinutes: z.number().int().positive(),
  active: z.boolean(),
  sortOrder: z.number().int(),
});

export const availabilityRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  active: z.boolean(),
});

export const availabilityBlockSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  allDay: z.boolean(),
  reason: z.string().max(200).optional(),
});
