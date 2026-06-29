import { Hono } from 'hono';
import { ObjectId } from 'mongodb';
import { COLLECTIONS, getDb } from '../db.js';
import { createAppointmentSchema } from '../schemas.js';
import {
  computeEndTime,
  getAvailableSlots,
  getMonthAvailabilitySummary,
} from '../services/availability.js';
import type { Appointment, Service, AvailabilityRule, AvailabilityBlock } from '../types.js';

export const publicRoutes = new Hono();

publicRoutes.get('/health', (c) => c.json({ status: 'ok' }));

publicRoutes.get('/services', async (c) => {
  const db = getDb();
  const services = await db
    .collection<Service>(COLLECTIONS.services)
    .find({ active: true })
    .sort({ sortOrder: 1 })
    .toArray();
  return c.json(services.map(serializeService));
});

publicRoutes.get('/shop-settings', async (c) => {
  const db = getDb();
  const settings = await db.collection(COLLECTIONS.shopSettings).findOne({});
  return c.json(settings ?? {});
});

publicRoutes.get('/availability', async (c) => {
  const date = c.req.query('date');
  const serviceIds = c.req.query('serviceIds')?.split(',').filter(Boolean) ?? [];

  if (!date) return c.json({ error: 'date is required' }, 400);

  const db = getDb();
  const settings = await db.collection(COLLECTIONS.shopSettings).findOne({});
  const slotInterval = settings?.slotIntervalMinutes ?? 30;

  let durationMinutes = 30;
  if (serviceIds.length > 0) {
    const services = await db
      .collection<Service>(COLLECTIONS.services)
      .find({ _id: { $in: serviceIds.map((id) => new ObjectId(id)) } })
      .toArray();
    durationMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0) || 30;
  }

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

  return c.json({ date, durationMinutes, slots });
});

publicRoutes.get('/availability/month', async (c) => {
  const year = parseInt(c.req.query('year') ?? '', 10);
  const month = parseInt(c.req.query('month') ?? '', 10);
  const serviceIds = c.req.query('serviceIds')?.split(',').filter(Boolean) ?? [];

  if (!year || !month) return c.json({ error: 'year and month are required' }, 400);

  const db = getDb();
  const settings = await db.collection(COLLECTIONS.shopSettings).findOne({});
  const slotInterval = settings?.slotIntervalMinutes ?? 30;

  let defaultDuration = 30;
  if (serviceIds.length > 0) {
    const services = await db
      .collection<Service>(COLLECTIONS.services)
      .find({ _id: { $in: serviceIds.map((id) => new ObjectId(id)) } })
      .toArray();
    defaultDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0) || 30;
  }

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  const [rules, blocks, appointments] = await Promise.all([
    db.collection<AvailabilityRule>(COLLECTIONS.availabilityRules).find({}).toArray(),
    db.collection<AvailabilityBlock>(COLLECTIONS.availabilityBlocks)
      .find({ date: { $gte: startDate, $lte: endDate } })
      .toArray(),
    db.collection<Appointment>(COLLECTIONS.appointments)
      .find({ date: { $gte: startDate, $lte: endDate } })
      .toArray(),
  ]);

  const summary = getMonthAvailabilitySummary(
    year,
    month,
    rules,
    blocks,
    appointments,
    defaultDuration,
    slotInterval,
  );

  return c.json({ year, month, summary });
});

publicRoutes.get('/appointments', async (c) => {
  const sessionId = c.req.query('sessionId');
  if (!sessionId) return c.json({ error: 'sessionId is required' }, 400);

  const db = getDb();
  const appointments = await db
    .collection<Appointment>(COLLECTIONS.appointments)
    .find({ sessionId })
    .sort({ createdAt: -1 })
    .toArray();

  const serviceIds = [...new Set(appointments.flatMap((a) => a.serviceIds.map(String)))];
  const services = await db
    .collection<Service>(COLLECTIONS.services)
    .find({ _id: { $in: serviceIds.map((id) => new ObjectId(id)) } })
    .toArray();
  const serviceMap = new Map(services.map((s) => [String(s._id), s]));

  return c.json(
    appointments.map((a) => ({
      ...serializeAppointment(a),
      services: a.serviceIds.map((id) => serializeService(serviceMap.get(String(id))!)).filter(Boolean),
    })),
  );
});

publicRoutes.post('/appointments', async (c) => {
  const body = await c.req.json();
  const parsed = createAppointmentSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const { serviceIds, date, startTime, sessionId, ...rest } = parsed.data;
  const db = getDb();

  const services = await db
    .collection<Service>(COLLECTIONS.services)
    .find({ _id: { $in: serviceIds.map((id) => new ObjectId(id)) }, active: true })
    .toArray();

  if (services.length !== serviceIds.length) {
    return c.json({ error: 'Invalid service selection' }, 400);
  }

  const durationMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0);
  const endTime = computeEndTime(startTime, durationMinutes);
  const finalSessionId = sessionId ?? crypto.randomUUID();

  const settings = await db.collection(COLLECTIONS.shopSettings).findOne({});
  const slotInterval = settings?.slotIntervalMinutes ?? 30;

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
    return c.json({ error: 'Selected time slot is not available' }, 409);
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
    notes: rest.notes,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<Appointment>(COLLECTIONS.appointments).insertOne(appointment);
  const created = { ...appointment, _id: result.insertedId };

  const { emitAppointmentCreated } = await import('../socket.js');
  emitAppointmentCreated(created);

  return c.json({
    appointment: serializeAppointment(created),
    sessionId: finalSessionId,
  }, 201);
});

function serializeService(service: Service) {
  return {
    id: String(service._id),
    name: service.name,
    description: service.description,
    price: service.price,
    durationMinutes: service.durationMinutes,
    active: service.active,
    sortOrder: service.sortOrder,
  };
}

function serializeAppointment(appointment: Appointment) {
  return {
    id: String(appointment._id),
    sessionId: appointment.sessionId,
    firstName: appointment.firstName,
    lastName: appointment.lastName,
    phone: appointment.phone,
    serviceIds: appointment.serviceIds.map(String),
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    notes: appointment.notes,
    status: appointment.status,
    adminNote: appointment.adminNote,
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
  };
}

export { serializeAppointment, serializeService };
