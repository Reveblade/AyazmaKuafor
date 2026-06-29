import type { LocalizedText } from '@/types';

export function localized(text: LocalizedText, locale: string): string {
  return locale === 'en' ? text.en : text.tr;
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
export const ADDRESS = 'Günaltay, 4765. Sk. 58/A, 35000 Karabağlar/İzmir';
export const OWNER = 'Aykan Ayazma';
export const SHOP_NAME = 'Ayazma Hair Styling Saloon';
