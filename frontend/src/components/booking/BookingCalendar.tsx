import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isBefore,
  isSameMonth,
  startOfDay,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { tr, enGB } from 'date-fns/locale';
import { cn } from '@/lib/cn';
import { getLocale } from '@/i18n';
import type { DayAvailability } from '@/types';

type DayStatus = DayAvailability | 'past';

interface BookingCalendarProps {
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  monthSummary?: Record<string, DayAvailability>;
  onPrefetchDate?: (date: string) => void;
}

export function BookingCalendar({
  currentMonth,
  onMonthChange,
  selectedDate,
  onSelectDate,
  monthSummary,
  onPrefetchDate,
}: BookingCalendarProps) {
  const { t } = useTranslation();
  const locale = getLocale();
  const dateLocale = locale === 'tr' ? tr : enGB;
  const today = startOfDay(new Date());

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const startPadding = (startOfMonth(currentMonth).getDay() + 6) % 7;
  const weekDaysTr = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];
  const weekDaysEn = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const weekDays = locale === 'en' ? weekDaysEn : weekDaysTr;

  function getDayStatus(date: Date): DayStatus {
    if (isBefore(date, today)) return 'past';
    const key = format(date, 'yyyy-MM-dd');
    return monthSummary?.[key] ?? 'closed';
  }

  const statusColors: Record<DayStatus, string> = {
    available: 'bg-accent/20 border-accent text-accent hover:bg-accent/30 cursor-pointer',
    full: 'bg-text-muted/10 border-border text-text-muted hover:bg-text-muted/20 cursor-pointer',
    closed: 'bg-surface border-border text-text-muted/50 cursor-not-allowed line-through',
    past: 'bg-transparent border-transparent text-text-muted/30 cursor-not-allowed',
  };

  return (
    <div className="border border-border rounded-sm p-4 bg-surface h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          className="p-2 text-text-muted hover:text-accent"
        >
          ‹
        </button>
        <h3 className="font-display uppercase tracking-wider">
          {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
        </h3>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          className="p-2 text-text-muted hover:text-accent"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-text-muted uppercase mb-2">
        {weekDays.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 flex-1">
        {Array.from({ length: startPadding }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const status = getDayStatus(day);
          const isSelected = selectedDate === dateStr;
          const selectable = status === 'available' || status === 'full';

          return (
            <button
              key={dateStr}
              type="button"
              disabled={!selectable}
              onClick={() => selectable && onSelectDate(dateStr)}
              onMouseEnter={() => selectable && onPrefetchDate?.(dateStr)}
              className={cn(
                'aspect-square flex items-center justify-center text-sm border rounded-sm transition-colors',
                statusColors[status],
                isSelected && 'ring-2 ring-accent ring-offset-1 ring-offset-surface',
                !isSameMonth(day, currentMonth) && 'opacity-40',
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-accent/20 border border-accent" /> {t('booking.availableDay')}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-text-muted/10 border border-border" /> {t('booking.fullDay')}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm border border-border line-through" /> {t('booking.closedDay')}
        </span>
      </div>
    </div>
  );
}
