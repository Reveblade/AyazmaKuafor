import { Hono } from 'hono';
import { ObjectId } from 'mongodb';
import type { z } from 'zod';
import { COLLECTIONS, getDb } from '../db.js';
import {
  adminAuthMiddleware,
  clearAdminCookie,
  createAdminToken,
  setAdminCookie,
} from '../middleware/auth.js';
import {
  adminAuthSchema,
  availabilityBlockSchema,
  availabilityRuleSchema,
  changePasswordSchema,
  serviceSchema,
  serviceCategorySchema,
  serviceComboSchema,
  updateAppointmentSchema,
  updateDayScheduleSchema,
} from '../schemas.js';
import { changeAdminPassword, verifyAdminPassword } from '../services/adminAuth.js';
import { serializeAppointment, serializeService, serializeCategory, serializeCombo } from './public.js';
import type { Appointment, AvailabilityBlock, AvailabilityRule, Service, ServiceCategory, ServiceCombo } from '../types.js';
import { getDaySchedule, mergeBlockedStarts } from '../services/availability.js';

export const adminRoutes = new Hono();

adminRoutes.post('/auth', async (c) => {
  const body = await c.req.json();
  const parsed = adminAuthSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Geçersiz şifre' }, 400);

  if (!(await verifyAdminPassword(parsed.data.password))) {
    return c.json({ error: 'Geçersiz şifre' }, 401);
  }

  const token = await createAdminToken();
  setAdminCookie(c, token);
  return c.json({ ok: true });
});

adminRoutes.patch('/password', adminAuthMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const result = await changeAdminPassword(parsed.data.currentPassword, parsed.data.newPassword);
  if (result === 'invalid') return c.json({ error: 'Mevcut şifre hatalı' }, 401);

  return c.json({ ok: true });
});

adminRoutes.post('/logout', (c) => {
  clearAdminCookie(c);
  return c.json({ ok: true });
});

adminRoutes.get('/me', adminAuthMiddleware, (c) => c.json({ ok: true, role: 'admin' }));

adminRoutes.get('/appointments', adminAuthMiddleware, async (c) => {
  const status = c.req.query('status');
  const date = c.req.query('date');
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (date) filter.date = date;

  const db = getDb();
  const appointments = await db
    .collection<Appointment>(COLLECTIONS.appointments)
    .find(filter)
    .sort({ date: 1, startTime: 1 })
    .toArray();

  const serviceIds = [...new Set(appointments.flatMap((a) => a.serviceIds.map(String)))];
  const services = serviceIds.length
    ? await db
        .collection<Service>(COLLECTIONS.services)
        .find({ _id: { $in: serviceIds.map((id) => new ObjectId(id)) } })
        .toArray()
    : [];
  const serviceMap = new Map(services.map((s) => [String(s._id), s]));

  return c.json(
    appointments.map((a) => ({
      ...serializeAppointment(a),
      services: a.serviceIds
        .map((id) => serviceMap.get(String(id)))
        .filter(Boolean)
        .map((s) => serializeService(s!)),
    })),
  );
});

adminRoutes.patch('/appointments/:id', adminAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  if (!id || !ObjectId.isValid(id)) return c.json({ error: 'Invalid id' }, 400);

  const body = await c.req.json();
  const parsed = updateAppointmentSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb();
  const update = { ...parsed.data, updatedAt: new Date() };
  const result = await db
    .collection<Appointment>(COLLECTIONS.appointments)
    .findOneAndUpdate({ _id: new ObjectId(id!) }, { $set: update }, { returnDocument: 'after' });

  if (!result) return c.json({ error: 'Not found' }, 404);

  const { emitAppointmentUpdated } = await import('../socket.js');
  emitAppointmentUpdated(result);

  return c.json(serializeAppointment(result));
});

