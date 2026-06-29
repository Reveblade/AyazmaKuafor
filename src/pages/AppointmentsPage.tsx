import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type Appointment } from '@/lib/api';
import { cn } from '@/lib/utils';

const statuses = ['', 'pending', 'accepted', 'rejected', 'cancelled', 'completed'] as const;
const statusLabels: Record<string, string> = {
  '': 'Tümü',
  pending: 'Beklemede',
  accepted: 'Onaylandı',
  rejected: 'Reddedildi',
  cancelled: 'İptal',
  completed: 'Tamamlandı',
};

const statusColors: Record<string, string> = {
  pending: 'text-warning',
  accepted: 'text-success',
  rejected: 'text-danger',
  cancelled: 'text-text-muted',
  completed: 'text-accent',
};

export function AppointmentsPage() {
  const [filter, setFilter] = useState('');
  const queryClient = useQueryClient();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', filter],
    queryFn: () => adminApi.getAppointments(filter ? { status: filter } : undefined),
    refetchInterval: 15000,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status, adminNote }: { id: string; status: string; adminNote?: string }) =>
      adminApi.updateAppointment(id, { status, adminNote }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  });

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Randevular</h1>

      <div className="mt-6 flex flex-wrap gap-2">
        {statuses.map((s) => (
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

      <div className="mt-8 grid gap-4">
        {appointments?.map((a) => (
          <AppointmentCard key={a.id} appointment={a} onUpdate={(status, adminNote) =>
            mutation.mutate({ id: a.id, status, adminNote })
          } />
        ))}
      </div>
    </div>
  );
}

function AppointmentCard({
  appointment: a,
  onUpdate,
}: {
  appointment: Appointment;
  onUpdate: (status: string, adminNote?: string) => void;
}) {
  const [note, setNote] = useState(a.adminNote ?? '');

  return (
    <div className="bg-surface border border-border rounded-sm p-5">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <p className="font-display text-lg uppercase">{a.firstName} {a.lastName}</p>
          <p className="text-text-muted text-sm">{a.phone}</p>
          <p className="mt-2">{a.date} · {a.startTime} – {a.endTime}</p>
          <p className="text-sm text-text-muted mt-1">
            {a.services?.map((s) => s.name.tr).join(', ')}
          </p>
          {a.notes && <p className="text-sm mt-2 italic">"{a.notes}"</p>}
        </div>
        <span className={cn('text-sm uppercase tracking-wider', statusColors[a.status])}>
          {statusLabels[a.status]}
        </span>
      </div>

      {a.status === 'pending' && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => onUpdate('accepted')}
            className="px-4 py-1.5 bg-success/20 text-success border border-success/40 rounded-sm text-sm uppercase tracking-wider"
          >
            Onayla
          </button>
          <button
            onClick={() => onUpdate('rejected', note)}
            className="px-4 py-1.5 bg-danger/20 text-danger border border-danger/40 rounded-sm text-sm uppercase tracking-wider"
          >
            Reddet
          </button>
        </div>
      )}

      {a.status === 'accepted' && (
        <button
          onClick={() => onUpdate('completed')}
          className="mt-4 px-4 py-1.5 bg-accent/20 text-accent border border-accent/40 rounded-sm text-sm uppercase tracking-wider"
        >
          Tamamlandı
        </button>
      )}

      <div className="mt-3">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Admin notu"
          className="w-full bg-bg border border-border rounded-sm px-3 py-1.5 text-sm text-text"
        />
      </div>
    </div>
  );
}
