import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { api } from '@/lib/api';
import { getLocale } from '@/i18n';
import type { DayAvailability } from '@/types';

interface AvailabilityCalendarProps {
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  serviceIds: string[];
}

export function AvailabilityCalendar({
  selectedDate,
  onSelectDate,
  serviceIds,
}: AvailabilityCalendarProps) {
  const { t } = useTranslation();
  const locale = getLocale();
  const dateLocale = locale === 'tr' ? tr : enGB;
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const today = startOfDay(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  const { data } = useQuery({
    queryKey: ['month-availability', year, month, serviceIds],
    queryFn: () => api.getMonthAvailability(year, month, serviceIds),
    enabled: serviceIds.length > 0,
  });

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const startPadding = startOfMonth(currentMonth).getDay();

  function getDayStatus(date: Date): DayAvailability | 'past' {
    if (isBefore(date, today)) return 'past';
    const key = format(date, 'yyyy-MM-dd');
    return data?.summary[key] ?? 'closed';
  }

  const statusColors: Record<DayAvailability | 'past', string> = {
    available: 'bg-accent/20 border-accent text-accent hover:bg-accent/30 cursor-pointer',
    full: 'bg-text-muted/10 border-border text-text-muted cursor-not-allowed',
    closed: 'bg-surface border-border text-text-muted/50 cursor-not-allowed line-through',
    past: 'bg-transparent border-transparent text-text-muted/30 cursor-not-allowed',
  };

  return (
    <div className="border border-border rounded-sm p-4 bg-surface">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 text-text-muted hover:text-accent"
        >
          ‹
        </button>
        <h3 className="font-display uppercase tracking-wider">
          {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
        </h3>
        <button
          type="button"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 text-text-muted hover:text-accent"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-text-muted uppercase mb-2">
        {['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'].map((d, i) => (
          <span key={i}>{locale === 'en' ? ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][i] : d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startPadding }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const status = getDayStatus(day);
          const isSelected = selectedDate === dateStr;
          const selectable = status === 'available';

          return (
            <button
              key={dateStr}
              type="button"
              disabled={!selectable}
              onClick={() => selectable && onSelectDate(dateStr)}
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
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-accent/20 border border-accent" /> {t('booking.availableDay')}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-text-muted/10 border border-border" /> {t('booking.fullDay')}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm border border-border line-through" /> {t('booking.closedDay')}</span>
      </div>
    </div>
  );
}