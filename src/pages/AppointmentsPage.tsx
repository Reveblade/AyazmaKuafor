import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { format, startOfMonth, addMonths, subMonths, endOfMonth, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { AppointmentCard, statusLabels } from '@/components/appointments/AppointmentCard';
import { adminApi, type Appointment } from '@/lib/api';
import {
  getUnseenCancelledCount,
  isUnseenCancelled,
  subscribeUnseenCancelled,
} from '@/lib/cancelledNotifications';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';

type Tab = 'current' | 'past';
type AppointmentStatus = Appointment['status'];

const tabFilters: Record<Tab, ('' | AppointmentStatus)[]> = {
  current: ['', 'pending', 'accepted'],
  past: ['', 'pending', 'accepted', 'completed', 'rejected', 'cancelled'],
};

const statusSortOrder: Record<AppointmentStatus, number> = {
  pending: 0,
  accepted: 1,
  completed: 2,
  rejected: 3,
  cancelled: 4,
};

function sortAppointments(appointments: Appointment[], tab: Tab) {
  return [...appointments].sort((a, b) => {
    const statusDiff = statusSortOrder[a.status] - statusSortOrder[b.status];
    if (statusDiff !== 0) return statusDiff;

    const cmp = a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);
    return tab === 'past' ? -cmp : cmp;
  });
}

function getWeekOfMonth(dateStr: string) {
  return Math.ceil(parseISO(dateStr).getDate() / 7);
}

function formatWeekLabel(weekIndex: number, month: Date) {
  const daysInMonth = endOfMonth(month).getDate();
  const start = (weekIndex - 1) * 7 + 1;
  const end = Math.min(weekIndex * 7, daysInMonth);
  const monthName = format(month, 'MMMM', { locale: tr });
  return `${weekIndex}. Hafta (${start}–${end} ${monthName})`;
}

function getMaxWeeksInMonth(month: Date) {
  return Math.ceil(endOfMonth(month).getDate() / 7);
}

