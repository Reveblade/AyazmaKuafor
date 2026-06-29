import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { adminApi, type Appointment } from '@/lib/api';
import { cn } from '@/lib/utils';

type AppointmentStatus = Appointment['status'];

const statusLabels: Record<AppointmentStatus, string> = {
  pending: 'Beklemede',
  accepted: 'Onaylandı',
  rejected: 'Reddedildi',
  cancelled: 'İptal',
  completed: 'Tamamlandı',
};

const statusColors: Record<AppointmentStatus, string> = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  accepted: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-danger/10 text-danger border-danger/30',
  cancelled: 'bg-bg text-text-muted border-border',
  completed: 'bg-accent/10 text-accent border-accent/30',
};

function formatDayHeader(date: string) {
  return format(parseISO(date), 'd MMMM yyyy, EEEE', { locale: tr });
}

export function CalendarPage() {
  const thisMonth = startOfMonth(new Date());
  const [currentMonth, setCurrentMonth] = useState(thisMonth);

  const monthKey = format(currentMonth, 'yyyy-MM');
  const monthStart = format(currentMonth, 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', 'calendar', monthKey],
    queryFn: () => adminApi.getAppointments({ scope: 'current', month: monthKey }),
    refetchInterval: 15000,
  });

  const daysWithAppointments = useMemo(() => {
    const byDate = new Map<string, Appointment[]>();

    for (const appointment of appointments ?? []) {
      if (appointment.date < monthStart || appointment.date > monthEnd) continue;
      const list = byDate.get(appointment.date) ?? [];
      list.push(appointment);
      byDate.set(appointment.date, list);
    }

    return Array.from(byDate.entries())
      .map(([date, dayAppointments]) => ({
        date,
        appointments: dayAppointments.sort((a, b) => a.startTime.localeCompare(b.startTime)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [appointments, monthStart, monthEnd]);

  return (
    <div className="w-full">
      <h1 className="font-display text-2xl sm:text-3xl uppercase">Takvim</h1>

      <div className="mt-6 flex items-center justify-between w-full">
        <button
          type="button"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          disabled={currentMonth <= thisMonth}
          className="text-text-muted hover:text-accent p-2 text-xl leading-none disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Önceki ay"
        >
          ‹
        </button>
        <h2 className="font-display uppercase tracking-wider text-lg sm:text-xl">
          {format(currentMonth, 'MMMM yyyy', { locale: tr })}
        </h2>
        <button
          type="button"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="text-text-muted hover:text-accent p-2 text-xl leading-none"
          aria-label="Sonraki ay"
        >
          ›
        </button>
      </div>

      {isLoading && <p className="mt-8 text-text-muted">Yükleniyor...</p>}

      {!isLoading && daysWithAppointments.length === 0 && (
        <p className="mt-8 text-text-muted text-sm">Bu ay için gelecek randevu bulunmuyor.</p>
      )}

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 w-full">
        {daysWithAppointments.map(({ date, appointments: dayAppointments }) => (
          <div
            key={date}
            className="bg-surface border border-border rounded-sm p-4 sm:p-5 flex flex-col min-h-[12rem]"
          >
            <p className="font-display text-sm sm:text-base uppercase leading-snug border-b border-border pb-3">
              {formatDayHeader(date)}
            </p>

            <div className="mt-3 flex flex-col gap-2 flex-1">
              {dayAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="bg-bg/60 border border-border rounded-sm px-3 py-2.5 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-display uppercase truncate">
                      {appointment.firstName} {appointment.lastName}
                    </p>
                    <p className="text-sm text-text-muted tabular-nums mt-0.5">
                      {appointment.startTime} – {appointment.endTime}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'self-start shrink-0 px-2 py-0.5 rounded-sm text-xs uppercase tracking-wider border',
                      statusColors[appointment.status],
                    )}
                  >
                    {statusLabels[appointment.status]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
