import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AvailabilityRuleInput } from '@/lib/api';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Checkbox } from '@/components/ui/Checkbox';
import { WeeklyHoursSkeleton } from '@/components/ui/Skeleton';
import { cn, DAY_NAMES } from '@/lib/utils';

const timeInputClass =
  'w-full bg-surface border border-border rounded-sm px-2 py-1.5 text-sm min-w-0 font-mono tabular-nums [color-scheme:dark] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:border-accent transition-colors';

const defaultRules: AvailabilityRuleInput[] = DAY_NAMES.map((_, i) => ({
  dayOfWeek: i,
  openTime: i >= 2 && i <= 6 ? '09:00' : '00:00',
  closeTime: i >= 2 && i <= 6 ? '19:00' : '00:00',
  active: i >= 2 && i <= 6,
}));

export function WeeklyHoursSettings() {
  const queryClient = useQueryClient();
  const [rules, setRules] = useState<AvailabilityRuleInput[]>(defaultRules);

  const { data: loadedRules, isLoading } = useQuery({
    queryKey: ['availability-rules'],
    queryFn: adminApi.getAvailabilityRules,
  });

  useEffect(() => {
    if (loadedRules?.length) {
      setRules(loadedRules.map(({ dayOfWeek, openTime, closeTime, active }) => ({
        dayOfWeek, openTime, closeTime, active,
      })));
    }
  }, [loadedRules]);

  const saveRules = useMutation({
    mutationFn: adminApi.saveAvailabilityRules,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-rules'] });
      queryClient.invalidateQueries({ queryKey: ['month-availability'] });
      queryClient.invalidateQueries({ queryKey: ['day-schedule'] });
    },
  });

  const updateRule = (index: number, patch: Partial<AvailabilityRuleInput>) => {
    setRules((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  return (
    <section className="flex flex-col h-full">
      <SectionHeader
        title="Haftalık Saatler"
        description="Salonun varsayılan açılış ve kapanış saatlerini belirleyin. Kapalı günler randevuya açılmaz."
      />
      {isLoading && !loadedRules ? (
        <WeeklyHoursSkeleton />
      ) : (
      <div className="flex flex-col flex-1 bg-surface border border-border rounded-sm p-4">
        <div className="grid gap-2 flex-1">
          {rules.map((rule, i) => (
            <div
              key={rule.dayOfWeek}
              className="grid grid-cols-[7rem_1fr_auto_1fr] items-center gap-2 sm:gap-3 bg-bg border border-border rounded-sm px-3 py-2"
            >
              <Checkbox
                checked={rule.active}
                onChange={(active) => updateRule(i, { active })}
                label={
                  <span
                    className={cn(
                      'text-sm truncate transition-opacity',
                      !rule.active && 'text-text-muted opacity-50',
                    )}
                  >
                    {DAY_NAMES[rule.dayOfWeek]}
                  </span>
                }
                className="min-w-0"
              />
              <input
                type="time"
                value={rule.openTime}
                onChange={(e) => updateRule(i, { openTime: e.target.value })}
                disabled={!rule.active}
                className={cn(timeInputClass, !rule.active && 'opacity-50')}
              />
              <span className={cn('text-text-muted text-center', !rule.active && 'opacity-50')}>
                –
              </span>
              <input
                type="time"
                value={rule.closeTime}
                onChange={(e) => updateRule(i, { closeTime: e.target.value })}
                disabled={!rule.active}
                className={cn(timeInputClass, !rule.active && 'opacity-50')}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => saveRules.mutate(rules)}
          disabled={saveRules.isPending}
          className="w-full mt-4 bg-accent text-bg font-display uppercase tracking-wider py-2.5 rounded-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {saveRules.isPending ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
      )}
    </section>
  );
}
