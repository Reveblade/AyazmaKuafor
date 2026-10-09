import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { COLLECTIONS, getDb } from '../db.js';
import { config } from '../config.js';

const scryptAsync = promisify(scrypt);

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, keyHex] = stored.split(':');
  if (!saltHex || !keyHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  const key = Buffer.from(keyHex, 'hex');
  if (derived.length !== key.length) return false;
  return timingSafeEqual(derived, key);
}

async function getStoredPasswordHash(): Promise<string | null> {
  const db = getDb();
  const settings = await db.collection(COLLECTIONS.shopSettings).findOne({});
  const hash = settings?.adminPasswordHash;
  return typeof hash === 'string' ? hash : null;
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const hash = await getStoredPasswordHash();
  if (hash) return verifyPassword(password, hash);
  return password === config.adminPin;
}

export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string,
): Promise<'invalid' | 'ok'> {
  const valid = await verifyAdminPassword(currentPassword);
  if (!valid) return 'invalid';

  const hash = await hashPassword(newPassword);
  const db = getDb();
  await db.collection(COLLECTIONS.shopSettings).updateOne(
    {},
    { $set: { adminPasswordHash: hash } },
    { upsert: true },
  );
  return 'ok';
}
