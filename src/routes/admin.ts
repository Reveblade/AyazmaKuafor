import { Hono } from 'hono';
import { ObjectId } from 'mongodb';
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
  serviceSchema,
  updateAppointmentSchema,
} from '../schemas.js';
import { serializeAppointment, serializeService } from './public.js';
import type { Appointment, Service } from '../types.js';
import { config } from '../config.js';

export const adminRoutes = new Hono();

adminRoutes.post('/auth', async (c) => {
  const body = await c.req.json();
  const parsed = adminAuthSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Invalid PIN' }, 400);

  if (parsed.data.pin !== config.adminPin) {
    return c.json({ error: 'Invalid PIN' }, 401);
  }

  const token = await createAdminToken();
  setAdminCookie(c, token);
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

adminRoutes.post('/services', adminAuthMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = serviceSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb();
  const result = await db.collection<Service>(COLLECTIONS.services).insertOne(parsed.data);
  const service = { ...parsed.data, _id: result.insertedId };
  return c.json(serializeService(service), 201);
});

adminRoutes.patch('/services/:id', adminAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  if (!id || !ObjectId.isValid(id)) return c.json({ error: 'Invalid id' }, 400);

  const body = await c.req.json();
  const parsed = serviceSchema.partial().safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = getDb();
  const result = await db
    .collection<Service>(COLLECTIONS.services)
    .findOneAndUpdate({ _id: new ObjectId(id!) }, { $set: parsed.data }, { returnDocument: 'after' });

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
  return c.json({ id: String(result.insertedId), ...parsed.data }, 201);
});

adminRoutes.delete('/availability-blocks/:id', adminAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  if (!id || !ObjectId.isValid(id)) return c.json({ error: 'Invalid id' }, 400);

  const db = getDb();
  await db.collection(COLLECTIONS.availabilityBlocks).deleteOne({ _id: new ObjectId(id!) });
  return c.json({ ok: true });
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
