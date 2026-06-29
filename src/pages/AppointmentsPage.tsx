import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { adminApi, type Appointment } from '@/lib/api';
import { cn } from '@/lib/utils';

type Tab = 'current' | 'past';
type AppointmentStatus = Appointment['status'];

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

const CURRENT_STATUSES: AppointmentStatus[] = ['pending', 'accepted'];
const PAST_STATUSES: AppointmentStatus[] = ['completed', 'rejected', 'cancelled'];

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
  const queryClient = useQueryClient();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', filter],
    queryFn: () => adminApi.getAppointments(filter ? { status: filter } : undefined),
    refetchInterval: 15000,
  });

  const visibleAppointments = useMemo(() => {
    const allowedStatuses = tab === 'current' ? CURRENT_STATUSES : PAST_STATUSES;
    const list = appointments?.filter((a) => allowedStatuses.includes(a.status)) ?? [];

    return list.sort((a, b) => {
      const cmp = a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);
      return tab === 'past' ? -cmp : cmp;
    });
  }, [appointments, tab]);

  const mutation = useMutation({
    mutationFn: ({ id, status, adminNote }: { id: string; status: string; adminNote?: string }) =>
      adminApi.updateAppointment(id, { status, adminNote }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  });

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
              'px-4 py-2.5 text-sm uppercase tracking-wider border-b-2 -mb-px transition-colors',
              tab === value ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text',
            )}
          >
            {label}
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
            onUpdate={(status, adminNote) => mutation.mutate({ id: a.id, status, adminNote })}
          />
        ))}
      </div>
    </div>
  );
}

function AppointmentCard({
  appointment: a,
  readOnly,
  onUpdate,
}: {
  appointment: Appointment;
  readOnly?: boolean;
  onUpdate: (status: string, adminNote?: string) => void;
}) {
  const [note, setNote] = useState(a.adminNote ?? '');
  const services = a.services?.map((s) => s.name.tr).join(', ');

  return (
    <div className="bg-surface border border-border rounded-sm p-4 sm:p-5">
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
