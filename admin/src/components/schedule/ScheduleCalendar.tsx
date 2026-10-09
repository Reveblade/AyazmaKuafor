import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { cn, filterPastSlotsForToday, formatDurationTr } from '@/lib/utils';
import { DaySchedulePanel, type SchedulePanelMode } from './DaySchedulePanel';
import { CreateAppointmentDialog } from './CreateAppointmentDialog';

type DayStatus = 'closed' | 'available' | 'full' | 'past';

type ScheduleCalendarProps = {
  panelMode: SchedulePanelMode;
  onPanelModeChange: (mode: SchedulePanelMode) => void;
};

export function ScheduleCalendar({ panelMode, onPanelModeChange }: ScheduleCalendarProps) {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [blockedStarts, setBlockedStarts] = useState<Set<string>>(new Set());
  const [selectedStartTimes, setSelectedStartTimes] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const lastBookingClickRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<{
    date: string;
    allDay: boolean;
    blockedStarts: string[];
  } | null>(null);
  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;
  const [hasPendingSave, setHasPendingSave] = useState(false);
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
  const visibleScheduleSlots = useMemo(
    () => (schedule && selectedDate ? filterPastSlotsForToday(selectedDate, schedule.slots) : []),
    [schedule, selectedDate],
  );

  useEffect(() => {
    setSelectedStartTimes(new Set());
    setDialogOpen(false);
    lastBookingClickRef.current = null;
  }, [selectedDate]);

  useEffect(() => {
    if (panelMode === 'block') {
      setSelectedStartTimes(new Set());
      setDialogOpen(false);
      lastBookingClickRef.current = null;
    }
  }, [panelMode]);

  useEffect(() => {
    if (!schedule) return;
    if (schedule.allDayBlocked) {
      setBlockedStarts(new Set());
      return;
    }
    const blocked = visibleScheduleSlots
      .filter((s) => s.status === 'blocked')
      .map((s) => s.startTime);
    setBlockedStarts(new Set(blocked));
  }, [schedule, visibleScheduleSlots]);

  const saveSchedule = useMutation({
    mutationFn: ({
      date,
      allDay,
      blockedStarts,
    }: {
      date: string;
      allDay: boolean;
      blockedStarts: string[];
    }) => adminApi.saveDaySchedule(date, { allDay, blockedStarts }),
    onSuccess: (data, { date }) => {
      queryClient.setQueryData(['day-schedule', date], data);
      queryClient.invalidateQueries({ queryKey: ['month-availability'] });
    },
    onSettled: () => setHasPendingSave(false),
  });

  const flushScheduleSave = useCallback(() => {
    const pending = pendingSaveRef.current;
    if (!pending) return;
    pendingSaveRef.current = null;
    saveSchedule.mutate(pending);
  }, [saveSchedule]);

  const queueScheduleSave = useCallback(
    (payload: { allDay: boolean; blockedStarts: string[] }, immediate = false) => {
      const date = selectedDateRef.current;
      if (!date) return;
      pendingSaveRef.current = { date, ...payload };
      setHasPendingSave(true);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (immediate) {
        flushScheduleSave();
      } else {
        saveTimerRef.current = setTimeout(flushScheduleSave, 500);
      }
    },
    [flushScheduleSave],
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const pending = pendingSaveRef.current;
      if (pending) {
        pendingSaveRef.current = null;
        adminApi.saveDaySchedule(pending.date, {
          allDay: pending.allDay,
          blockedStarts: pending.blockedStarts,
        });
      }
    };
  }, [selectedDate]);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const calendarRef = useRef<HTMLDivElement>(null);
  const [calendarHeight, setCalendarHeight] = useState<number>();
  const [isWideLayout, setIsWideLayout] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  );
  const startPadding = (startOfMonth(currentMonth).getDay() + 6) % 7;
  const weekDays = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];
  const panelHeightStyle =
    isWideLayout && calendarHeight ? { height: calendarHeight } : undefined;
  const panelWrapperClass = 'min-h-[320px] lg:min-h-0 lg:overflow-hidden flex flex-col h-full';

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsWideLayout(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const el = calendarRef.current;
    if (!el) return;

    const updateHeight = () => setCalendarHeight(el.offsetHeight);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, [currentMonth, days.length, startPadding]);

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

  const handleSelectBookingSlot = (startTime: string, shiftKey: boolean) => {
    if (!schedule) return;

    if (shiftKey && lastBookingClickRef.current) {
      const allTimes = visibleScheduleSlots.map((s) => s.startTime);
      const fromIndex = allTimes.indexOf(lastBookingClickRef.current);
      const toIndex = allTimes.indexOf(startTime);
      if (fromIndex >= 0 && toIndex >= 0) {
        const [start, end] = fromIndex < toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex];
        const rangeTimes = visibleScheduleSlots
          .slice(start, end + 1)
          .filter((s) => s.status === 'available')
          .map((s) => s.startTime);
        setSelectedStartTimes((prev) => {
          const next = new Set(prev);
          const removeRange = next.has(startTime);
          for (const time of rangeTimes) {
            if (removeRange) next.delete(time);
            else next.add(time);
          }
          return next;
        });
        lastBookingClickRef.current = startTime;
        return;
      }
    }

    lastBookingClickRef.current = startTime;
    setSelectedStartTimes((prev) => {
      const next = new Set(prev);
      if (next.has(startTime)) next.delete(startTime);
      else next.add(startTime);
      return next;
    });
  };

  const sortedSelectedTimes = [...selectedStartTimes].sort();
  const slotInterval = schedule?.slotInterval ?? 30;
  const selectedDurationLabel = formatDurationTr(selectedStartTimes.size * slotInterval);

  const handleToggleSlot = (startTime: string) => {
    if (!selectedDate || !schedule) return;
    const slot = visibleScheduleSlots.find((s) => s.startTime === startTime);
    if (!slot || slot.status === 'booked') return;

    const next = new Set(blockedStarts);
    if (next.has(startTime)) next.delete(startTime);
    else next.add(startTime);

    setBlockedStarts(next);
    queueScheduleSave({ allDay: false, blockedStarts: [...next].sort() });
  };

  const handleToggleAllDay = () => {
    if (!selectedDate || !schedule) return;

    if (schedule.allDayBlocked) {
      queueScheduleSave({ allDay: false, blockedStarts: [] }, true);
    } else {
      queueScheduleSave({ allDay: true, blockedStarts: [] }, true);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
      <div
        ref={calendarRef}
        className="border border-border rounded-sm p-4 bg-surface h-full"
      >
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
        <div className={panelWrapperClass} style={panelHeightStyle}>
          <DaySchedulePanel
            date={selectedDate}
            schedule={schedule}
            isLoading={scheduleLoading}
            mode={panelMode}
            blockedStarts={blockedStarts}
            selectedStartTimes={selectedStartTimes}
            onToggleSlot={handleToggleSlot}
            onSelectBookingSlot={handleSelectBookingSlot}
            onToggleAllDay={handleToggleAllDay}
            isSaving={saveSchedule.isPending || hasPendingSave}
          />
          {panelMode === 'book' && selectedStartTimes.size > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 shrink-0">
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="flex-1 min-w-[140px] px-4 py-2.5 bg-accent/20 text-accent border border-accent/40 rounded-sm text-sm uppercase tracking-wider"
              >
                Randevu Oluştur · {selectedDurationLabel}
              </button>
              <button
                type="button"
                onClick={() => setSelectedStartTimes(new Set())}
                className="px-4 py-2.5 border border-border rounded-sm text-sm uppercase tracking-wider text-text-muted hover:text-text"
              >
                Seçimi Temizle
              </button>
            </div>
          )}
          <CreateAppointmentDialog
            open={dialogOpen}
            date={selectedDate}
            startTimes={sortedSelectedTimes}
            onClose={() => setDialogOpen(false)}
            onSuccess={() => {
              setSelectedStartTimes(new Set());
              onPanelModeChange('block');
            }}
          />
        </div>
      ) : (
        <div
          className={cn(
            panelWrapperClass,
            'border border-border rounded-sm p-4 bg-surface items-center justify-center',
          )}
          style={panelHeightStyle}
        >
          <p className="text-text-muted text-sm">Saatleri düzenlemek için takvimden bir gün seçin.</p>
        </div>
      )}
    </div>
  );
}
