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
  adminCreateAppointmentSchema,
  availabilityBlockSchema,
  availabilityRuleSchema,
  changePasswordSchema,
  serviceSchema,
  serviceCategorySchema,
  serviceComboSchema,
  updateAppointmentSchema,
  updateDayScheduleSchema,
  updateCustomerSchema,
  addCustomerDebtSchema,
} from '../schemas.js';
import { changeAdminPassword, verifyAdminPassword } from '../services/adminAuth.js';
import { resetSystem } from '../services/resetSystem.js';
import {
  buildMonthDateFilter,
  buildPastScopeFilter,
  buildUpcomingDateTimeFilter,
  buildWeekDateFilter,
  CURRENT_STATUSES,
  getNowDateTimeParts,
  isAppointmentStatus,
  isCurrentStatus,
} from '../services/appointments.js';
import { serializeAppointment, serializeService, serializeCategory, serializeCombo } from './public.js';
import type { Appointment, AvailabilityBlock, AvailabilityRule, Service, ServiceCategory, ServiceCombo } from '../types.js';
import { getDaySchedule, mergeBlockedStarts } from '../services/availability.js';
import { createAppointmentRecord } from '../services/createAppointment.js';
import { normalizePhoneDigits, serializeCustomer, serializeCustomerDetail, upsertCustomer, buildAppointmentPhoneQuery } from '../services/customers.js';
import type { Customer } from '../types.js';

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

adminRoutes.post('/reset', adminAuthMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = adminAuthSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Şifre gerekli' }, 400);

  const result = await resetSystem(parsed.data.password);
  if (result === 'invalid') return c.json({ error: 'Şifre hatalı' }, 401);

  return c.json({ ok: true });
});

adminRoutes.post('/logout', (c) => {
  clearAdminCookie(c);
  return c.json({ ok: true });
});

adminRoutes.get('/me', adminAuthMiddleware, (c) => c.json({ ok: true, role: 'admin' }));

async function serializeAppointmentsWithServices(appointments: Appointment[]) {
  const db = getDb();
  const serviceIds = [...new Set(appointments.flatMap((a) => a.serviceIds.map(String)))];
  const services = serviceIds.length
    ? await db
        .collection<Service>(COLLECTIONS.services)
        .find({ _id: { $in: serviceIds.map((id) => new ObjectId(id)) } })
        .toArray()
    : [];
  const serviceMap = new Map(services.map((s) => [String(s._id), s]));

  return appointments.map((a) => ({
    ...serializeAppointment(a),
    services: a.serviceIds
      .map((id) => serviceMap.get(String(id)))
      .filter(Boolean)
      .map((s) => serializeService(s!)),
  }));
}

