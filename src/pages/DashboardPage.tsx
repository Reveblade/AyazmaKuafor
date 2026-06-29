import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';

export function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: adminApi.getStats,
    refetchInterval: 30000,
  });

  const { data: pending } = useQuery({
    queryKey: ['appointments', 'pending'],
    queryFn: () => adminApi.getAppointments({ status: 'pending' }),
    refetchInterval: 15000,
  });

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Panel</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Bekleyen" value={stats?.pending ?? 0} accent />
        <StatCard label="Bugün" value={stats?.todayCount ?? 0} />
        <StatCard label="Toplam" value={stats?.total ?? 0} />
      </div>

      <h2 className="font-display text-xl uppercase mt-10 mb-4">Bekleyen Randevular</h2>
      {!pending?.length ? (
        <p className="text-text-muted">Bekleyen randevu yok.</p>
      ) : (
        <div className="grid gap-3">
          {pending.map((a) => (
            <div key={a.id} className="bg-surface border border-border rounded-sm p-4 flex justify-between items-center">
              <div>
                <p className="font-display uppercase">{a.firstName} {a.lastName}</p>
                <p className="text-sm text-text-muted">{a.date} · {a.startTime} · {a.phone}</p>
              </div>
              <span className="text-warning text-xs uppercase tracking-wider">Beklemede</span>
            </div>
          ))}
        </div>
      )}
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
