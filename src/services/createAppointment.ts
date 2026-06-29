import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';
import { COLLECTIONS } from '../db.js';
import {
  computeEndTime,
  getAvailableSlots,
  roundDurationToSlots,
} from './availability.js';
import { calculatePricing } from './pricing.js';
import type {
  Appointment,
  AppointmentStatus,
  AvailabilityBlock,
  AvailabilityRule,
  Service,
  ServiceCombo,
} from '../types.js';

export interface CreateAppointmentInput {
  sessionId?: string;
  firstName: string;
  lastName: string;
  phone: string;
  serviceIds: string[];
  date: string;
  startTime: string;
  notes?: string;
  status?: AppointmentStatus;
}

export async function createAppointmentRecord(
  db: Db,
  input: CreateAppointmentInput,
): Promise<Appointment> {
  const { serviceIds, date, startTime, sessionId, status = 'pending', ...rest } = input;

  const services = await db
    .collection<Service>(COLLECTIONS.services)
    .find({ _id: { $in: serviceIds.map((id) => new ObjectId(id)) }, active: true })
    .toArray();

  if (services.length !== serviceIds.length) {
    throw new Error('Invalid service selection');
  }

  const settings = await db.collection(COLLECTIONS.shopSettings).findOne({});
  const slotInterval = settings?.slotIntervalMinutes ?? 30;
  const rawDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);
  const durationMinutes = roundDurationToSlots(rawDuration, slotInterval);
  const endTime = computeEndTime(startTime, durationMinutes);
  const finalSessionId = sessionId ?? crypto.randomUUID();

  const combos = await db
    .collection<ServiceCombo>(COLLECTIONS.serviceCombos)
    .find({ active: true })
    .toArray();
  const pricing = calculatePricing(services, combos);

  const [rules, blocks, appointments] = await Promise.all([
    db.collection<AvailabilityRule>(COLLECTIONS.availabilityRules).find({}).toArray(),
    db.collection<AvailabilityBlock>(COLLECTIONS.availabilityBlocks).find({ date }).toArray(),
    db.collection<Appointment>(COLLECTIONS.appointments).find({ date }).toArray(),
  ]);

  const slots = getAvailableSlots(
    date,
    durationMinutes,
    slotInterval,
    rules,
    blocks,
    appointments,
  );
  const slot = slots.find((s) => s.startTime === startTime);
  if (!slot?.available) {
    throw new Error('Selected time slot is not available');
  }

  const now = new Date();
  const appointment: Appointment = {
    sessionId: finalSessionId,
    firstName: rest.firstName,
    lastName: rest.lastName,
    phone: rest.phone,
    serviceIds: serviceIds.map((id) => new ObjectId(id)),
    date,
    startTime,
    endTime,
    notes: rest.notes ?? '',
    status,
    subtotal: pricing.subtotal,
    discountAmount: pricing.discountAmount,
    totalPrice: pricing.total,
    appliedComboIds: pricing.appliedCombos.map((combo) => new ObjectId(combo.id)),
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<Appointment>(COLLECTIONS.appointments).insertOne(appointment);
  return { ...appointment, _id: result.insertedId };
}