adminRoutes.get('/services', adminAuthMiddleware, async (c) => {
  const db = getDb();
  const services = await db
    .collection<Service>(COLLECTIONS.services)
    .find({})
    .sort({ sortOrder: 1 })
    .toArray();
  return c.json(services.map(serializeService));
});

function parseServiceData(data: z.infer<typeof serviceSchema>) {
  const { categoryId, ...rest } = data;
  return {
    ...rest,
    ...(categoryId && ObjectId.isValid(categoryId)
      ? { categoryId: new ObjectId(categoryId) }
      : { categoryId: undefined }),
  };
}

adminRoutes.post('/services', adminAuthMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = serviceSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb();
  const doc = parseServiceData(parsed.data);
  const result = await db.collection<Service>(COLLECTIONS.services).insertOne(doc);
  const service = { ...doc, _id: result.insertedId };
  return c.json(serializeService(service), 201);
});

adminRoutes.patch('/services/:id', adminAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  if (!id || !ObjectId.isValid(id)) return c.json({ error: 'Invalid id' }, 400);

  const body = await c.req.json();
  const parsed = serviceSchema.partial().safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb();
  const update: Record<string, unknown> = { ...parsed.data };
  if ('categoryId' in parsed.data) {
    update.categoryId = parsed.data.categoryId && ObjectId.isValid(parsed.data.categoryId)
      ? new ObjectId(parsed.data.categoryId)
      : undefined;
  }
  const result = await db
    .collection<Service>(COLLECTIONS.services)
    .findOneAndUpdate({ _id: new ObjectId(id!) }, { $set: update }, { returnDocument: 'after' });

  if (!result) return c.json({ error: 'Not found' }, 404);
  return c.json(serializeService(result));
});

adminRoutes.delete('/services/:id', adminAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  if (!id || !ObjectId.isValid(id)) return c.json({ error: 'Invalid id' }, 400);

  const db = getDb();
  await db.collection(COLLECTIONS.services).deleteOne({ _id: new ObjectId(id!) });
  return c.json({ ok: true });
});

adminRoutes.get('/service-categories', adminAuthMiddleware, async (c) => {
  const db = getDb();
  const categories = await db
    .collection<ServiceCategory>(COLLECTIONS.serviceCategories)
    .find({})
    .sort({ sortOrder: 1 })
    .toArray();
  return c.json(categories.map(serializeCategory));
});

adminRoutes.post('/service-categories', adminAuthMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = serviceCategorySchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb();
  const result = await db.collection(COLLECTIONS.serviceCategories).insertOne(parsed.data);
  const category = { ...parsed.data, _id: result.insertedId };
  return c.json(serializeCategory(category), 201);
});

adminRoutes.patch('/service-categories/:id', adminAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  if (!id || !ObjectId.isValid(id)) return c.json({ error: 'Invalid id' }, 400);

  const body = await c.req.json();
  const parsed = serviceCategorySchema.partial().safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb();
  const result = await db
    .collection<ServiceCategory>(COLLECTIONS.serviceCategories)
    .findOneAndUpdate({ _id: new ObjectId(id!) }, { $set: parsed.data }, { returnDocument: 'after' });

  if (!result) return c.json({ error: 'Not found' }, 404);
  return c.json(serializeCategory(result));
});

adminRoutes.delete('/service-categories/:id', adminAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  if (!id || !ObjectId.isValid(id)) return c.json({ error: 'Invalid id' }, 400);

  const db = getDb();
  await db.collection(COLLECTIONS.serviceCategories).deleteOne({ _id: new ObjectId(id!) });
  await db.collection(COLLECTIONS.services).updateMany(
    { categoryId: new ObjectId(id!) },
    { $unset: { categoryId: '' } },
  );
  return c.json({ ok: true });
});

function parseComboData(data: z.infer<typeof serviceComboSchema>) {
  return {
    name: data.name,
    serviceIds: data.serviceIds.map((id) => new ObjectId(id)),
    discountAmount: data.discountAmount,
    active: data.active,
    sortOrder: data.sortOrder,
  };
}

