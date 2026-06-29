import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { format, startOfMonth, addMonths, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import { AppointmentCard, statusLabels } from '@/components/appointments/AppointmentCard';
import { adminApi, type Appointment } from '@/lib/api';
import {
  getUnseenCancelledCount,
  isUnseenCancelled,
  subscribeUnseenCancelled,
} from '@/lib/cancelledNotifications';
import { cn } from '@/lib/utils';

type Tab = 'current' | 'past';
type AppointmentStatus = Appointment['status'];

const PAGE_SIZE = 10;

const tabFilters: Record<Tab, ('' | AppointmentStatus)[]> = {
  current: ['', 'pending', 'accepted'],
  past: ['', 'pending', 'accepted', 'completed', 'rejected', 'cancelled'],
};

export function AppointmentsPage() {
  const [tab, setTab] = useState<Tab>('current');
  const [filter, setFilter] = useState('');
  const [pastPage, setPastPage] = useState(1);
  const [pastMonth, setPastMonth] = useState(startOfMonth(new Date()));
  const [unseenCount, setUnseenCount] = useState(getUnseenCancelledCount);
  const queryClient = useQueryClient();

  const pastMonthKey = format(pastMonth, 'yyyy-MM');

  useEffect(() => subscribeUnseenCancelled(() => setUnseenCount(getUnseenCancelledCount())), []);

  useEffect(() => {
    setPastPage(1);
  }, [filter, pastMonthKey]);

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

  const { data: pastData, isLoading: isLoadingPast, isFetching: isFetchingPast } = useQuery({
    queryKey: ['appointments', 'past', filter, pastPage, pastMonthKey],
    queryFn: () =>
      adminApi.getAppointmentsPaginated({
        scope: 'past',
        page: pastPage,
        limit: PAGE_SIZE,
        month: pastMonthKey,
        ...(filter ? { status: filter } : {}),
      }),
    enabled: tab === 'past',
    refetchInterval: 15000,
    placeholderData: keepPreviousData,
  });

  const visibleAppointments = tab === 'current' ? (currentAppointments ?? []) : (pastData?.items ?? []);
  const isLoading = tab === 'current' ? isLoadingCurrent : isLoadingPast && !pastData;

  const mutation = useMutation({
    mutationFn: ({ id, status, adminNote }: { id: string; status: string; adminNote?: string }) =>
      adminApi.updateAppointment(id, { status, adminNote }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  });

  const pastPagination = useMemo(() => {
    if (tab !== 'past' || !pastData) return null;
    return {
      page: pastData.page,
      totalPages: pastData.totalPages,
      total: pastData.total,
    };
  }, [tab, pastData]);

  return (
    <div>
      <h1 className="font-display text-2xl sm:text-3xl uppercase">Randevular</h1>

      <div className="mt-6 flex gap-1 border-b border-border">
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
                setPastMonth(startOfMonth(new Date()));
                setPastPage(1);
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
        <div className="mt-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setPastMonth(subMonths(pastMonth, 1))}
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
            onClick={() => setPastMonth(addMonths(pastMonth, 1))}
            disabled={pastMonth >= startOfMonth(new Date())}
            className="text-text-muted hover:text-accent p-2 text-xl leading-none disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Sonraki ay"
          >
            ›
          </button>
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

      {!isLoading && visibleAppointments.length === 0 && (
        <p className="mt-8 text-text-muted text-sm">
          {tab === 'current'
            ? 'Güncel randevu bulunmuyor.'
            : `${format(pastMonth, 'MMMM yyyy', { locale: tr })} için geçmiş randevu bulunmuyor.`}
        </p>
      )}

      <div
        className={cn(
          'mt-6 sm:mt-8 grid gap-3 sm:gap-4 transition-opacity',
          tab === 'past' && isFetchingPast && pastData ? 'opacity-60' : 'opacity-100',
        )}
      >
        {visibleAppointments.map((a) => (
          <AppointmentCard
            key={a.id}
            appointment={a}
            readOnly={tab === 'past'}
            showCancelNotice={tab === 'past' && a.status === 'cancelled' && isUnseenCancelled(a.id)}
            onUpdate={(status, adminNote) => mutation.mutate({ id: a.id, status, adminNote })}
          />
        ))}
      </div>

      {pastPagination && pastPagination.total > 0 && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-text-muted">
            Toplam {pastPagination.total} randevu · Sayfa {pastPagination.page} / {pastPagination.totalPages}
          </p>
          {pastPagination.totalPages > 1 && (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pastPagination.page <= 1}
                onClick={() => setPastPage((p) => p - 1)}
                className="px-4 py-2 text-sm uppercase tracking-wider border border-border rounded-sm text-text-muted hover:text-text disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Önceki
              </button>
              <button
                type="button"
                disabled={pastPagination.page >= pastPagination.totalPages}
                onClick={() => setPastPage((p) => p + 1)}
                className="px-4 py-2 text-sm uppercase tracking-wider border border-border rounded-sm text-text-muted hover:text-text disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Sonraki
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
