import { Hono } from 'hono';
import { ObjectId } from 'mongodb';
import { COLLECTIONS, getDb } from '../db.js';
import { cancelAppointmentSchema, createAppointmentSchema } from '../schemas.js';
import {
  getAvailableSlots,
  getDaySchedule,
  getMonthAvailabilitySummary,
  roundDurationToSlots,
} from '../services/availability.js';
import type { Appointment, Service, ServiceCategory, ServiceCombo, AvailabilityRule, AvailabilityBlock } from '../types.js';
import { calculatePricing } from '../services/pricing.js';
import { createAppointmentRecord } from '../services/createAppointment.js';
import { pricingQuoteSchema } from '../schemas.js';

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

publicRoutes.get('/service-categories', async (c) => {
  const db = getDb();
  const categories = await db
    .collection<ServiceCategory>(COLLECTIONS.serviceCategories)
    .find({ active: true })
    .sort({ sortOrder: 1 })
    .toArray();
  return c.json(categories.map(serializeCategory));
});

publicRoutes.get('/service-combos', async (c) => {
  const db = getDb();
  const combos = await db
    .collection<ServiceCombo>(COLLECTIONS.serviceCombos)
    .find({ active: true })
    .sort({ sortOrder: 1 })
    .toArray();
  return c.json(combos.map(serializeCombo));
});

publicRoutes.post('/pricing/quote', async (c) => {
  const body = await c.req.json();
  const parsed = pricingQuoteSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb();
  const { serviceIds } = parsed.data;

  const services = await db
    .collection<Service>(COLLECTIONS.services)
    .find({ _id: { $in: serviceIds.map((id) => new ObjectId(id)) }, active: true })
    .toArray();

  if (services.length !== serviceIds.length) {
    return c.json({ error: 'Invalid service selection' }, 400);
  }

  const combos = await db
    .collection<ServiceCombo>(COLLECTIONS.serviceCombos)
    .find({ active: true })
    .toArray();

  const pricing = calculatePricing(services, combos);
  return c.json(pricing);
});

publicRoutes.get('/shop-settings', async (c) => {
  const db = getDb();
  const settings = await db.collection(COLLECTIONS.shopSettings).findOne({});
  return c.json(settings ?? {});
});

publicRoutes.get('/working-hours', async (c) => {
  const db = getDb();
  const rules = await db
    .collection<AvailabilityRule>(COLLECTIONS.availabilityRules)
    .find({})
    .sort({ dayOfWeek: 1 })
    .toArray();
  return c.json(
    rules.map(({ dayOfWeek, openTime, closeTime, active }) => ({
      dayOfWeek,
      openTime,
      closeTime,
      active,
    })),
  );
});

publicRoutes.get('/availability', async (c) => {
  const date = c.req.query('date');
  const serviceIds = c.req.query('serviceIds')?.split(',').filter(Boolean) ?? [];

  if (!date) return c.json({ error: 'date is required' }, 400);

  const db = getDb();
  const settings = await db.collection(COLLECTIONS.shopSettings).findOne({});
  const slotInterval = settings?.slotIntervalMinutes ?? 30;

  let durationMinutes = slotInterval;
  if (serviceIds.length > 0) {
    const services = await db
      .collection<Service>(COLLECTIONS.services)
      .find({ _id: { $in: serviceIds.map((id) => new ObjectId(id)) } })
      .toArray();
    const rawDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);
    durationMinutes = roundDurationToSlots(rawDuration, slotInterval);
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

  const schedule = getDaySchedule(
    date,
    slotInterval,
    rules,
    blocks,
    appointments,
    durationMinutes,
  );

  return c.json({ date, durationMinutes, slotInterval, slots, schedule });
});