adminRoutes.get('/service-combos', adminAuthMiddleware, async (c) => {
  const db = getDb();
  const combos = await db
    .collection<ServiceCombo>(COLLECTIONS.serviceCombos)
    .find({})
    .sort({ sortOrder: 1 })
    .toArray();
  return c.json(combos.map(serializeCombo));
});

adminRoutes.post('/service-combos', adminAuthMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = serviceComboSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb();
  const services = await db
    .collection<Service>(COLLECTIONS.services)
    .find({ _id: { $in: parsed.data.serviceIds.map((id) => new ObjectId(id)) } })
    .toArray();
  if (services.length !== parsed.data.serviceIds.length) {
    return c.json({ error: 'Geçersiz hizmet seçimi' }, 400);
  }

  const doc = parseComboData(parsed.data);
  const result = await db.collection<ServiceCombo>(COLLECTIONS.serviceCombos).insertOne(doc);
  const combo = { ...doc, _id: result.insertedId };
  return c.json(serializeCombo(combo), 201);
});

adminRoutes.patch('/service-combos/:id', adminAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  if (!id || !ObjectId.isValid(id)) return c.json({ error: 'Invalid id' }, 400);

  const body = await c.req.json();
  const parsed = serviceComboSchema.partial().safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb();
  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.serviceIds) {
    const services = await db
      .collection<Service>(COLLECTIONS.services)
      .find({ _id: { $in: parsed.data.serviceIds.map((sid) => new ObjectId(sid)) } })
      .toArray();
    if (services.length !== parsed.data.serviceIds.length) {
      return c.json({ error: 'Geçersiz hizmet seçimi' }, 400);
    }
    update.serviceIds = parsed.data.serviceIds.map((sid) => new ObjectId(sid));
  }

  const result = await db
    .collection<ServiceCombo>(COLLECTIONS.serviceCombos)
    .findOneAndUpdate({ _id: new ObjectId(id!) }, { $set: update }, { returnDocument: 'after' });

  if (!result) return c.json({ error: 'Not found' }, 404);
  return c.json(serializeCombo(result));
});

adminRoutes.delete('/service-combos/:id', adminAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  if (!id || !ObjectId.isValid(id)) return c.json({ error: 'Invalid id' }, 400);

  const db = getDb();
  await db.collection(COLLECTIONS.serviceCombos).deleteOne({ _id: new ObjectId(id!) });
  return c.json({ ok: true });
});

adminRoutes.get('/availability-rules', adminAuthMiddleware, async (c) => {
  const db = getDb();
  const rules = await db.collection(COLLECTIONS.availabilityRules).find({}).sort({ dayOfWeek: 1 }).toArray();
  return c.json(rules.map((r) => ({ ...r, id: String(r._id) })));
});

adminRoutes.put('/availability-rules', adminAuthMiddleware, async (c) => {
  const body = await c.req.json();
  if (!Array.isArray(body)) return c.json({ error: 'Expected array' }, 400);

  const parsed = body.map((item) => availabilityRuleSchema.parse(item));
  const db = getDb();
  await db.collection(COLLECTIONS.availabilityRules).deleteMany({});
  if (parsed.length > 0) await db.collection(COLLECTIONS.availabilityRules).insertMany(parsed);

  const { emitAvailabilityRulesUpdated } = await import('../socket.js');
  emitAvailabilityRulesUpdated();

  return c.json({ ok: true, count: parsed.length });
});

adminRoutes.get('/availability-blocks', adminAuthMiddleware, async (c) => {
  const db = getDb();
  const blocks = await db.collection(COLLECTIONS.availabilityBlocks).find({}).sort({ date: 1 }).toArray();
  return c.json(blocks.map((b) => ({ ...b, id: String(b._id) })));
});

