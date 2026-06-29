import type { AppointmentStatus } from '../types.js';

export const PAST_STATUSES = ['completed', 'rejected', 'cancelled'] as const;
export const CURRENT_STATUSES = ['pending', 'accepted'] as const;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function getNowDateTimeParts() {
  const now = new Date();
  return {
    today: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    nowTime: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

export function buildPastScopeFilter() {
  const { today, nowTime } = getNowDateTimeParts();
  return {
    $or: [
      { date: { $lt: today } },
      { date: today, startTime: { $lt: nowTime } },
      { status: { $in: [...PAST_STATUSES, ...CURRENT_STATUSES] } },
    ],
  };
}

export function buildUpcomingDateTimeFilter() {
  const { today, nowTime } = getNowDateTimeParts();
  return {
    $or: [{ date: { $gt: today } }, { date: today, startTime: { $gte: nowTime } }],
  };
}

export function buildMonthDateFilter(month: string) {
  const [yearStr, monthStr] = month.split('-');
  const year = Number.parseInt(yearStr, 10);
  const monthIndex = Number.parseInt(monthStr, 10);
  if (!year || monthIndex < 1 || monthIndex > 12) return null;

  const monthStart = `${yearStr}-${monthStr}-01`;
  const lastDay = new Date(year, monthIndex, 0).getDate();
  const monthEnd = `${yearStr}-${monthStr}-${pad(lastDay)}`;
  return { date: { $gte: monthStart, $lte: monthEnd } };
}

export function isPastStatus(status: string): status is (typeof PAST_STATUSES)[number] {
  return (PAST_STATUSES as readonly string[]).includes(status);
}

export function isCurrentStatus(status: string): status is (typeof CURRENT_STATUSES)[number] {
  return (CURRENT_STATUSES as readonly string[]).includes(status);
}

export function isAppointmentStatus(status: string): status is AppointmentStatus {
  return isPastStatus(status) || isCurrentStatus(status);
}