export function AppointmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('current');
  const [filter, setFilter] = useState('');
  const [pastMonth, setPastMonth] = useState(startOfMonth(new Date()));
  const [pastWeek, setPastWeek] = useState(() => getMaxWeeksInMonth(startOfMonth(new Date())));
  const [unseenCount, setUnseenCount] = useState(getUnseenCancelledCount);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const pendingHighlightRef = useRef<{ id: string; date: string } | null>(null);
  const queryClient = useQueryClient();

  const pastMonthKey = format(pastMonth, 'yyyy-MM');
  const maxWeeksInPastMonth = getMaxWeeksInMonth(pastMonth);

  useEffect(() => subscribeUnseenCancelled(() => setUnseenCount(getUnseenCancelledCount())), []);

  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    const highlightDate = searchParams.get('date');
    if (!highlightId || !highlightDate) return;

    pendingHighlightRef.current = { id: highlightId, date: highlightDate };
    setTab('past');
    setFilter('');
    const parsed = parseISO(highlightDate);
    setPastMonth(startOfMonth(parsed));
    setPastWeek(getWeekOfMonth(highlightDate));

    const next = new URLSearchParams(searchParams);
    next.delete('highlight');
    next.delete('date');
    next.delete('tab');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const { data: currentAppointments, isLoading: isLoadingCurrent } = useQuery({
    queryKey: ['appointments', 'current', filter],
    queryFn: () =>
      adminApi.getAppointments({
        scope: 'current',
        ...(filter ? { status: filter } : {}),
      }),
    enabled: tab === 'current',
    refetchInterval: 15000,
  });

  const { data: pastAppointments, isLoading: isLoadingPast, isFetching: isFetchingPast } = useQuery({
    queryKey: ['appointments', 'past', filter, pastMonthKey],
    queryFn: () =>
      adminApi.getAppointments({
        scope: 'past',
        month: pastMonthKey,
        ...(filter ? { status: filter } : {}),
      }),
    enabled: tab === 'past',
    refetchInterval: 15000,
    placeholderData: keepPreviousData,
  });

  const visibleAppointments = useMemo(
    () => sortAppointments(currentAppointments ?? [], 'current'),
    [currentAppointments],
  );
  const isLoading = tab === 'current' ? isLoadingCurrent : isLoadingPast && !pastAppointments;

  const pastWeekAppointments = useMemo(() => {
    if (tab !== 'past' || !pastAppointments?.length) return [];
    const filtered = pastAppointments.filter((appointment) => getWeekOfMonth(appointment.date) === pastWeek);
    return sortAppointments(filtered, 'past');
  }, [tab, pastAppointments, pastWeek]);

  useEffect(() => {
    const pending = pendingHighlightRef.current;
    if (!pending || tab !== 'past' || isLoadingPast || isFetchingPast) return;

    const inWeek = pastWeekAppointments.some((a) => a.id === pending.id);
    if (!inWeek) {
      const inMonth = pastAppointments?.find((a) => a.id === pending.id);
      if (inMonth) {
        const week = getWeekOfMonth(inMonth.date);
        if (week !== pastWeek) {
          setPastWeek(week);
          return;
        }
      }
      pendingHighlightRef.current = null;
      return;
    }

    pendingHighlightRef.current = null;
    setHighlightedId(pending.id);

    requestAnimationFrame(() => {
      document.getElementById(`appointment-${pending.id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });

    const timer = window.setTimeout(() => setHighlightedId(null), 2800);
    return () => window.clearTimeout(timer);
  }, [tab, pastWeekAppointments, pastAppointments, pastWeek, isLoadingPast, isFetchingPast]);

  const mutation = useMutation({
    mutationFn: ({
      id,
      status,
      adminNote,
    }: {
      id: string;
      status?: string;
      adminNote?: string;
    }) => adminApi.updateAppointment(id, { ...(status ? { status } : {}), adminNote }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  });

  return (
    <div>
      <PageHeader title="Randevular" />

      <div className="flex gap-1 border-b border-border">
        {([
          ['current', 'Güncel'],
          ['past', 'Geçmiş'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => {
              setTab(value);
              setFilter('');
              if (value === 'past') {
                const currentMonth = startOfMonth(new Date());
                setPastMonth(currentMonth);
                setPastWeek(getMaxWeeksInMonth(currentMonth));
              }
            }}
            className={cn(
              'relative px-4 py-2.5 text-sm uppercase tracking-wider border-b-2 -mb-px transition-colors',
              tab === value ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text',
            )}
          >
            {label}
            {value === 'past' && unseenCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[1.125rem] h-[1.125rem] px-1 flex items-center justify-center rounded-full bg-danger text-white text-[10px] font-medium leading-none">
                {unseenCount > 9 ? '9+' : unseenCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'past' && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => {
                setPastMonth(subMonths(pastMonth, 1));
                setPastWeek(getMaxWeeksInMonth(subMonths(pastMonth, 1)));
              }}
              className="text-text-muted hover:text-accent p-2 text-xl leading-none"
              aria-label="Önceki ay"
            >
              ‹
            </button>
            <p className="font-display uppercase tracking-wider text-sm sm:text-base">
              {format(pastMonth, 'MMMM yyyy', { locale: tr })}
            </p>
            <button
              type="button"
              onClick={() => {
                const nextMonth = addMonths(pastMonth, 1);
                setPastMonth(nextMonth);
                setPastWeek(getMaxWeeksInMonth(nextMonth));
              }}
              disabled={pastMonth >= startOfMonth(new Date())}
              className="text-text-muted hover:text-accent p-2 text-xl leading-none disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Sonraki ay"
            >
              ›
            </button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setPastWeek((week) => week - 1)}
              disabled={pastWeek <= 1}
              className="text-text-muted hover:text-accent p-2 text-xl leading-none disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Önceki hafta"
            >
              ‹
            </button>
            <p className="font-display uppercase tracking-wider text-sm sm:text-base text-text-muted">
              {formatWeekLabel(pastWeek, pastMonth)}
            </p>
            <button
              type="button"
              onClick={() => setPastWeek((week) => week + 1)}
              disabled={pastWeek >= maxWeeksInPastMonth}
              className="text-text-muted hover:text-accent p-2 text-xl leading-none disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Sonraki hafta"
            >
              ›
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {tabFilters[tab].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              'px-3 py-1.5 text-xs uppercase tracking-wider border rounded-sm transition-colors',
              filter === s ? 'border-accent bg-accent/20 text-accent' : 'border-border text-text-muted',
            )}
          >
            {statusLabels[s]}
          </button>
        ))}
      </div>

      {isLoading && <p className="mt-8 text-text-muted">Yükleniyor...</p>}

      {!isLoading && (tab === 'current' ? visibleAppointments.length === 0 : pastWeekAppointments.length === 0) && (
        <p className="mt-8 text-text-muted text-sm">
          {tab === 'current'
            ? 'Güncel randevu bulunmuyor.'
            : `${formatWeekLabel(pastWeek, pastMonth)} için geçmiş randevu bulunmuyor.`}
        </p>
      )}

      <div
        className={cn(
          'mt-6 sm:mt-8 transition-opacity',
          tab === 'past' && isFetchingPast && pastAppointments ? 'opacity-60' : 'opacity-100',
        )}
      >
        {(tab === 'current' ? visibleAppointments : pastWeekAppointments).length > 0 && (
          <div className="grid gap-3 sm:gap-4">
            {(tab === 'current' ? visibleAppointments : pastWeekAppointments).map((a) => (
              <AppointmentCard
                key={a.id}
                appointment={a}
                highlighted={highlightedId === a.id}
                showCancelNotice={tab === 'past' && a.status === 'cancelled' && isUnseenCancelled(a.id)}
                onUpdate={(status, adminNote) => mutation.mutate({ id: a.id, status, adminNote })}
                onSaveNote={(adminNote) => mutation.mutate({ id: a.id, adminNote })}
              />
            ))}
          </div>
        )}
      </div>

      {tab === 'past' && pastAppointments && pastAppointments.length > 0 && (
        <p className="mt-8 text-sm text-text-muted">
          Toplam {pastAppointments.length} randevu
        </p>
      )}
    </div>
  );
}