adminRoutes.get('/appointments', adminAuthMiddleware, async (c) => {
  const status = c.req.query('status');
  const date = c.req.query('date');
  const month = c.req.query('month');
  const weekRaw = c.req.query('week');
  const scope = c.req.query('scope');
  const pageRaw = c.req.query('page');
  const limitRaw = c.req.query('limit');

  const conditions: Record<string, unknown>[] = [];
  if (date) conditions.push({ date });

  if (scope === 'past') {
    conditions.push(buildPastScopeFilter());
    if (status && isAppointmentStatus(status)) {
      conditions.push({ status });
    }
  } else if (scope === 'current') {
    conditions.push(buildUpcomingDateTimeFilter());
    if (status && isCurrentStatus(status)) {
      conditions.push({ status });
    } else {
      conditions.push({ status: { $in: [...CURRENT_STATUSES] } });
    }
  } else if (status) {
    conditions.push({ status });
  }

  if (month) {
    const week = weekRaw ? Number.parseInt(weekRaw, 10) : NaN;
    const weekFilter = Number.isFinite(week) ? buildWeekDateFilter(month, week) : null;
    const monthFilter = weekFilter ?? buildMonthDateFilter(month);
    if (monthFilter) conditions.push(monthFilter);
  }

  const filter = conditions.length === 0 ? {} : conditions.length === 1 ? conditions[0]! : { $and: conditions };

  const db = getDb();
  const collection = db.collection<Appointment>(COLLECTIONS.appointments);
  const sort = scope === 'past'
    ? ({ date: -1, startTime: -1 } as const)
    : ({ date: 1, startTime: 1 } as const);

  if (pageRaw && limitRaw) {
    const page = Math.max(1, Number.parseInt(pageRaw, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(limitRaw, 10) || 10));
    const skip = (page - 1) * limit;

    const [appointments, total] = await Promise.all([
      collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
      collection.countDocuments(filter),
    ]);

    const items = await serializeAppointmentsWithServices(appointments);
    return c.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  }

  const appointments = await collection.find(filter).sort(sort).toArray();
  return c.json(await serializeAppointmentsWithServices(appointments));
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

adminRoutes.post('/appointments', adminAuthMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = adminCreateAppointmentSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const { serviceIds, date, startTime, status, ...rest } = parsed.data;
  const db = getDb();

  try {
    await upsertCustomer(db, {
      firstName: rest.firstName,
      lastName: rest.lastName,
      phone: rest.phone,
    });

    const created = await createAppointmentRecord(db, {
      firstName: rest.firstName,
      lastName: rest.lastName,
      phone: rest.phone,
      serviceIds,
      date,
      startTime,
      notes: rest.notes,
      status,
    });

    const { emitAppointmentCreated, emitScheduleUpdated } = await import('../socket.js');
    emitAppointmentCreated(created);
    emitScheduleUpdated(date);

    const [serialized] = await serializeAppointmentsWithServices([created]);
    return c.json(serialized, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed';
    if (message === 'Invalid service selection') return c.json({ error: message }, 400);
    if (message === 'Selected time slot is not available') return c.json({ error: message }, 409);
    throw err;
  }
});

adminRoutes.get('/customers', adminAuthMiddleware, async (c) => {
  const search = c.req.query('search')?.trim();
  const hasDebt = c.req.query('hasDebt') === 'true';
  const pageRaw = c.req.query('page');
  const limitRaw = c.req.query('limit');
  const db = getDb();

  let filter: Record<string, unknown> = {};
  if (hasDebt) {
    filter.debtBalance = { $gt: 0 };
  }
  if (search) {
    const digits = normalizePhoneDigits(search);
    const conditions: Record<string, unknown>[] = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
    ];
    if (digits.length >= 3) {
      conditions.push({ phoneDigits: { $regex: digits } });
    }
    filter = hasDebt ? { $and: [filter, { $or: conditions }] } : { $or: conditions };
  }

  const isPaginated = !hasDebt && (pageRaw != null || limitRaw != null);
  const page = Math.max(1, Number.parseInt(pageRaw ?? '1', 10) || 1);
  const limit = isPaginated
    ? Math.min(50, Math.max(1, Number.parseInt(limitRaw ?? '20', 10) || 20))
    : 10;
  const skip = isPaginated ? (page - 1) * limit : 0;

  const collection = db.collection<Customer>(COLLECTIONS.customers);

  if (isPaginated) {
    const [customers, total] = await Promise.all([
      collection.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).toArray(),
      collection.countDocuments(filter),
    ]);
    return c.json({
      items: customers.map(serializeCustomer),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  }

  const sort = hasDebt ? { debtBalance: -1 as const, updatedAt: -1 as const } : { updatedAt: -1 as const };
  const customers = await collection.find(filter).sort(sort).limit(hasDebt ? 100 : limit).toArray();
  return c.json(customers.map(serializeCustomer));
});

adminRoutes.get('/customers/:id', adminAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  if (!id || !ObjectId.isValid(id)) return c.json({ error: 'Invalid id' }, 400);

  const db = getDb();
  const customer = await db.collection<Customer>(COLLECTIONS.customers).findOne({ _id: new ObjectId(id) });
  if (!customer) return c.json({ error: 'Not found' }, 404);

  const appointments = await db
    .collection<Appointment>(COLLECTIONS.appointments)
    .find(buildAppointmentPhoneQuery(customer.phoneDigits))
    .sort({ date: -1, startTime: -1 })
    .toArray();

  const serializedAppointments = await serializeAppointmentsWithServices(appointments);

  return c.json({
    ...serializeCustomerDetail(customer),
    appointments: serializedAppointments,
  });
});

adminRoutes.post('/customers/:id/debt', adminAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  if (!id || !ObjectId.isValid(id)) return c.json({ error: 'Invalid id' }, 400);

  const body = await c.req.json();
  const parsed = addCustomerDebtSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb();
  const now = new Date();
  const entry = {
    id: crypto.randomUUID(),
    amount: parsed.data.amount,
    note: parsed.data.note || undefined,
    createdAt: now,
  };

  const result = await db.collection<Customer>(COLLECTIONS.customers).findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $inc: { debtBalance: parsed.data.amount },
      $push: { debtHistory: entry },
      $set: { updatedAt: now },
    },
    { returnDocument: 'after' },
  );

  if (!result) return c.json({ error: 'Not found' }, 404);

  return c.json(serializeCustomerDetail(result), 201);
});

