import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { AppointmentCard } from '@/components/appointments/AppointmentCard';
import { adminApi } from '@/lib/api';

const today = format(new Date(), 'yyyy-MM-dd');

export function DashboardPage() {
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: adminApi.getStats,
    refetchInterval: 30000,
  });

  const { data: todayAppointments, isLoading } = useQuery({
    queryKey: ['appointments', 'today', today],
    queryFn: () => adminApi.getAppointments({ date: today, scope: 'current' }),
    refetchInterval: 15000,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status, adminNote }: { id: string; status: string; adminNote?: string }) =>
      adminApi.updateAppointment(id, { status, adminNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  return (
    <div>
      <h1 className="font-display text-2xl sm:text-3xl uppercase">Panel</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Bekleyen" value={stats?.pending ?? 0} accent />
        <StatCard label="Bugün" value={stats?.todayCount ?? 0} />
        <StatCard label="Toplam" value={stats?.total ?? 0} />
      </div>

      <h2 className="font-display text-xl uppercase mt-10 mb-4">Bugünkü Randevularınız</h2>

      {isLoading && <p className="text-text-muted">Yükleniyor...</p>}

      {!isLoading && !todayAppointments?.length && (
        <p className="text-text-muted">Bugün için randevu yok.</p>
      )}

      <div className="mt-6 sm:mt-8 grid gap-3 sm:gap-4">
        {todayAppointments?.map((a) => (
          <AppointmentCard
            key={a.id}
            appointment={a}
            onUpdate={(status, adminNote) => mutation.mutate({ id: a.id, status, adminNote })}
          />
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="bg-surface border border-border rounded-sm p-6">
      <p className="text-sm text-text-muted uppercase tracking-wider">{label}</p>
      <p className={`font-display text-4xl mt-2 ${accent ? 'text-accent' : ''}`}>{value}</p>
    </div>
  );
}