adminRoutes.post('/availability-blocks', adminAuthMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = availabilityBlockSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb();
  const result = await db.collection(COLLECTIONS.availabilityBlocks).insertOne(parsed.data);

  const { emitScheduleUpdated } = await import('../socket.js');
  emitScheduleUpdated(parsed.data.date);

  return c.json({ id: String(result.insertedId), ...parsed.data }, 201);
});

adminRoutes.delete('/availability-blocks/:id', adminAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  if (!id || !ObjectId.isValid(id)) return c.json({ error: 'Invalid id' }, 400);

  const db = getDb();
  const block = await db.collection(COLLECTIONS.availabilityBlocks).findOne({ _id: new ObjectId(id!) });
  await db.collection(COLLECTIONS.availabilityBlocks).deleteOne({ _id: new ObjectId(id!) });

  if (block?.date) {
    const { emitScheduleUpdated } = await import('../socket.js');
    emitScheduleUpdated(block.date as string);
  }

  return c.json({ ok: true });
});

adminRoutes.get('/schedule', adminAuthMiddleware, async (c) => {
  const date = c.req.query('date');
  if (!date) return c.json({ error: 'date is required' }, 400);

  const db = getDb();
  const settings = await db.collection(COLLECTIONS.shopSettings).findOne({});
  const slotInterval = settings?.slotIntervalMinutes ?? 30;

  const [rules, blocks, appointments] = await Promise.all([
    db.collection<AvailabilityRule>(COLLECTIONS.availabilityRules).find({}).toArray(),
    db.collection<AvailabilityBlock>(COLLECTIONS.availabilityBlocks).find({ date }).toArray(),
    db.collection<Appointment>(COLLECTIONS.appointments).find({ date }).toArray(),
  ]);

  const schedule = getDaySchedule(date, slotInterval, rules, blocks, appointments);
  return c.json({ date, slotInterval, ...schedule });
});

adminRoutes.put('/schedule/:date', adminAuthMiddleware, async (c) => {
  const date = c.req.param('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return c.json({ error: 'Invalid date' }, 400);

  const body = await c.req.json();
  const parsed = updateDayScheduleSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb();
  const settings = await db.collection(COLLECTIONS.shopSettings).findOne({});
  const slotInterval = settings?.slotIntervalMinutes ?? 30;

  await db.collection(COLLECTIONS.availabilityBlocks).deleteMany({ date });

  if (parsed.data.allDay) {
    await db.collection(COLLECTIONS.availabilityBlocks).insertOne({
      date,
      allDay: true,
      reason: parsed.data.reason,
    });
  } else if (parsed.data.blockedStarts.length > 0) {
    const ranges = mergeBlockedStarts(parsed.data.blockedStarts, slotInterval);
    await db.collection(COLLECTIONS.availabilityBlocks).insertMany(
      ranges.map(({ startTime, endTime }) => ({
        date,
        startTime,
        endTime,
        allDay: false,
        reason: parsed.data.reason,
      })),
    );
  }

  const [rules, blocks, appointments] = await Promise.all([
    db.collection<AvailabilityRule>(COLLECTIONS.availabilityRules).find({}).toArray(),
    db.collection<AvailabilityBlock>(COLLECTIONS.availabilityBlocks).find({ date }).toArray(),
    db.collection<Appointment>(COLLECTIONS.appointments).find({ date }).toArray(),
  ]);

  const schedule = getDaySchedule(date, slotInterval, rules, blocks, appointments);

  const { emitScheduleUpdated } = await import('../socket.js');
  emitScheduleUpdated(date);

  return c.json({ date, slotInterval, ...schedule });
});

adminRoutes.get('/stats', adminAuthMiddleware, async (c) => {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const [pending, todayCount, total] = await Promise.all([
    db.collection(COLLECTIONS.appointments).countDocuments({ status: 'pending' }),
    db.collection(COLLECTIONS.appointments).countDocuments({ date: today }),
    db.collection(COLLECTIONS.appointments).countDocuments({}),
  ]);
  return c.json({ pending, todayCount, total });
});