publicRoutes.get('/availability/month', async (c) => {
  const year = parseInt(c.req.query('year') ?? '', 10);
  const month = parseInt(c.req.query('month') ?? '', 10);
  const serviceIds = c.req.query('serviceIds')?.split(',').filter(Boolean) ?? [];

  if (!year || !month) return c.json({ error: 'year and month are required' }, 400);

  const db = getDb();
  const settings = await db.collection(COLLECTIONS.shopSettings).findOne({});
  const slotInterval = settings?.slotIntervalMinutes ?? 30;

  let defaultDuration = slotInterval;
  if (serviceIds.length > 0) {
    const services = await db
      .collection<Service>(COLLECTIONS.services)
      .find({ _id: { $in: serviceIds.map((id) => new ObjectId(id)) } })
      .toArray();
    const rawDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);
    defaultDuration = roundDurationToSlots(rawDuration, slotInterval);
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

  try {
    const created = await createAppointmentRecord(db, {
      sessionId,
      firstName: rest.firstName,
      lastName: rest.lastName,
      phone: rest.phone,
      serviceIds,
      date,
      startTime,
      notes: rest.notes,
      status: 'pending',
    });

    const { emitAppointmentCreated } = await import('../socket.js');
    emitAppointmentCreated(created);

    return c.json({
      appointment: serializeAppointment(created),
      sessionId: created.sessionId,
    }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed';
    if (message === 'Invalid service selection') return c.json({ error: message }, 400);
    if (message === 'Selected time slot is not available') return c.json({ error: message }, 409);
    throw err;
  }
});

publicRoutes.patch('/appointments/:id/cancel', async (c) => {
  const id = c.req.param('id');
  if (!id || !ObjectId.isValid(id)) return c.json({ error: 'Invalid id' }, 400);

  const body = await c.req.json();
  const parsed = cancelAppointmentSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb();
  const existing = await db
    .collection<Appointment>(COLLECTIONS.appointments)
    .findOne({ _id: new ObjectId(id) });

  if (!existing) return c.json({ error: 'Not found' }, 404);
  if (existing.sessionId !== parsed.data.sessionId) return c.json({ error: 'Forbidden' }, 403);
  if (existing.status === 'cancelled') return c.json({ error: 'Already cancelled' }, 409);
  if (existing.status === 'completed' || existing.status === 'rejected') {
    return c.json({ error: 'Cannot cancel this appointment' }, 409);
  }

  const result = await db
    .collection<Appointment>(COLLECTIONS.appointments)
    .findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { status: 'cancelled', updatedAt: new Date() } },
      { returnDocument: 'after' },
    );

  if (!result) return c.json({ error: 'Not found' }, 404);

  const serviceIds = result.serviceIds.map(String);
  const services = await db
    .collection<Service>(COLLECTIONS.services)
    .find({ _id: { $in: serviceIds.map((sid) => new ObjectId(sid)) } })
    .toArray();
  const serviceMap = new Map(services.map((s) => [String(s._id), s]));

  const { emitAppointmentUpdated } = await import('../socket.js');
  emitAppointmentUpdated(result);

  return c.json({
    ...serializeAppointment(result),
    services: result.serviceIds
      .map((sid) => serializeService(serviceMap.get(String(sid))!))
      .filter(Boolean),
  });
});

function serializeCombo(combo: ServiceCombo) {
  return {
    id: String(combo._id),
    name: combo.name,
    serviceIds: combo.serviceIds.map(String),
    discountAmount: combo.discountAmount,
    active: combo.active,
    sortOrder: combo.sortOrder,
  };
}

function serializeService(service: Service) {
  return {
    id: String(service._id),
    categoryId: service.categoryId ? String(service.categoryId) : null,
    name: service.name,
    description: service.description,
    price: service.price,
    durationMinutes: service.durationMinutes,
    active: service.active,
    sortOrder: service.sortOrder,
  };
}

function serializeCategory(category: ServiceCategory) {
  return {
    id: String(category._id),
    name: category.name,
    sortOrder: category.sortOrder,
    active: category.active,
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
    subtotal: appointment.subtotal,
    discountAmount: appointment.discountAmount,
    totalPrice: appointment.totalPrice,
    appliedComboIds: appointment.appliedComboIds?.map(String),
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
  };
}

export { serializeAppointment, serializeService, serializeCategory, serializeCombo };
