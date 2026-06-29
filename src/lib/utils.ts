import type { LocalizedText } from '@/types';

export function localized(text: LocalizedText, locale: string): string {
  return locale === 'en' ? text.en : text.tr;
}

export function formatPersonName(value: string): string {
  return value.toLocaleUpperCase('tr-TR');
}

export function formatPrice(price: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDate(dateStr: string, locale: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'tr-TR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(y, m - 1, d));
}

export const WHATSAPP_URL = 'https://wa.me/905538865045';
export const PHONE = '+90 553 886 50 45';
export const OWNER = 'Aykan Ayazma';
export const SHOP_NAME = 'Ayazma Hair Styling Saloon';

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function addMinutesToTime(startTime: string, durationMinutes: number): string {
  return minutesToTime(timeToMinutes(startTime) + durationMinutes);
}

export function slotOverlapsRange(
  slotStart: string,
  slotEnd: string,
  rangeStart: string,
  rangeEndMinutes: number,
): boolean {
  const s = timeToMinutes(slotStart);
  const e = timeToMinutes(slotEnd);
  const rStart = timeToMinutes(rangeStart);
  const rEnd = rStart + rangeEndMinutes;
  return s < rEnd && rStart < e;
}
