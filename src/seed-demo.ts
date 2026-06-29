import { randomUUID } from 'crypto';
import { ObjectId } from 'mongodb';
import { connectDb, COLLECTIONS, closeDb } from './db.js';
import { seedBase } from './seed.js';
import { computeEndTime, getDayOfWeek, roundDurationToSlots } from './services/availability.js';
import { normalizePhoneDigits } from './services/customers.js';
import { calculatePricing } from './services/pricing.js';
import type {
  Appointment,
  AppointmentStatus,
  AvailabilityBlock,
  Customer,
  Service,
  ServiceCategory,
  ServiceCombo,
} from './types.js';

const ALL_DEMO_SERVICES: (Omit<Service, '_id' | 'categoryId'> & { categoryTr: string })[] = [
  {
    categoryTr: 'Saç',
    name: { tr: 'Saç Kesimi', en: 'Haircut' },
    description: { tr: 'Profesyonel saç kesimi ve şekillendirme', en: 'Professional haircut and styling' },
    price: 350,
    durationMinutes: 30,
    active: true,
    sortOrder: 1,
  },
  {
    categoryTr: 'Sakal',
    name: { tr: 'Sakal Tıraşı', en: 'Beard Trim' },
    description: { tr: 'Sakal düzenleme ve bakım', en: 'Beard grooming and trim' },
    price: 200,
    durationMinutes: 20,
    active: true,
    sortOrder: 2,
  },
  {
    categoryTr: 'Bakım',
    name: { tr: 'Cilt Bakımı', en: 'Facial Care' },
    description: { tr: 'Yüz bakımı ve maske uygulaması', en: 'Facial care and mask treatment' },
    price: 250,
    durationMinutes: 30,
    active: true,
    sortOrder: 3,
  },
  {
    categoryTr: 'Saç',
    name: { tr: 'Saç Boyama', en: 'Hair Coloring' },
    description: { tr: 'Profesyonel saç boyama ve renklendirme', en: 'Professional hair coloring' },
    price: 850,
    durationMinutes: 90,
    active: true,
    sortOrder: 4,
  },
  {
    categoryTr: 'Saç',
    name: { tr: 'Fön', en: 'Blow Dry' },
    description: { tr: 'Saç şekillendirme ve fön', en: 'Hair styling and blow dry' },
    price: 150,
    durationMinutes: 20,
    active: true,
    sortOrder: 5,
  },
  {
    categoryTr: 'Saç',
    name: { tr: 'Saç Yıkama', en: 'Hair Wash' },
    description: { tr: 'Şampuan ve bakım uygulaması', en: 'Shampoo and care treatment' },
    price: 100,
    durationMinutes: 15,
    active: true,
    sortOrder: 6,
  },
  {
    categoryTr: 'Sakal',
    name: { tr: 'Sakal Şekillendirme', en: 'Beard Styling' },
    description: { tr: 'Detaylı sakal şekillendirme', en: 'Detailed beard styling' },
    price: 250,
    durationMinutes: 25,
    active: true,
    sortOrder: 7,
  },
  {
    categoryTr: 'Bakım',
    name: { tr: 'Kaş Düzenleme', en: 'Eyebrow Trim' },
    description: { tr: 'Kaş şekillendirme', en: 'Eyebrow shaping' },
    price: 120,
    durationMinutes: 15,
    active: true,
    sortOrder: 8,
  },
  {
    categoryTr: 'Bakım',
    name: { tr: 'Yüz Masajı', en: 'Face Massage' },
    description: { tr: 'Rahatlatıcı yüz masajı', en: 'Relaxing face massage' },
    price: 200,
    durationMinutes: 20,
    active: true,
    sortOrder: 9,
  },
];

const DEMO_COMBOS: {
  name: ServiceCombo['name'];
  serviceNames: [string, string];
  discountAmount: number;
  sortOrder: number;
}[] = [
  {
    name: { tr: 'Saç + Sakal İndirimi', en: 'Hair + Beard Discount' },
    serviceNames: ['Saç Kesimi', 'Sakal Tıraşı'],
    discountAmount: 50,
    sortOrder: 1,
  },
  {
    name: { tr: 'Saç Kesimi + Fön', en: 'Haircut + Blow Dry' },
    serviceNames: ['Saç Kesimi', 'Fön'],
    discountAmount: 40,
    sortOrder: 2,
  },
  {
    name: { tr: 'Saç Boyama + Cilt Bakımı', en: 'Hair Color + Facial' },
    serviceNames: ['Saç Boyama', 'Cilt Bakımı'],
    discountAmount: 100,
    sortOrder: 3,
  },
];

