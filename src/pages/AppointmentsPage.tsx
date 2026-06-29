import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { adminApi, type Appointment } from '@/lib/api';
import {
  getUnseenCancelledCount,
  isUnseenCancelled,
  markCancelledSeen,
  subscribeUnseenCancelled,
} from '@/lib/cancelledNotifications';
import { cn } from '@/lib/utils';

type Tab = 'current' | 'past';
type AppointmentStatus = Appointment['status'];

const PAGE_SIZE = 10;

const statusLabels: Record<AppointmentStatus | '', string> = {
  '': 'Tümü',
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

const tabFilters: Record<Tab, ('' | AppointmentStatus)[]> = {
  current: ['', 'pending', 'accepted'],
  past: ['', 'completed', 'rejected', 'cancelled'],
};

function formatAppointmentDate(date: string) {
  return format(parseISO(date), 'd MMMM yyyy, EEEE', { locale: tr });
}

export function AppointmentsPage() {
  const [tab, setTab] = useState<Tab>('current');
  const [filter, setFilter] = useState('');
  const [pastPage, setPastPage] = useState(1);
  const [unseenCount, setUnseenCount] = useState(getUnseenCancelledCount);
  const queryClient = useQueryClient();

  useEffect(() => subscribeUnseenCancelled(() => setUnseenCount(getUnseenCancelledCount())), []);

  useEffect(() => {
    setPastPage(1);
  }, [filter]);

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

  const { data: pastData, isLoading: isLoadingPast } = useQuery({
    queryKey: ['appointments', 'past', filter, pastPage],
    queryFn: () =>
      adminApi.getAppointmentsPaginated({
        scope: 'past',
        page: pastPage,
        limit: PAGE_SIZE,
        ...(filter ? { status: filter } : {}),
      }),
    enabled: tab === 'past',
    refetchInterval: 15000,
  });

  const visibleAppointments = tab === 'current' ? (currentAppointments ?? []) : (pastData?.items ?? []);
  const isLoading = tab === 'current' ? isLoadingCurrent : isLoadingPast;

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
          {tab === 'current' ? 'Güncel randevu bulunmuyor.' : 'Geçmiş randevu bulunmuyor.'}
        </p>
      )}

      <div className="mt-6 sm:mt-8 grid gap-3 sm:gap-4">
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

      {pastPagination && pastPagination.totalPages > 1 && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-text-muted">
            Toplam {pastPagination.total} randevu · Sayfa {pastPagination.page} / {pastPagination.totalPages}
          </p>
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
        </div>
      )}
    </div>
  );
}

function AppointmentCard({
  appointment: a,
  readOnly,
  showCancelNotice,
  onUpdate,
}: {
  appointment: Appointment;
  readOnly?: boolean;
  showCancelNotice?: boolean;
  onUpdate: (status: string, adminNote?: string) => void;
}) {
  const [note, setNote] = useState(a.adminNote ?? '');
  const cardRef = useRef<HTMLDivElement>(null);
  const services = a.services?.map((s) => s.name.tr).join(', ');

  useEffect(() => {
    if (!showCancelNotice || !cardRef.current) return;

    const el = cardRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          markCancelledSeen(a.id);
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [a.id, showCancelNotice]);

  return (
    <div
      ref={cardRef}
      className={cn(
        'bg-surface border rounded-sm p-4 sm:p-5',
        showCancelNotice ? 'border-danger/50 ring-1 ring-danger/20' : 'border-border',
      )}
    >
      {showCancelNotice && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-danger/10 border border-danger/30 rounded-sm text-sm text-danger">
          <span className="shrink-0 w-2 h-2 rounded-full bg-danger animate-pulse" aria-hidden="true" />
          Müşteri bu randevuyu iptal etti
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-display text-lg sm:text-xl uppercase break-words">
            {a.firstName} {a.lastName}
          </p>
          <a href={`tel:${a.phone}`} className="text-accent text-sm mt-1 inline-block py-0.5">
            {a.phone}
          </a>
        </div>
        <span
          className={cn(
            'self-start shrink-0 px-2.5 py-1 rounded-sm text-xs uppercase tracking-wider border',
            statusColors[a.status],
          )}
        >
          {statusLabels[a.status]}
        </span>
      </div>

      <div className="mt-4 bg-bg/60 border border-border rounded-sm px-3 py-3">
        <p className="font-display text-sm sm:text-base uppercase leading-snug">
          {formatAppointmentDate(a.date)}
        </p>
        <p className="text-base sm:text-lg mt-1 tabular-nums">
          {a.startTime} – {a.endTime}
        </p>
      </div>

      {services && (
        <div className="mt-3">
          <p className="text-xs uppercase tracking-wider text-text-muted mb-1">Hizmetler</p>
          <p className="text-sm leading-relaxed">{services}</p>
          {a.totalPrice != null && (
            <p className="text-sm mt-2 tabular-nums">
              {a.discountAmount ? (
                <>
                  <span className="text-text-muted line-through mr-2">{a.subtotal} ₺</span>
                  <span className="text-accent">−{a.discountAmount} ₺</span>
                  <span className="ml-2 font-display">{a.totalPrice} ₺</span>
                </>
              ) : (
                <span className="font-display">{a.totalPrice} ₺</span>
              )}
            </p>
          )}
        </div>
      )}

      {a.notes && (
        <p className="text-sm mt-3 p-3 bg-bg/60 border border-border rounded-sm italic leading-relaxed">
          &ldquo;{a.notes}&rdquo;
        </p>
      )}

      {!readOnly && a.status === 'pending' && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button
            onClick={() => onUpdate('accepted')}
            className="px-4 py-2.5 sm:py-1.5 bg-success/20 text-success border border-success/40 rounded-sm text-sm uppercase tracking-wider"
          >
            Onayla
          </button>
          <button
            onClick={() => onUpdate('rejected', note)}
            className="px-4 py-2.5 sm:py-1.5 bg-danger/20 text-danger border border-danger/40 rounded-sm text-sm uppercase tracking-wider"
          >
            Reddet
          </button>
        </div>
      )}

      {!readOnly && a.status === 'accepted' && (
        <button
          onClick={() => onUpdate('completed')}
          className="mt-4 w-full sm:w-auto px-4 py-2.5 sm:py-1.5 bg-accent/20 text-accent border border-accent/40 rounded-sm text-sm uppercase tracking-wider"
        >
          Tamamlandı
        </button>
      )}

      <div className="mt-4">
        <label className="block text-xs uppercase tracking-wider text-text-muted mb-1.5">
          Admin notu
        </label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Not ekle..."
          readOnly={readOnly}
          className="w-full bg-bg border border-border rounded-sm px-3 py-2 text-sm text-text disabled:opacity-60"
        />
      </div>
    </div>
  );
}
