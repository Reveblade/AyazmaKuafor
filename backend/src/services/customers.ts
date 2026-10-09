import type { Db } from 'mongodb';
import { COLLECTIONS } from '../db.js';
import type { Customer, CustomerDebtEntry } from '../types.js';

export function normalizePhoneDigits(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('90')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 10);
}

export function buildAppointmentPhoneQuery(phoneDigits: string) {
  const pattern = phoneDigits.split('').join('\\D*');
  return { phone: { $regex: pattern } };
}

export function serializeCustomerDebtEntry(entry: CustomerDebtEntry) {
  const createdAt = entry.createdAt instanceof Date ? entry.createdAt : new Date(entry.createdAt);
  return {
    id: entry.id,
    amount: entry.amount,
    note: entry.note ?? '',
    createdAt: createdAt.toISOString(),
  };
}

export function serializeCustomer(customer: Customer) {
  return {
    id: String(customer._id),
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    debtBalance: customer.debtBalance ?? 0,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}

export function serializeCustomerDetail(customer: Customer) {
  const history = [...(customer.debtHistory ?? [])].sort((a, b) => {
    const aTime = (a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)).getTime();
    const bTime = (b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)).getTime();
    return bTime - aTime;
  });
  return {
    ...serializeCustomer(customer),
    debtHistory: history.map(serializeCustomerDebtEntry),
  };
}

export async function upsertCustomer(
  db: Db,
  data: { firstName: string; lastName: string; phone: string },
): Promise<Customer> {
  const phoneDigits = normalizePhoneDigits(data.phone);
  const now = new Date();

  const result = await db.collection<Customer>(COLLECTIONS.customers).findOneAndUpdate(
    { phoneDigits },
    {
      $set: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        updatedAt: now,
      },
      $setOnInsert: {
        phoneDigits,
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: 'after' },
  );

  if (!result) throw new Error('Customer upsert failed');
  return result;
}
