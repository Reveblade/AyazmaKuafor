import type {
  Appointment,
  AvailabilityBlock,
  AvailabilityRule,
  TimeSlot,
} from '../types.js';

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function rangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  return startA < endB && startB < endA;
}

export function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function computeEndTime(startTime: string, durationMinutes: number): string {
  return minutesToTime(timeToMinutes(startTime) + durationMinutes);
}

export function getAvailableSlots(
  date: string,
  durationMinutes: number,
  slotInterval: number,
  rules: AvailabilityRule[],
  blocks: AvailabilityBlock[],
  appointments: Appointment[],
): TimeSlot[] {
  const dayOfWeek = getDayOfWeek(date);
  const rule = rules.find((r) => r.dayOfWeek === dayOfWeek && r.active);

  if (!rule) return [];

  const dayBlocks = blocks.filter((b) => b.date === date);
  if (dayBlocks.some((b) => b.allDay)) return [];

  const openMin = timeToMinutes(rule.openTime);
  const closeMin = timeToMinutes(rule.closeTime);
  const slots: TimeSlot[] = [];

  const blockingStatuses = new Set(['pending', 'accepted']);
  const dayAppointments = appointments.filter(
    (a) => a.date === date && blockingStatuses.has(a.status),
  );

  for (let start = openMin; start + durationMinutes <= closeMin; start += slotInterval) {
    const end = start + durationMinutes;
    const startTime = minutesToTime(start);
    const endTime = minutesToTime(end);

    const blockedByBlock = dayBlocks.some((block) => {
      if (block.allDay) return true;
      const blockStart = timeToMinutes(block.startTime ?? '00:00');
      const blockEnd = timeToMinutes(block.endTime ?? '23:59');
      return rangesOverlap(start, end, blockStart, blockEnd);
    });

    const blockedByAppointment = dayAppointments.some((appt) => {
      const apptStart = timeToMinutes(appt.startTime);
      const apptEnd = timeToMinutes(appt.endTime);
      return rangesOverlap(start, end, apptStart, apptEnd);
    });

    slots.push({
      startTime,
      endTime,
      available: !blockedByBlock && !blockedByAppointment,
    });
  }

  return slots;
}

export function isDateOpen(
  date: string,
  rules: AvailabilityRule[],
  blocks: AvailabilityBlock[],
): boolean {
  const dayOfWeek = getDayOfWeek(date);
  const rule = rules.find((r) => r.dayOfWeek === dayOfWeek && r.active);
  if (!rule) return false;
  const dayBlocks = blocks.filter((b) => b.date === date);
  return !dayBlocks.some((b) => b.allDay);
}

export function getMonthAvailabilitySummary(
  year: number,
  month: number,
  rules: AvailabilityRule[],
  blocks: AvailabilityBlock[],
  appointments: Appointment[],
  defaultDuration: number,
  slotInterval: number,
): Record<string, 'closed' | 'available' | 'full'> {
  const result: Record<string, 'closed' | 'available' | 'full'> = {};
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!isDateOpen(date, rules, blocks)) {
      result[date] = 'closed';
      continue;
    }
    const slots = getAvailableSlots(
      date,
      defaultDuration,
      slotInterval,
      rules,
      blocks,
      appointments,
    );
    const availableCount = slots.filter((s) => s.available).length;
    if (availableCount === 0) result[date] = 'full';
    else result[date] = 'available';
  }

  return result;
}
