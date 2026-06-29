import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { ObjectId } from 'mongodb';
import { connectDb, COLLECTIONS, closeDb } from './db.js';
import type { AvailabilityRule, Service, ServiceCategory, ServiceCombo, ShopSettings } from './types.js';

const DEFAULT_CATEGORIES: Omit<ServiceCategory, '_id'>[] = [
  { name: { tr: 'Saç', en: 'Hair' }, sortOrder: 1, active: true },
  { name: { tr: 'Sakal', en: 'Beard' }, sortOrder: 2, active: true },
  { name: { tr: 'Bakım', en: 'Care' }, sortOrder: 3, active: true },
];

const DEFAULT_SERVICES: Omit<Service, '_id' | 'categoryId'>[] = [
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
    name: { tr: 'Cilt Bakımı', en: 'Facial Care' },
    description: { tr: 'Yüz bakımı ve maske uygulaması', en: 'Facial care and mask treatment' },
    price: 250,
    durationMinutes: 30,
    active: true,
    sortOrder: 3,
  },
];

const SERVICE_CATEGORY_INDEX = [0, 1, 2];

const DEFAULT_COMBO: Omit<ServiceCombo, '_id' | 'serviceIds'> & { serviceIndexes: number[] } = {
  name: { tr: 'Saç + Sakal İndirimi', en: 'Hair + Beard Discount' },
  serviceIndexes: [0, 1],
  discountAmount: 50,
  active: true,
  sortOrder: 1,
};

const DEFAULT_RULES: Omit<AvailabilityRule, '_id'>[] = [
  { dayOfWeek: 0, openTime: '00:00', closeTime: '00:00', active: false },
  { dayOfWeek: 1, openTime: '09:00', closeTime: '22:00', active: true },
  { dayOfWeek: 2, openTime: '09:00', closeTime: '22:00', active: true },
  { dayOfWeek: 3, openTime: '09:00', closeTime: '22:00', active: true },
  { dayOfWeek: 4, openTime: '09:00', closeTime: '22:00', active: true },
  { dayOfWeek: 5, openTime: '09:00', closeTime: '22:00', active: true },
  { dayOfWeek: 6, openTime: '09:00', closeTime: '22:00', active: true },
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

export async function seedBase(db: Awaited<ReturnType<typeof connectDb>>) {

  let categoryIds: ObjectId[] = [];
  const categoriesCount = await db.collection(COLLECTIONS.serviceCategories).countDocuments();
  if (categoriesCount === 0) {
    const result = await db.collection(COLLECTIONS.serviceCategories).insertMany(DEFAULT_CATEGORIES);
    categoryIds = Object.values(result.insertedIds);
    console.log('Seeded service categories');
  } else {
    const existing = await db
      .collection<ServiceCategory>(COLLECTIONS.serviceCategories)
      .find({})
      .sort({ sortOrder: 1 })
      .toArray();
    categoryIds = existing.map((c) => c._id!);
  }

  let serviceIds: ObjectId[] = [];
  const servicesCount = await db.collection(COLLECTIONS.services).countDocuments();
  if (servicesCount === 0) {
    const services = DEFAULT_SERVICES.map((service, i) => ({
      ...service,
      categoryId: categoryIds[SERVICE_CATEGORY_INDEX[i]],
    }));
    const result = await db.collection(COLLECTIONS.services).insertMany(services);
    serviceIds = Object.values(result.insertedIds);
    console.log('Seeded services');
  } else {
    const existing = await db
      .collection<Service>(COLLECTIONS.services)
      .find({})
      .sort({ sortOrder: 1 })
      .toArray();
    serviceIds = existing.map((s) => s._id!);
  }

  const combosCount = await db.collection(COLLECTIONS.serviceCombos).countDocuments();
  if (combosCount === 0 && serviceIds.length >= 2) {
    const { serviceIndexes, ...comboRest } = DEFAULT_COMBO;
    await db.collection(COLLECTIONS.serviceCombos).insertOne({
      ...comboRest,
      serviceIds: serviceIndexes.map((i) => serviceIds[i]),
    });
    console.log('Seeded service combos');
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

  console.log('Base seed complete');
  return { categoryIds, serviceIds };
}

async function runSeed() {
  const db = await connectDb();
  await seedBase(db);
  await closeDb();
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  runSeed().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