const DEMO_CUSTOMERS: { firstName: string; lastName: string; phone: string; debt?: number }[] = [
  { firstName: 'Ahmet', lastName: 'Yılmaz', phone: '+90 532 111 22 33' },
  { firstName: 'Mehmet', lastName: 'Kaya', phone: '+90 533 222 33 44' },
  { firstName: 'Ali', lastName: 'Demir', phone: '+90 534 333 44 55' },
  { firstName: 'Mustafa', lastName: 'Çelik', phone: '+90 535 444 55 66' },
  { firstName: 'Emre', lastName: 'Şahin', phone: '+90 536 555 66 77' },
  { firstName: 'Can', lastName: 'Öztürk', phone: '+90 537 666 77 88' },
  { firstName: 'Burak', lastName: 'Aydın', phone: '+90 538 777 88 99' },
  { firstName: 'Kerem', lastName: 'Arslan', phone: '+90 539 888 99 00' },
  { firstName: 'Oğuz', lastName: 'Koç', phone: '+90 541 123 45 67' },
  { firstName: 'Serkan', lastName: 'Yıldız', phone: '+90 542 234 56 78' },
  { firstName: 'Tolga', lastName: 'Aksoy', phone: '+90 543 345 67 89' },
  { firstName: 'Barış', lastName: 'Polat', phone: '+90 544 456 78 90' },
  { firstName: 'Deniz', lastName: 'Kurt', phone: '+90 545 567 89 01' },
  { firstName: 'Efe', lastName: 'Güneş', phone: '+90 546 678 90 12' },
  { firstName: 'Furkan', lastName: 'Erdoğan', phone: '+90 547 789 01 23' },
  { firstName: 'Gökhan', lastName: 'Tekin', phone: '+90 548 890 12 34' },
  { firstName: 'Hakan', lastName: 'Bulut', phone: '+90 549 901 23 45' },
  { firstName: 'İbrahim', lastName: 'Aslan', phone: '+90 550 012 34 56' },
  { firstName: 'Kaan', lastName: 'Doğan', phone: '+90 551 123 45 67' },
  { firstName: 'Levent', lastName: 'Kara', phone: '+90 552 234 56 78' },
  { firstName: 'Murat', lastName: 'Özkan', phone: '+90 553 345 67 89', debt: 350 },
  { firstName: 'Onur', lastName: 'Çetin', phone: '+90 554 456 78 90', debt: 150 },
  { firstName: 'Pınar', lastName: 'Acar', phone: '+90 555 567 89 01' },
  { firstName: 'Selin', lastName: 'Yavuz', phone: '+90 556 678 90 12' },
  { firstName: 'Tuğba', lastName: 'Eren', phone: '+90 557 789 01 23' },
  { firstName: 'Umut', lastName: 'Başaran', phone: '+90 558 890 12 34' },
  { firstName: 'Volkan', lastName: 'Işık', phone: '+90 559 901 23 45' },
  { firstName: 'Yusuf', lastName: 'Tunç', phone: '+90 530 111 22 44' },
  { firstName: 'Zeynep', lastName: 'Kaplan', phone: '+90 531 222 33 55' },
  { firstName: 'Arda', lastName: 'Sezer', phone: '+90 532 333 44 66' },
];

const NOTES = [
  '',
  '',
  '',
  'Kısa tutulmasını rica ederim',
  'Saç boyası getiriyorum',
  'İlk kez geliyorum',
  'Düzenli müşteri',
  'Telefonla arayın lütfen',
];

