export function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export function formatDurationTr(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0 dk';
  if (totalMinutes < 60) return `${totalMinutes} dk`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return hours === 1 ? '1 saat' : `${hours} saat`;
  }

  const hourPart = hours === 1 ? '1 saat' : `${hours} saat`;
  return `${hourPart} ${minutes} dk`;
}

export function formatSelectedDurationLabel(slotCount: number, slotIntervalMinutes: number): string {
  return `${formatDurationTr(slotCount * slotIntervalMinutes)} seçildi`;
}

function padTimePart(n: number) {
  return String(n).padStart(2, '0');
}

export function getLocalTodayAndTime() {
  const now = new Date();
  return {
    today: `${now.getFullYear()}-${padTimePart(now.getMonth() + 1)}-${padTimePart(now.getDate())}`,
    nowTime: `${padTimePart(now.getHours())}:${padTimePart(now.getMinutes())}`,
  };
}

export function filterPastSlotsForToday<T extends { startTime: string }>(date: string, slots: T[]): T[] {
  const { today, nowTime } = getLocalTodayAndTime();
  if (date !== today) return slots;
  return slots.filter((slot) => slot.startTime >= nowTime);
}

export const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
