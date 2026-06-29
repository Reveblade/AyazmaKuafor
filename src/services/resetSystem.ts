import { COLLECTIONS, getDb } from '../db.js';
import { seedBase } from '../seed.js';
import { verifyAdminPassword } from './adminAuth.js';

export async function resetSystem(password: string): Promise<'invalid' | 'ok'> {
  const valid = await verifyAdminPassword(password);
  if (!valid) return 'invalid';

  const db = getDb();
  const settings = await db.collection(COLLECTIONS.shopSettings).findOne({});
  const adminPasswordHash = settings?.adminPasswordHash;

  await Promise.all(
    Object.values(COLLECTIONS).map((name) => db.collection(name).deleteMany({})),
  );

  await seedBase(db);

  if (adminPasswordHash) {
    await db.collection(COLLECTIONS.shopSettings).updateOne({}, { $set: { adminPasswordHash } });
  }

  return 'ok';
}
