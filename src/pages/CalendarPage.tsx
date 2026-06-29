import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import { adminApi } from '@/lib/api';
import { cn } from '@/lib/utils';

export function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));

  const monthStart = format(currentMonth, 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  const { data: appointments } = useQuery({
    queryKey: ['appointments', 'calendar', monthStart],
    queryFn: () => adminApi.getAppointments(),
  });

  const monthAppointments = useMemo(() => {
    return appointments?.filter((a) => a.date >= monthStart && a.date <= monthEnd) ?? [];
  }, [appointments, monthStart, monthEnd]);

  const byDate = useMemo(() => {
    const map = new Map<string, typeof monthAppointments>();
    for (const a of monthAppointments) {
      const list = map.get(a.date) ?? [];
      list.push(a);
      map.set(a.date, list);
    }
    return map;
  }, [monthAppointments]);

  const days = eachDayOfInterval({ start: currentMonth, end: endOfMonth(currentMonth) });
  const startPadding = currentMonth.getDay();

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Takvim</h1>

      <div className="mt-6 flex items-center justify-between max-w-2xl">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="text-text-muted hover:text-accent p-2">‹</button>
        <h2 className="font-display uppercase tracking-wider">
          {format(currentMonth, 'MMMM yyyy', { locale: tr })}
        </h2>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="text-text-muted hover:text-accent p-2">›</button>
      </div>

      <div className="mt-6 max-w-2xl grid grid-cols-7 gap-1">
        {Array.from({ length: startPadding }).map((_, i) => <div key={`p-${i}`} />)}
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayAppts = byDate.get(dateStr) ?? [];
          return (
            <div
              key={dateStr}
              className={cn(
                'min-h-20 border border-border rounded-sm p-1 text-sm',
                dayAppts.length > 0 && 'bg-accent/5',
              )}
            >
              <span className="text-text-muted">{format(day, 'd')}</span>
              {dayAppts.map((a) => (
                <div key={a.id} className="text-xs mt-0.5 truncate text-accent">
                  {a.startTime} {a.firstName}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
