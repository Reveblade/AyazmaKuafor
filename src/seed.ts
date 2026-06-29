import { connectDb, COLLECTIONS, closeDb } from './db.js';
import type { AvailabilityRule, Service, ShopSettings } from './types.js';

const DEFAULT_SERVICES: Omit<Service, '_id'>[] = [
  {
    name: { tr: 'Saç Kesimi', en: 'Haircut' },
    description: { tr: 'Profesyonel saç kesimi ve şekillendirme', en: 'Professional haircut and styling' },
    price: 350,
    durationMinutes: 30,
    active: true,
    sortOrder: 1,
  },
  {
    name: { tr: 'Sakal Tıraşı', en: 'Beard Trim' },
    description: { tr: 'Sakal düzenleme ve bakım', en: 'Beard grooming and trim' },
    price: 200,
    durationMinutes: 20,
    active: true,
    sortOrder: 2,
  },
  {
    name: { tr: 'Saç + Sakal', en: 'Hair + Beard' },
    description: { tr: 'Komple bakım paketi', en: 'Complete grooming package' },
    price: 500,
    durationMinutes: 45,
    active: true,
    sortOrder: 3,
  },
  {
    name: { tr: 'Cilt Bakımı', en: 'Facial Care' },
    description: { tr: 'Yüz bakımı ve maske uygulaması', en: 'Facial care and mask treatment' },
    price: 250,
    durationMinutes: 30,
    active: true,
    sortOrder: 4,
  },
];

const DEFAULT_RULES: Omit<AvailabilityRule, '_id'>[] = [
  { dayOfWeek: 0, openTime: '00:00', closeTime: '00:00', active: false },
  { dayOfWeek: 1, openTime: '00:00', closeTime: '00:00', active: false },
  { dayOfWeek: 2, openTime: '09:00', closeTime: '19:00', active: true },
  { dayOfWeek: 3, openTime: '09:00', closeTime: '19:00', active: true },
  { dayOfWeek: 4, openTime: '09:00', closeTime: '19:00', active: true },
  { dayOfWeek: 5, openTime: '09:00', closeTime: '19:00', active: true },
  { dayOfWeek: 6, openTime: '09:00', closeTime: '19:00', active: true },
];

const DEFAULT_SETTINGS: Omit<ShopSettings, '_id'> = {
  phone: '+90 553 886 50 45',
  whatsapp: 'https://wa.me/905538865045',
  address: 'Günaltay, 4765. Sk. 58/A, 35000 Karabağlar/İzmir',
  owner: 'Aykan Ayazma',
  name: 'Ayazma Hair Styling Saloon',
  defaultLocale: 'tr',
  slotIntervalMinutes: 30,
};

async function seed() {
  const db = await connectDb();

  const servicesCount = await db.collection(COLLECTIONS.services).countDocuments();
  if (servicesCount === 0) {
    await db.collection(COLLECTIONS.services).insertMany(DEFAULT_SERVICES);
    console.log('Seeded services');
  }

  const rulesCount = await db.collection(COLLECTIONS.availabilityRules).countDocuments();
  if (rulesCount === 0) {
    await db.collection(COLLECTIONS.availabilityRules).insertMany(DEFAULT_RULES);
    console.log('Seeded availability rules');
  }

  const settings = await db.collection(COLLECTIONS.shopSettings).findOne({});
  if (!settings) {
    await db.collection(COLLECTIONS.shopSettings).insertOne(DEFAULT_SETTINGS);
    console.log('Seeded shop settings');
  }

  console.log('Seed complete');
  await closeDb();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