const ADMIN_NOTES = [
  undefined,
  undefined,
  'VIP müşteri',
  'Erken geldi',
  'Geç kaldı, telafi edildi',
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isOpenDay(dateStr: string) {
  const dow = getDayOfWeek(dateStr);
  return dow >= 2 && dow <= 6;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function pickRandomServices(services: Service[], count: 1 | 2): Service[] {
  const shuffled = [...services].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function statusForDate(date: string, today: string): AppointmentStatus {
  if (date < today) {
    const r = Math.random();
    if (r < 0.68) return 'completed';
    if (r < 0.82) return 'cancelled';
    if (r < 0.92) return 'rejected';
    return 'accepted';
  }
  if (date === today) {
    const r = Math.random();
    if (r < 0.25) return 'completed';
    if (r < 0.55) return 'accepted';
    if (r < 0.78) return 'pending';
    return 'cancelled';
  }
  const r = Math.random();
  if (r < 0.55) return 'accepted';
  return 'pending';
}

function generateTimeSlots(openTime: string, closeTime: string, interval: number) {
  const slots: string[] = [];
  const [oh, om] = openTime.split(':').map(Number);
  const [ch, cm] = closeTime.split(':').map(Number);
  let minutes = oh * 60 + om;
  const end = ch * 60 + cm;
  while (minutes < end) {
    slots.push(`${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`);
    minutes += interval;
  }
  return slots;
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

function timeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

async function resetDemoCatalog(db: Awaited<ReturnType<typeof connectDb>>) {
  await db.collection(COLLECTIONS.services).deleteMany({});
  await db.collection(COLLECTIONS.serviceCombos).deleteMany({});

  const categories = await db
    .collection<ServiceCategory>(COLLECTIONS.serviceCategories)
    .find({})
    .toArray();
  const categoryByTr = new Map(categories.map((c) => [c.name.tr, c._id!]));

  const services = ALL_DEMO_SERVICES.map(({ categoryTr, ...service }) => ({
    ...service,
    categoryId: categoryByTr.get(categoryTr),
  }));

  await db.collection(COLLECTIONS.services).insertMany(services);

  const inserted = await db.collection<Service>(COLLECTIONS.services).find({}).toArray();
  const serviceByName = new Map(inserted.map((s) => [s.name.tr, s._id!]));

  const combos = DEMO_COMBOS.flatMap((combo) => {
    const serviceIds = combo.serviceNames.map((name) => serviceByName.get(name));
    if (serviceIds.some((id) => !id)) return [];
    return [
      {
        name: combo.name,
        serviceIds: serviceIds as ObjectId[],
        discountAmount: combo.discountAmount,
        active: true,
        sortOrder: combo.sortOrder,
      },
    ];
  });

  if (combos.length > 0) {
    await db.collection(COLLECTIONS.serviceCombos).insertMany(combos);
  }

  console.log(`Reset demo catalog: ${services.length} services, ${combos.length} combos`);
  return inserted;
}

async function seedCustomers(db: Awaited<ReturnType<typeof connectDb>>) {
  const now = new Date();
  const customers: Customer[] = DEMO_CUSTOMERS.map((c) => {
    const createdAt = addDays(now, -Math.floor(Math.random() * 180));
    const customer: Customer = {
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      phoneDigits: normalizePhoneDigits(c.phone),
      createdAt,
      updatedAt: createdAt,
    };
    if (c.debt) {
      customer.debtBalance = c.debt;
      customer.debtHistory = [
        {
          id: randomUUID(),
          amount: c.debt,
          note: 'Önceki randevu borcu',
          createdAt: addDays(createdAt, 7),
        },
      ];
    }
    return customer;
  });

  await db.collection(COLLECTIONS.customers).insertMany(customers);
  console.log(`Seeded ${customers.length} customers`);
  return customers;
}

async function seedAvailabilityBlocks(db: Awaited<ReturnType<typeof connectDb>>) {
  const today = new Date();
  const blocks: Omit<AvailabilityBlock, '_id'>[] = [
    {
      date: formatDate(addDays(today, 14)),
      allDay: true,
      reason: 'Eğitim semineri',
    },
    {
      date: formatDate(addDays(today, 3)),
      startTime: '12:00',
      endTime: '14:00',
      allDay: false,
      reason: 'Öğle arası toplantı',
    },
  ];

  await db.collection(COLLECTIONS.availabilityBlocks).deleteMany({});
  await db.collection(COLLECTIONS.availabilityBlocks).insertMany(blocks);
  console.log(`Seeded ${blocks.length} availability blocks`);
}

async function seedAppointments(
  db: Awaited<ReturnType<typeof connectDb>>,
  customers: Customer[],
  services: Service[],
) {
  const [combos, settings] = await Promise.all([
    db.collection<ServiceCombo>(COLLECTIONS.serviceCombos).find({ active: true }).toArray(),
    db.collection(COLLECTIONS.shopSettings).findOne({}),
  ]);

  const slotInterval = settings?.slotIntervalMinutes ?? 30;
  const today = formatDate(new Date());
  const startDate = addDays(new Date(), -90);
  const endDate = addDays(new Date(), 60);

  const appointments: Appointment[] = [];
  let cursor = new Date(startDate);

  while (cursor <= endDate) {
    const dateStr = formatDate(cursor);

    if (isOpenDay(dateStr)) {
      const slots = generateTimeSlots('09:00', '19:00', slotInterval);
      const usedRanges: { start: number; end: number }[] = [];
      const count = 2 + Math.floor(Math.random() * 5);

      for (let i = 0; i < count; i++) {
        const customer = pickRandom(customers);
        const selectedServices = pickRandomServices(services, Math.random() < 0.35 ? 2 : 1);
        const rawDuration = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);
        const durationMinutes = roundDurationToSlots(rawDuration, slotInterval);

        const shuffledSlots = [...slots].sort(() => Math.random() - 0.5);
        let startTime: string | null = null;
        let endTime: string | null = null;

        for (const slot of shuffledSlots) {
          const start = timeToMinutes(slot);
          const end = start + durationMinutes;
          if (end > timeToMinutes('19:00')) continue;
          if (usedRanges.some((r) => rangesOverlap(start, end, r.start, r.end))) continue;
          startTime = slot;
          endTime = computeEndTime(slot, durationMinutes);
          usedRanges.push({ start, end });
          break;
        }

        if (!startTime || !endTime) continue;

        const pricing = calculatePricing(selectedServices, combos);
        const status = statusForDate(dateStr, today);
        const createdAt = addDays(new Date(`${dateStr}T12:00:00`), -Math.floor(Math.random() * 3));

        appointments.push({
          sessionId: randomUUID(),
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          serviceIds: selectedServices.map((s) => s._id!),
          date: dateStr,
          startTime,
          endTime,
          notes: pickRandom(NOTES),
          status,
          adminNote: pickRandom(ADMIN_NOTES),
          subtotal: pricing.subtotal,
          discountAmount: pricing.discountAmount,
          totalPrice: pricing.total,
          appliedComboIds: pricing.appliedCombos.map((c) => new ObjectId(c.id)),
          createdAt,
          updatedAt: createdAt,
        });
      }
    }

    cursor = addDays(cursor, 1);
  }

  if (appointments.length > 0) {
    const batchSize = 500;
    for (let i = 0; i < appointments.length; i += batchSize) {
      await db.collection(COLLECTIONS.appointments).insertMany(appointments.slice(i, i + batchSize));
    }
  }

  console.log(`Seeded ${appointments.length} appointments (${formatDate(startDate)} → ${formatDate(endDate)})`);
}

async function seedDemo() {
  const db = await connectDb();

  const existingSettings = await db.collection(COLLECTIONS.shopSettings).findOne({});
  const preservedPasswordHash = existingSettings?.adminPasswordHash;

  await seedBase(db);

  if (preservedPasswordHash) {
    await db.collection(COLLECTIONS.shopSettings).updateOne(
      {},
      { $set: { adminPasswordHash: preservedPasswordHash } },
    );
  }

  const services = await resetDemoCatalog(db);

  await db.collection(COLLECTIONS.appointments).deleteMany({});
  await db.collection(COLLECTIONS.customers).deleteMany({});

  const customers = await seedCustomers(db);
  await seedAvailabilityBlocks(db);
  await seedAppointments(db, customers, services);

  console.log('Demo seed complete (admin password unchanged)');
  await closeDb();
}

seedDemo().catch((err) => {
  console.error(err);
  process.exit(1);
});
