const MAX_DIGITS = 10;

export function parsePhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('90')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, MAX_DIGITS);
}

export function formatPhoneDisplay(digits: string): string {
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 3));
  if (digits.length > 3) parts.push(digits.slice(3, 6));
  if (digits.length > 6) parts.push(digits.slice(6, 8));
  if (digits.length > 8) parts.push(digits.slice(8, 10));
  return parts.join(' ');
}

export function formatPhoneFull(digits: string): string {
  if (!digits) return '';
  return `+90 ${formatPhoneDisplay(digits)}`;
}

export function isValidTurkishMobile(digits: string): boolean {
  return /^5\d{9}$/.test(digits);
}

export function phoneDigitsFromStored(value: string): string {
  return parsePhoneDigits(value);
}
