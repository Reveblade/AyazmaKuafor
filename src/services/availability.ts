import type {
  Appointment,
  AvailabilityBlock,
  AvailabilityRule,
  ScheduleSlot,
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

export function isSlotInPast(date: string, startTime: string): boolean {
  const { today, nowTime } = getLocalTodayAndTime();
  return date === today && startTime < nowTime;
}

export function filterPastSlotsForToday<T extends { startTime: string }>(date: string, slots: T[]): T[] {
  if (date !== getLocalTodayAndTime().today) return slots;
  return slots.filter((slot) => !isSlotInPast(date, slot.startTime));
}

export function computeEndTime(startTime: string, durationMinutes: number): string {
  return minutesToTime(timeToMinutes(startTime) + durationMinutes);
}

/** Round total service duration to the nearest slot count (e.g. 70→60, 80→90 with 30-min slots). */
export function roundDurationToSlots(totalMinutes: number, slotInterval: number): number {
  if (totalMinutes <= 0) return slotInterval;
  const slots = Math.round(totalMinutes / slotInterval);
  return Math.max(1, slots) * slotInterval;
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

  return filterPastSlotsForToday(date, slots);
}

export function getDaySchedule(
  date: string,
  slotInterval: number,
  rules: AvailabilityRule[],
  blocks: AvailabilityBlock[],
  appointments: Appointment[],
  durationMinutes = slotInterval,
): {
  openTime: string | null;
  closeTime: string | null;
  closed: boolean;
  allDayBlocked: boolean;
  slots: ScheduleSlot[];
} {
  const dayOfWeek = getDayOfWeek(date);
  const rule = rules.find((r) => r.dayOfWeek === dayOfWeek && r.active);

  if (!rule) {
    return { openTime: null, closeTime: null, closed: true, allDayBlocked: false, slots: [] };
  }

  const dayBlocks = blocks.filter((b) => b.date === date);
  const allDayBlocked = dayBlocks.some((b) => b.allDay);
  if (allDayBlocked) {
    return {
      openTime: rule.openTime,
      closeTime: rule.closeTime,
      closed: false,
      allDayBlocked: true,
      slots: [],
    };
  }

  const openMin = timeToMinutes(rule.openTime);
  const closeMin = timeToMinutes(rule.closeTime);
  const blockingStatuses = new Set(['pending', 'accepted']);
  const dayAppointments = appointments.filter(
    (a) => a.date === date && blockingStatuses.has(a.status),
  );

  const bookableSlots = getAvailableSlots(
    date,
    durationMinutes,
    slotInterval,
    rules,
    blocks,
    appointments,
  );
  const bookableStarts = new Set(
    bookableSlots.filter((s) => s.available).map((s) => s.startTime),
  );

  const slots: ScheduleSlot[] = [];

  for (let start = openMin; start + slotInterval <= closeMin; start += slotInterval) {
    const end = start + slotInterval;
    const startTime = minutesToTime(start);
    const endTime = minutesToTime(end);

    const blockedByBlock = dayBlocks.some((block) => {
      const blockStart = timeToMinutes(block.startTime ?? '00:00');
      const blockEnd = timeToMinutes(block.endTime ?? '23:59');
      return rangesOverlap(start, end, blockStart, blockEnd);
    });

    const booked = dayAppointments.some((appt) => {
      const apptStart = timeToMinutes(appt.startTime);
      const apptEnd = timeToMinutes(appt.endTime);
      return rangesOverlap(start, end, apptStart, apptEnd);
    });

    let status: ScheduleSlot['status'] = 'available';
    if (blockedByBlock) status = 'blocked';
    else if (booked) status = 'booked';

    slots.push({
      startTime,
      endTime,
      status,
      bookable: status === 'available' && bookableStarts.has(startTime),
    });
  }

  return {
    openTime: rule.openTime,
    closeTime: rule.closeTime,
    closed: false,
    allDayBlocked: false,
    slots: filterPastSlotsForToday(date, slots),
  };
}

export function mergeBlockedStarts(
  blockedStarts: string[],
  slotInterval: number,
): { startTime: string; endTime: string }[] {
  if (blockedStarts.length === 0) return [];

  const sorted = [...blockedStarts].sort(
    (a, b) => timeToMinutes(a) - timeToMinutes(b),
  );
  const ranges: { startTime: string; endTime: string }[] = [];
  let rangeStart = sorted[0];
  let rangeEnd = minutesToTime(timeToMinutes(sorted[0]) + slotInterval);

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const expectedNext = minutesToTime(timeToMinutes(sorted[i - 1]) + slotInterval);
    if (current === expectedNext) {
      rangeEnd = minutesToTime(timeToMinutes(current) + slotInterval);
    } else {
      ranges.push({ startTime: rangeStart, endTime: rangeEnd });
      rangeStart = current;
      rangeEnd = minutesToTime(timeToMinutes(current) + slotInterval);
    }
  }

  ranges.push({ startTime: rangeStart, endTime: rangeEnd });
  return ranges;
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
