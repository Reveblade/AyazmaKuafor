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
  password: z.string().min(4).max(64),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(4).max(64),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'Yeni şifre mevcut şifreden farklı olmalı',
    path: ['newPassword'],
  });

export const updateAppointmentSchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected', 'cancelled', 'completed']).optional(),
  adminNote: z.string().max(500).optional(),
});

export const cancelAppointmentSchema = z.object({
  sessionId: z.string().uuid(),
});

export const serviceCategorySchema = z.object({
  name: z.object({ tr: z.string().min(1), en: z.string().min(1) }),
  sortOrder: z.number().int(),
  active: z.boolean(),
});

export const serviceSchema = z.object({
  categoryId: z.string().optional().nullable(),
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

export const updateDayScheduleSchema = z.object({
  allDay: z.boolean(),
  blockedStarts: z.array(z.string().regex(/^\d{2}:\d{2}$/)).default([]),
  reason: z.string().max(200).optional(),
});

export const serviceComboSchema = z.object({
  name: z.object({ tr: z.string().min(1), en: z.string().min(1) }),
  serviceIds: z.array(z.string()).min(2),
  discountAmount: z.number().positive(),
  active: z.boolean(),
  sortOrder: z.number().int(),
});

export const pricingQuoteSchema = z.object({
  serviceIds: z.array(z.string()).min(1),
});
