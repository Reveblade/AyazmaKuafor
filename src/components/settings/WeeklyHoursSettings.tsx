import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AvailabilityRuleInput } from '@/lib/api';
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
    <section>
      <h2 className="font-display text-xl uppercase mb-4">Haftalık Saatler</h2>
      <p className="text-sm text-text-muted mb-4 max-w-xl">
        Salonun varsayılan açılış ve kapanış saatlerini belirleyin. Kapalı günler randevuya açılmaz.
      </p>
      <div className="grid gap-3 max-w-xl">
        {rules.map((rule, i) => (
          <div key={rule.dayOfWeek} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 bg-surface border border-border rounded-sm p-3">
            <label className="flex items-center gap-2 sm:w-32 shrink-0">
              <input
                type="checkbox"
                checked={rule.active}
                onChange={(e) => updateRule(i, { active: e.target.checked })}
              />
              <span className="text-sm">{DAY_NAMES[rule.dayOfWeek]}</span>
            </label>
            <div className="flex items-center gap-2 flex-wrap">
            <input
              type="time"
              value={rule.openTime}
              onChange={(e) => updateRule(i, { openTime: e.target.value })}
              disabled={!rule.active}
              className="bg-bg border border-border rounded-sm px-2 py-1 text-sm"
            />
            <span className="text-text-muted">–</span>
            <input
              type="time"
              value={rule.closeTime}
              onChange={(e) => updateRule(i, { closeTime: e.target.value })}
              disabled={!rule.active}
              className="bg-bg border border-border rounded-sm px-2 py-1 text-sm"
            />
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => saveRules.mutate(rules)}
        disabled={saveRules.isPending}
        className="mt-4 px-5 py-2 bg-accent text-bg font-display uppercase tracking-wider rounded-sm text-sm disabled:opacity-50"
      >
        {saveRules.isPending ? 'Kaydediliyor...' : 'Kaydet'}
      </button>
    </section>
  );
}
