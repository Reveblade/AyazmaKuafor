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

export function AvailabilityPage() {
  const queryClient = useQueryClient();
  const [rules, setRules] = useState<AvailabilityRuleInput[]>(defaultRules);
  const [blockDate, setBlockDate] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockAllDay, setBlockAllDay] = useState(true);

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

  const { data: blocks } = useQuery({
    queryKey: ['availability-blocks'],
    queryFn: adminApi.getAvailabilityBlocks,
  });

  const saveRules = useMutation({
    mutationFn: adminApi.saveAvailabilityRules,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['availability-rules'] }),
  });

  const createBlock = useMutation({
    mutationFn: adminApi.createAvailabilityBlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-blocks'] });
      setBlockDate('');
      setBlockReason('');
    },
  });

  const deleteBlock = useMutation({
    mutationFn: adminApi.deleteAvailabilityBlock,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['availability-blocks'] }),
  });

  const updateRule = (index: number, patch: Partial<AvailabilityRuleInput>) => {
    setRules((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Müsaitlik</h1>

      <section className="mt-8">
        <h2 className="font-display text-lg uppercase mb-4">Haftalık Saatler</h2>
        <div className="grid gap-3 max-w-xl">
          {rules.map((rule, i) => (
            <div key={rule.dayOfWeek} className="flex items-center gap-4 bg-surface border border-border rounded-sm p-3">
              <label className="flex items-center gap-2 w-32">
                <input
                  type="checkbox"
                  checked={rule.active}
                  onChange={(e) => updateRule(i, { active: e.target.checked })}
                />
                <span className="text-sm">{DAY_NAMES[rule.dayOfWeek]}</span>
              </label>
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
          ))}
        </div>
        <button
          onClick={() => saveRules.mutate(rules)}
          disabled={saveRules.isPending}
          className="mt-4 px-5 py-2 bg-accent text-bg font-display uppercase tracking-wider rounded-sm text-sm"
        >
          Kaydet
        </button>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-lg uppercase mb-4">Kapalı Günler / Bloklar</h2>
        <div className="flex flex-wrap gap-3 items-end max-w-xl">
          <div>
            <label className="text-xs text-text-muted uppercase">Tarih</label>
            <input
              type="date"
              value={blockDate}
              onChange={(e) => setBlockDate(e.target.value)}
              className="block mt-1 bg-bg border border-border rounded-sm px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted uppercase">Sebep</label>
            <input
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="block mt-1 bg-bg border border-border rounded-sm px-3 py-1.5 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm pb-1.5">
            <input type="checkbox" checked={blockAllDay} onChange={(e) => setBlockAllDay(e.target.checked)} />
            Tüm gün
          </label>
          <button
            onClick={() => blockDate && createBlock.mutate({ date: blockDate, allDay: blockAllDay, reason: blockReason })}
            className="px-4 py-1.5 bg-accent text-bg rounded-sm text-sm uppercase tracking-wider"
          >
            Ekle
          </button>
        </div>

        <div className="mt-6 grid gap-2 max-w-xl">
          {blocks?.map((b) => (
            <div key={b.id} className="flex justify-between items-center bg-surface border border-border rounded-sm p-3 text-sm">
              <span>{b.date} {b.allDay ? '(Tüm gün)' : ''} {b.reason && `– ${b.reason}`}</span>
              <button onClick={() => deleteBlock.mutate(b.id)} className="text-danger text-xs uppercase">Sil</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
