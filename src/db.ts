import { MongoClient, Db } from 'mongodb';
import { config } from './config.js';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDb(): Promise<Db> {
  if (db) return db;
  client = new MongoClient(config.mongodbUri, {
    serverSelectionTimeoutMS: 5000,
  });
  try {
    await client.connect();
    await client.db().command({ ping: 1 });
  } catch (err) {
    await client.close().catch(() => undefined);
    client = null;
    throw new Error(
      `MongoDB connection failed (${config.mongodbUri}). Start MongoDB locally or set MONGODB_URI to Atlas.`,
      { cause: err },
    );
  }
  db = client.db();
  return db;
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

export function getDb(): Db {
  if (!db) throw new Error('Database not connected');
  return db;
}

export const COLLECTIONS = {
  services: 'services',
  serviceCombos: 'service_combos',
  appointments: 'appointments',
  availabilityRules: 'availability_rules',
  availabilityBlocks: 'availability_blocks',
  shopSettings: 'shop_settings',
  serviceCategories: 'service_categories',
} as const;
