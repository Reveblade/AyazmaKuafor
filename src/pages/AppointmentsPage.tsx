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
import { AppointmentListSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

type Tab = 'current' | 'past';
type AppointmentStatus = Appointment['status'];

const PAGE_SIZE = 20;

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

function PaginationBar({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
      <p className="text-sm text-text-muted">
        Toplam {total} randevu
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="px-3 py-1.5 text-sm text-text-muted border border-transparent rounded-sm cursor-pointer transition-all duration-200 hover:text-accent hover:border-border hover:bg-surface-elevated active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-transparent disabled:hover:text-text-muted"
          >
            ‹ Önceki
          </button>
          <span className="text-xs text-text-muted tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="px-3 py-1.5 text-sm text-text-muted border border-transparent rounded-sm cursor-pointer transition-all duration-200 hover:text-accent hover:border-border hover:bg-surface-elevated active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-transparent disabled:hover:text-text-muted"
          >
            Sonraki ›
          </button>
        </div>
      )}
    </div>
  );
}

export function AppointmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('current');
  const [filter, setFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pastMonth, setPastMonth] = useState(startOfMonth(new Date()));
  const [pastWeek, setPastWeek] = useState(() => getMaxWeeksInMonth(startOfMonth(new Date())));
  const [pastPage, setPastPage] = useState(1);
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
    const targetTab: Tab = searchParams.get('tab') === 'current' ? 'current' : 'past';
    setTab(targetTab);
    setFilter('');

    if (targetTab === 'current') {
      setCurrentPage(1);
    } else {
      setPastPage(1);
      const parsed = parseISO(highlightDate);
      setPastMonth(startOfMonth(parsed));
      setPastWeek(getWeekOfMonth(highlightDate));
    }

    const next = new URLSearchParams(searchParams);
    next.delete('highlight');
    next.delete('date');
    next.delete('tab');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const {
    data: currentData,
    isLoading: isLoadingCurrent,
    isFetching: isFetchingCurrent,
  } = useQuery({
    queryKey: ['appointments', 'current', filter, currentPage],
    queryFn: () =>
      adminApi.getAppointmentsPaginated({
        scope: 'current',
        page: currentPage,
        limit: PAGE_SIZE,
        ...(filter ? { status: filter } : {}),
      }),
    enabled: tab === 'current',
    placeholderData: keepPreviousData,
  });

  const {
    data: pastData,
    isLoading: isLoadingPast,
    isFetching: isFetchingPast,
  } = useQuery({
    queryKey: ['appointments', 'past', filter, pastMonthKey, pastWeek, pastPage],
    queryFn: () =>
      adminApi.getAppointmentsPaginated({
        scope: 'past',
        month: pastMonthKey,
        week: pastWeek,
        page: pastPage,
        limit: PAGE_SIZE,
        ...(filter ? { status: filter } : {}),
      }),
    enabled: tab === 'past',
    placeholderData: keepPreviousData,
  });

  const visibleAppointments = useMemo(
    () => sortAppointments(currentData?.items ?? [], 'current'),
    [currentData?.items],
  );

  const pastWeekAppointments = useMemo(
    () => sortAppointments(pastData?.items ?? [], 'past'),
    [pastData?.items],
  );

  const isLoading = tab === 'current'
    ? isLoadingCurrent && !currentData
    : isLoadingPast && !pastData;

  const activeAppointments = tab === 'current' ? visibleAppointments : pastWeekAppointments;
  const activeData = tab === 'current' ? currentData : pastData;
  const activePage = tab === 'current' ? currentPage : pastPage;
  const isFetching = tab === 'current' ? isFetchingCurrent : isFetchingPast;

  useEffect(() => {
    const pending = pendingHighlightRef.current;
    if (!pending) return;
    if (tab === 'past' && (isLoadingPast || isFetchingPast || !pastData)) return;
    if (tab === 'current' && (isLoadingCurrent || isFetchingCurrent || !currentData)) return;

    const data = tab === 'past' ? pastData : currentData;
    const page = tab === 'past' ? pastPage : currentPage;
    const setPage = tab === 'past' ? setPastPage : setCurrentPage;
    if (!data) return;

    const found = data.items.some((a) => a.id === pending.id);
    if (found) {
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
    }

    if (page < data.totalPages) {
      setPage(page + 1);
      return;
    }

    pendingHighlightRef.current = null;
  }, [
    tab,
    pastData,
    pastPage,
    currentData,
    currentPage,
    isLoadingPast,
    isFetchingPast,
    isLoadingCurrent,
    isFetchingCurrent,
  ]);

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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tab === 'current' ? ['appointments', 'current'] : ['appointments', 'past'],
      });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
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
            type="button"
            key={value}
            onClick={() => {
              setTab(value);
              setFilter('');
              setCurrentPage(1);
              setPastPage(1);
              if (value === 'past') {
                const currentMonth = startOfMonth(new Date());
                setPastMonth(currentMonth);
                setPastWeek(getMaxWeeksInMonth(currentMonth));
              }
            }}
            className={cn(
              'relative px-4 py-2.5 text-sm uppercase tracking-wider border-b-2 -mb-px cursor-pointer transition-all duration-200 active:scale-[0.98]',
              tab === value
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text hover:bg-surface/50',
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
                setPastPage(1);
              }}
              className="text-text-muted hover:text-accent p-2 text-xl leading-none rounded-sm cursor-pointer transition-all duration-200 hover:bg-surface-elevated active:scale-90"
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
                setPastPage(1);
              }}
              disabled={pastMonth >= startOfMonth(new Date())}
              className="text-text-muted hover:text-accent p-2 text-xl leading-none rounded-sm cursor-pointer transition-all duration-200 hover:bg-surface-elevated active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-muted"
              aria-label="Sonraki ay"
            >
              ›
            </button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => {
                setPastWeek((week) => week - 1);
                setPastPage(1);
              }}
              disabled={pastWeek <= 1}
              className="text-text-muted hover:text-accent p-2 text-xl leading-none rounded-sm cursor-pointer transition-all duration-200 hover:bg-surface-elevated active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-muted"
              aria-label="Önceki hafta"
            >
              ‹
            </button>
            <p className="font-display uppercase tracking-wider text-sm sm:text-base text-text-muted">
              {formatWeekLabel(pastWeek, pastMonth)}
            </p>
            <button
              type="button"
              onClick={() => {
                setPastWeek((week) => week + 1);
                setPastPage(1);
              }}
              disabled={pastWeek >= maxWeeksInPastMonth}
              className="text-text-muted hover:text-accent p-2 text-xl leading-none rounded-sm cursor-pointer transition-all duration-200 hover:bg-surface-elevated active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-muted"
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
            type="button"
            key={s}
            onClick={() => {
              setFilter(s);
              setCurrentPage(1);
              setPastPage(1);
            }}
            className={cn(
              'px-3 py-1.5 text-xs uppercase tracking-wider border rounded-sm cursor-pointer transition-all duration-200 active:scale-[0.98]',
              filter === s
                ? 'border-accent bg-accent/20 text-accent hover:bg-accent/30 hover:border-accent/60 hover:shadow-sm'
                : 'border-border text-text-muted hover:border-accent/40 hover:bg-accent/5 hover:text-text',
            )}
          >
            {statusLabels[s]}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="mt-6 sm:mt-8">
          <AppointmentListSkeleton count={4} />
        </div>
      )}

      {!isLoading && activeAppointments.length === 0 && (
        <p className="mt-8 text-text-muted text-sm">
          {tab === 'current'
            ? 'Güncel randevu bulunmuyor.'
            : `${formatWeekLabel(pastWeek, pastMonth)} için geçmiş randevu bulunmuyor.`}
        </p>
      )}

      <div
        className={cn(
          'mt-6 sm:mt-8 transition-opacity',
          isFetching && activeData ? 'opacity-60' : 'opacity-100',
        )}
      >
        {activeAppointments.length > 0 && (
          <div className="grid gap-3 sm:gap-4">
            {activeAppointments.map((a) => (
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

      {activeData && activeData.total > 0 && (
        <PaginationBar
          page={activePage}
          totalPages={activeData.totalPages}
          total={activeData.total}
          onPageChange={tab === 'current' ? setCurrentPage : setPastPage}
        />
      )}
    </div>
  );
}
