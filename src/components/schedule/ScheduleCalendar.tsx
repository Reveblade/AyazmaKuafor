import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { tr } from 'date-fns/locale';
import { adminApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { DaySchedulePanel } from './DaySchedulePanel';

type DayStatus = 'closed' | 'available' | 'full' | 'past';

export function ScheduleCalendar() {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [blockedStarts, setBlockedStarts] = useState<Set<string>>(new Set());
  const today = startOfDay(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  const { data: monthData } = useQuery({
    queryKey: ['month-availability', year, month],
    queryFn: () => adminApi.getMonthAvailability(year, month),
  });

  const { data: scheduleData, isFetching: scheduleFetching } = useQuery({
    queryKey: ['day-schedule', selectedDate],
    queryFn: () => adminApi.getDaySchedule(selectedDate!),
    enabled: !!selectedDate,
    placeholderData: keepPreviousData,
  });

  const scheduleReady = scheduleData?.date === selectedDate;
  const schedule = scheduleReady ? scheduleData : undefined;
  const scheduleLoading = !!selectedDate && !scheduleReady && scheduleFetching;

  useEffect(() => {
    if (!schedule) return;
    if (schedule.allDayBlocked) {
      setBlockedStarts(new Set());
      return;
    }
    const blocked = schedule.slots
      .filter((s) => s.status === 'blocked')
      .map((s) => s.startTime);
    setBlockedStarts(new Set(blocked));
  }, [schedule]);

  const saveSchedule = useMutation({
    mutationFn: (payload: { allDay: boolean; blockedStarts: string[] }) =>
      adminApi.saveDaySchedule(selectedDate!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-schedule', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['month-availability'] });
      queryClient.invalidateQueries({ queryKey: ['availability-blocks'] });
    },
  });

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const startPadding = (startOfMonth(currentMonth).getDay() + 6) % 7;
  const weekDays = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

  function getDayStatus(date: Date): DayStatus {
    if (isBefore(date, today)) return 'past';
    const key = format(date, 'yyyy-MM-dd');
    return monthData?.summary[key] ?? 'closed';
  }

  const statusColors: Record<DayStatus, string> = {
    available: 'bg-accent/20 border-accent text-accent hover:bg-accent/30 cursor-pointer',
    full: 'bg-text-muted/10 border-border text-text-muted hover:bg-text-muted/20 cursor-pointer',
    closed: 'bg-surface border-border text-text-muted/70 hover:border-text-muted cursor-pointer',
    past: 'bg-transparent border-transparent text-text-muted/30 cursor-not-allowed',
  };

  const handleToggleSlot = (startTime: string) => {
    if (!selectedDate || !schedule) return;
    const slot = schedule.slots.find((s) => s.startTime === startTime);
    if (!slot || slot.status === 'booked') return;

    const next = new Set(blockedStarts);
    if (next.has(startTime)) next.delete(startTime);
    else next.add(startTime);

    setBlockedStarts(next);
    saveSchedule.mutate({
      allDay: false,
      blockedStarts: [...next].sort(),
    });
  };

  const handleToggleAllDay = () => {
    if (!selectedDate || !schedule) return;

    if (schedule.allDayBlocked) {
      saveSchedule.mutate({ allDay: false, blockedStarts: [] });
    } else {
      saveSchedule.mutate({ allDay: true, blockedStarts: [] });
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
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
            {format(currentMonth, 'MMMM yyyy', { locale: tr })}
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
          {weekDays.map((d) => (
            <span key={d}>{d}</span>
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
            const selectable = status !== 'past';

            return (
              <button
                key={dateStr}
                type="button"
                disabled={!selectable}
                onClick={() => selectable && setSelectedDate(dateStr)}
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
            <span className="w-3 h-3 rounded-sm bg-accent/20 border border-accent" /> Müsait
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-text-muted/10 border border-border" /> Dolu
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm border border-border line-through" /> Kapalı
          </span>
        </div>
      </div>

      {selectedDate ? (
        <DaySchedulePanel
          date={selectedDate}
          schedule={schedule}
          isLoading={scheduleLoading}
          blockedStarts={blockedStarts}
          onToggleSlot={handleToggleSlot}
          onToggleAllDay={handleToggleAllDay}
          isSaving={saveSchedule.isPending}
        />
      ) : (
        <div className="border border-border rounded-sm p-4 bg-surface min-h-[320px] flex items-center justify-center">
          <p className="text-text-muted text-sm">Saatleri düzenlemek için takvimden bir gün seçin.</p>
        </div>
      )}
    </div>
  );
}
