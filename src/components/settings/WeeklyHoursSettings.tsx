import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AvailabilityRuleInput } from '@/lib/api';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { DAY_NAMES } from '@/lib/utils';

const defaultRules: AvailabilityRuleInput[] = DAY_NAMES.map((_, i) => ({
  dayOfWeek: i,
  openTime: i >= 2 && i <= 6 ? '09:00' : '00:00',
  closeTime: i >= 2 && i <= 6 ? '19:00' : '00:00',
  active: i >= 2 && i <= 6,
}));

export function WeeklyHoursSettings() {
  const queryClient = useQueryClient();
  const [rules, setRules] = useState<AvailabilityRuleInput[]>(defaultRules);

  const { data: loadedRules } = useQuery({
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
      <div className="flex flex-col flex-1 bg-surface border border-border rounded-sm p-4">
        <div className="grid gap-2 flex-1">
          {rules.map((rule, i) => (
            <div
              key={rule.dayOfWeek}
              className="grid grid-cols-[7rem_1fr_auto_1fr] items-center gap-2 sm:gap-3 bg-bg border border-border rounded-sm px-3 py-2"
            >
              <label className="flex items-center gap-2 min-w-0">
                <input
                  type="checkbox"
                  checked={rule.active}
                  onChange={(e) => updateRule(i, { active: e.target.checked })}
                />
                <span className="text-sm truncate">{DAY_NAMES[rule.dayOfWeek]}</span>
              </label>
              <input
                type="time"
                value={rule.openTime}
                onChange={(e) => updateRule(i, { openTime: e.target.value })}
                disabled={!rule.active}
                className="w-full bg-surface border border-border rounded-sm px-2 py-1.5 text-sm min-w-0"
              />
              <span className="text-text-muted text-center">–</span>
              <input
                type="time"
                value={rule.closeTime}
                onChange={(e) => updateRule(i, { closeTime: e.target.value })}
                disabled={!rule.active}
                className="w-full bg-surface border border-border rounded-sm px-2 py-1.5 text-sm min-w-0"
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
    </section>
  );
}