adminRoutes.patch('/customers/:id', adminAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  if (!id || !ObjectId.isValid(id)) return c.json({ error: 'Invalid id' }, 400);

  const body = await c.req.json();
  const parsed = updateCustomerSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb();
  const existing = await db.collection<Customer>(COLLECTIONS.customers).findOne({ _id: new ObjectId(id) });
  if (!existing) return c.json({ error: 'Not found' }, 404);

  const phoneDigits = normalizePhoneDigits(parsed.data.phone);
  const duplicate = await db.collection<Customer>(COLLECTIONS.customers).findOne({
    phoneDigits,
    _id: { $ne: new ObjectId(id) },
  });
  if (duplicate) return c.json({ error: 'Bu telefon numarası başka bir müşteriye kayıtlı' }, 409);

  const now = new Date();
  const result = await db.collection<Customer>(COLLECTIONS.customers).findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: parsed.data.phone,
        phoneDigits,
        updatedAt: now,
      },
    },
    { returnDocument: 'after' },
  );

  if (!result) return c.json({ error: 'Not found' }, 404);

  await db.collection<Appointment>(COLLECTIONS.appointments).updateMany(
    buildAppointmentPhoneQuery(existing.phoneDigits),
    {
      $set: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: parsed.data.phone,
        updatedAt: now,
      },
    },
  );

  return c.json(serializeCustomer(result));
});

adminRoutes.delete('/customers/:id', adminAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  if (!id || !ObjectId.isValid(id)) return c.json({ error: 'Invalid id' }, 400);

  const db = getDb();
  const result = await db.collection(COLLECTIONS.customers).deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) return c.json({ error: 'Not found' }, 404);

  return c.json({ ok: true });
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
  const { today } = getNowDateTimeParts();
  const month = today.slice(0, 7);
  const monthFilter = buildMonthDateFilter(month);
  const [pending, todayCount, total, revenueResult] = await Promise.all([
    db.collection(COLLECTIONS.appointments).countDocuments({ status: 'pending' }),
    db.collection(COLLECTIONS.appointments).countDocuments({ date: today }),
    db.collection(COLLECTIONS.appointments).countDocuments({}),
    monthFilter
      ? db
          .collection<Appointment>(COLLECTIONS.appointments)
          .aggregate<{ total: number }>([
            { $match: { status: 'completed', ...monthFilter } },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$totalPrice', 0] } } } },
          ])
          .toArray()
      : Promise.resolve([]),
  ]);
  return c.json({
    pending,
    todayCount,
    total,
    monthlyCompletedRevenue: revenueResult[0]?.total ?? 0,
  });
});
