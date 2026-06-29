export interface WorkingHoursRule {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  active: boolean;
}

/** Monday-first display order (Pazartesi → Pazar). */
export const WEEK_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

function mondayFirstIndex(dayOfWeek: number): number {
  return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
}

function ruleKey(rule: WorkingHoursRule): string {
  if (!rule.active) return 'closed';
  return `open:${rule.openTime}-${rule.closeTime}`;
}

export function formatDaysRange(
  days: number[],
  dayNames: string[],
  twoDaySeparator: string,
): string {
  if (days.length === 0) return '';
  if (days.length === 1) return dayNames[days[0]!] ?? '';
  if (days.length === 2) {
    return `${dayNames[days[0]!]}${twoDaySeparator}${dayNames[days[1]!]}`;
  }
  return `${dayNames[days[0]!]} – ${dayNames[days[days.length - 1]!]}`;
}

function groupClosedDays(days: number[]): number[][] {
  if (!days.length) return [];

  const sorted = [...days].sort((a, b) => mondayFirstIndex(a) - mondayFirstIndex(b));
  const groups: number[][] = [[sorted[0]!]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    if (mondayFirstIndex(curr) === mondayFirstIndex(prev) + 1) {
      groups[groups.length - 1]!.push(curr);
    } else {
      groups.push([curr]);
    }
  }
  return groups;
}

export function formatWorkingHoursDisplay(
  rules: WorkingHoursRule[],
  dayNames: string[],
  formatOpen: (days: string, open: string, close: string) => string,
  formatClosed: (days: string) => string,
  twoDaySeparator = ' & ',
): { openLines: string[]; closedLines: string[] } {
  const ruleMap = new Map(rules.map((rule) => [rule.dayOfWeek, rule]));
  const ordered: WorkingHoursRule[] = WEEK_DISPLAY_ORDER.map(
    (dayOfWeek) =>
      ruleMap.get(dayOfWeek) ?? {
        dayOfWeek,
        openTime: '00:00',
        closeTime: '00:00',
        active: false,
      },
  );

  type OpenGroup = { days: number[]; openTime: string; closeTime: string };
  const openGroups: OpenGroup[] = [];

  for (const rule of ordered) {
    if (!rule.active) continue;
    const key = ruleKey(rule);
    const last = openGroups[openGroups.length - 1];
    const lastKey = last ? `open:${last.openTime}-${last.closeTime}` : null;
    if (last && lastKey === key) {
      last.days.push(rule.dayOfWeek);
    } else {
      openGroups.push({
        days: [rule.dayOfWeek],
        openTime: rule.openTime,
        closeTime: rule.closeTime,
      });
    }
  }

  const openLines = openGroups.map((group) =>
    formatOpen(
      formatDaysRange(group.days, dayNames, twoDaySeparator),
      group.openTime,
      group.closeTime,
    ),
  );

  const closedDays = ordered.filter((rule) => !rule.active).map((rule) => rule.dayOfWeek);
  const closedGroups = groupClosedDays(closedDays);
  const closedGroupSeparator =
    closedGroups.every((group) => group.length === 1) ? twoDaySeparator : ', ';
  const closedLines =
    closedGroups.length > 0
      ? [
          formatClosed(
            closedGroups
              .map((group) => formatDaysRange(group, dayNames, twoDaySeparator))
              .join(closedGroupSeparator),
          ),
        ]
      : [];

  return { openLines, closedLines };
}
