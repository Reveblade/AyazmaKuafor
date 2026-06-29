import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { AppointmentCard } from '@/components/appointments/AppointmentCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionHeader } from '@/components/layout/SectionHeader';
import {
  AppointmentListSkeleton,
  ListRowsSkeleton,
  StatCardsSkeleton,
} from '@/components/ui/Skeleton';
import { adminApi } from '@/lib/api';

const today = format(new Date(), 'yyyy-MM-dd');

export function DashboardPage() {
  const queryClient = useQueryClient();

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['stats'],
    queryFn: adminApi.getStats,
  });

  const { data: todayAppointments, isLoading } = useQuery({
    queryKey: ['appointments', 'today', today],
    queryFn: () => adminApi.getAppointments({ date: today, scope: 'current' }),
  });

  const { data: debtors, isLoading: isLoadingDebt } = useQuery({
    queryKey: ['customers', 'debt'],
    queryFn: adminApi.getCustomersWithDebt,
  });

  const totalDebt = debtors?.reduce((sum, c) => sum + c.debtBalance, 0) ?? 0;

  const mutation = useMutation({
    mutationFn: ({ id, status, adminNote }: { id: string; status: string; adminNote?: string }) =>
      adminApi.updateAppointment(id, { status, adminNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'today'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  return (
    <div>
      <PageHeader title="Panel" />
      {isLoadingStats && !stats ? (
        <StatCardsSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Bekleyen" value={stats?.pending ?? 0} accent />
          <StatCard label="Bugün" value={stats?.todayCount ?? 0} />
          <StatCard label="Toplam" value={stats?.total ?? 0} />
          <StatCard
            label="Bu Ay (Tamamlanan)"
            value={`${stats?.monthlyCompletedRevenue ?? 0} ₺`}
          />
        </div>
      )}

      <section className="mt-10">
        <SectionHeader title="Bugünkü Randevularınız" />

        {isLoading && <AppointmentListSkeleton count={3} />}

        {!isLoading && !todayAppointments?.length && (
          <p className="text-text-muted">Bugün için randevu yok.</p>
        )}

        {!isLoading && (
          <div className="mt-6 sm:mt-8 grid gap-3 sm:gap-4">
            {todayAppointments?.map((a) => (
            <AppointmentCard
              key={a.id}
              appointment={a}
              onUpdate={(status, adminNote) => mutation.mutate({ id: a.id, status, adminNote })}
            />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <SectionHeader
          title="Alınacak"
          description={
            totalDebt > 0
              ? `Toplam ${totalDebt} ₺ tahsil edilecek borç var.`
              : 'Şu an kayıtlı borç bulunmuyor.'
          }
        />

        {isLoadingDebt && <ListRowsSkeleton count={3} />}

        {!isLoadingDebt && debtors && debtors.length > 0 && (
          <div className="grid gap-2 sm:gap-3">
            {debtors.map((customer) => (
              <div
                key={customer.id}
                className="flex items-center justify-between gap-4 bg-surface border border-border rounded-sm px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-display uppercase truncate">
                    {customer.firstName} {customer.lastName}
                  </p>
                  <p className="text-sm text-text-muted mt-0.5">{customer.phone}</p>
                </div>
                <p className="shrink-0 font-display text-lg text-warning tabular-nums">
                  {customer.debtBalance} ₺
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div className="bg-surface border border-border rounded-sm p-6">
      <p className="text-sm text-text-muted uppercase tracking-wider">{label}</p>
      <p className={`font-display text-4xl mt-2 tabular-nums ${accent ? 'text-accent' : ''}`}>
        {value}
      </p>
    </div>
  );
}
