import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { DayScheduleResponse, ScheduleSlot } from '@/lib/api';

interface DaySchedulePanelProps {
  date: string;
  schedule: DayScheduleResponse | undefined;
  isLoading?: boolean;
  blockedStarts: Set<string>;
  onToggleSlot: (startTime: string) => void;
  onToggleAllDay: () => void;
  isSaving?: boolean;
}

function getStatusLabel(slot: ScheduleSlot, isBlocked: boolean): { label: string; tone: 'open' | 'closed' | 'booked' } {
  if (slot.status === 'booked') return { label: 'Randevulu', tone: 'booked' };
  if (isBlocked || slot.status === 'blocked') return { label: 'Kapalı', tone: 'closed' };
  return { label: 'Açık', tone: 'open' };
}

const toneStyles = {
  open: 'text-success',
  closed: 'text-danger',
  booked: 'text-text-muted',
};

export function DaySchedulePanel({
  date,
  schedule,
  isLoading,
  blockedStarts,
  onToggleSlot,
  onToggleAllDay,
  isSaving,
}: DaySchedulePanelProps) {
  const formattedDate = format(parseISO(date), 'd MMMM yyyy, EEEE', { locale: tr });

  if (isLoading) {
    return (
      <div className="border border-border rounded-sm p-4 bg-surface min-h-[320px] flex flex-col">
        <h3 className="font-display uppercase tracking-wider text-sm mb-4">{formattedDate}</h3>
        <div className="flex flex-col gap-0 flex-1 animate-pulse">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/40">
              <div className="h-4 w-28 bg-border/30 rounded-sm" />
              <div className="h-3 w-16 bg-border/30 rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!schedule || schedule.closed) {
    return (
      <div className="border border-border rounded-sm p-4 bg-surface min-h-[320px]">
        <h3 className="font-display uppercase tracking-wider text-sm mb-2">{formattedDate}</h3>
        <p className="text-text-muted text-sm">Haftalık programa göre bu gün kapalı.</p>
      </div>
    );
  }

  if (schedule.allDayBlocked) {
    return (
      <div className="border border-border rounded-sm p-4 bg-surface min-h-[320px]">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display uppercase tracking-wider text-sm">{formattedDate}</h3>
            {schedule.openTime && schedule.closeTime && (
              <p className="text-xs text-text-muted mt-1">
                {schedule.openTime} – {schedule.closeTime}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleAllDay}
            disabled={isSaving}
            className="text-xs uppercase tracking-wider text-accent hover:text-accent-hover disabled:opacity-50"
          >
            Tüm günü aç
          </button>
        </div>
        <p className="text-text-muted text-sm">Tüm gün randevuya kapalı.</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-sm p-4 bg-surface min-h-[320px] flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
        <div>
          <h3 className="font-display uppercase tracking-wider text-sm">{formattedDate}</h3>
          {schedule.openTime && schedule.closeTime && (
            <p className="text-xs text-text-muted mt-1">
              {schedule.openTime} – {schedule.closeTime}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleAllDay}
          disabled={isSaving}
          className="text-xs uppercase tracking-wider text-danger hover:opacity-80 disabled:opacity-50"
        >
          Tüm günü kapat
        </button>
      </div>

      {schedule.slots.length === 0 ? (
        <p className="text-text-muted text-sm">Bu gün için saat bulunmuyor.</p>
      ) : (
        <div className="flex flex-col gap-0 max-h-[420px] overflow-y-auto -mx-1">
          {schedule.slots.map((slot) => {
            const isBlocked = blockedStarts.has(slot.startTime);
            const isBooked = slot.status === 'booked';
            const toggleable = !isBooked;
            const { label, tone } = getStatusLabel(slot, isBlocked);

            const RowTag = toggleable ? 'button' : 'div';

            return (
              <RowTag
                key={slot.startTime}
                type={toggleable ? 'button' : undefined}
                disabled={toggleable ? isSaving : undefined}
                onClick={() => toggleable && onToggleSlot(slot.startTime)}
                className={cn(
                  'flex items-center justify-between gap-4 px-2 py-2.5 border-b border-border/60 text-sm text-left w-full transition-colors',
                  toggleable && 'hover:bg-surface-elevated cursor-pointer',
                  !toggleable && 'cursor-default',
                )}
              >
                <span className="font-mono tabular-nums shrink-0">
                  {slot.startTime}
                  <span className="text-text-muted mx-1.5">–</span>
                  {slot.endTime}
                </span>
                <span className={cn('text-xs uppercase tracking-wider shrink-0', toneStyles[tone])}>
                  {label}
                </span>
              </RowTag>
            );
          })}
        </div>
      )}
    </div>
  );
}
