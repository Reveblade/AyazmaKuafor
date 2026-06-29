import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn, filterPastSlotsForToday, formatSelectedDurationLabel } from '@/lib/utils';
import type { DayScheduleResponse, ScheduleSlot } from '@/lib/api';
import { DaySchedulePanelSkeleton } from '@/components/ui/Skeleton';

export type SchedulePanelMode = 'block' | 'book';

interface DaySchedulePanelProps {
  date: string;
  schedule: DayScheduleResponse | undefined;
  isLoading?: boolean;
  mode: SchedulePanelMode;
  blockedStarts: Set<string>;
  selectedStartTimes: Set<string>;
  onToggleSlot: (startTime: string) => void;
  onSelectBookingSlot: (startTime: string, shiftKey: boolean) => void;
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
  mode,
  blockedStarts,
  selectedStartTimes,
  onToggleSlot,
  onSelectBookingSlot,
  onToggleAllDay,
  isSaving,
}: DaySchedulePanelProps) {
  const formattedDate = format(parseISO(date), 'd MMMM yyyy, EEEE', { locale: tr });
  const visibleSlots = schedule ? filterPastSlotsForToday(date, schedule.slots) : [];

  const panelClass =
    'border border-border rounded-sm p-4 bg-surface h-full min-h-0 flex flex-col overflow-hidden';

  if (isLoading) {
    return <DaySchedulePanelSkeleton dateLabel={formattedDate} />;
  }

  if (!schedule || schedule.closed) {
    return (
      <div className={panelClass}>
        <h3 className="font-display uppercase tracking-wider text-sm mb-2 shrink-0">{formattedDate}</h3>
        <p className="text-text-muted text-sm">Haftalık programa göre bu gün kapalı.</p>
      </div>
    );
  }

  if (schedule.allDayBlocked) {
    return (
      <div className={panelClass}>
        <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
          <div>
            <h3 className="font-display uppercase tracking-wider text-sm">{formattedDate}</h3>
            {schedule.openTime && schedule.closeTime && (
              <p className="text-xs text-text-muted mt-1">
                {schedule.openTime} – {schedule.closeTime}
              </p>
            )}
          </div>
          {mode === 'block' && (
            <button
              type="button"
              onClick={onToggleAllDay}
              disabled={isSaving}
              className="px-3 py-2 text-sm uppercase tracking-wider text-accent hover:text-accent-hover disabled:opacity-50 shrink-0"
            >
              Tüm günü aç
            </button>
          )}
        </div>
        <p className="text-text-muted text-sm">Tüm gün randevuya kapalı.</p>
      </div>
    );
  }

  return (
    <div className={panelClass}>
      <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
        <div>
          <h3 className="font-display uppercase tracking-wider text-sm">{formattedDate}</h3>
          {schedule.openTime && schedule.closeTime && (
            <p className="text-xs text-text-muted mt-1">
              {schedule.openTime} – {schedule.closeTime}
            </p>
          )}
          {mode === 'book' && (
            <p className="text-xs text-accent mt-2">
              {selectedStartTimes.size > 0
                ? formatSelectedDurationLabel(selectedStartTimes.size, schedule.slotInterval)
                : 'Shift+tık: seçili saate tıklarsanız aralık kalkar, değilse eklenir'}
            </p>
          )}
        </div>
        {mode === 'block' && (
          <button
            type="button"
            onClick={onToggleAllDay}
            disabled={isSaving}
            className="px-3 py-2 text-sm uppercase tracking-wider text-danger hover:opacity-80 disabled:opacity-50 shrink-0"
          >
            Tüm günü kapat
          </button>
        )}
      </div>

      {visibleSlots.length === 0 ? (
        <p className="text-text-muted text-sm">Bu gün için saat bulunmuyor.</p>
      ) : (
        <div className="flex flex-col gap-0 flex-1 min-h-0 overflow-y-auto -mx-1">
          {visibleSlots.map((slot) => {
            const isBlocked = blockedStarts.has(slot.startTime);
            const isBooked = slot.status === 'booked';
            const isSelected = mode === 'book' && selectedStartTimes.has(slot.startTime);
            const selectableInBookMode = slot.status === 'available';
            const toggleable = mode === 'block' ? !isBooked : selectableInBookMode;
            const { label, tone } = getStatusLabel(slot, isBlocked);

            const RowTag = toggleable ? 'button' : 'div';

            return (
              <RowTag
                key={slot.startTime}
                type={toggleable ? 'button' : undefined}
                disabled={toggleable ? isSaving : undefined}
                onClick={(e) => {
                  if (!toggleable) return;
                  if (mode === 'book') onSelectBookingSlot(slot.startTime, e.shiftKey);
                  else onToggleSlot(slot.startTime);
                }}
                className={cn(
                  'flex items-center justify-between gap-4 px-3 py-3.5 border-b border-border/60 text-base text-left w-full transition-colors min-h-[52px]',
                  toggleable && 'hover:bg-surface-elevated cursor-pointer active:bg-surface-elevated',
                  !toggleable && 'cursor-default',
                  isSelected && 'bg-accent/10 ring-1 ring-inset ring-accent/40',
                )}
              >
                <span className="font-mono tabular-nums shrink-0">
                  {slot.startTime}
                  <span className="text-text-muted mx-1.5">–</span>
                  {slot.endTime}
                </span>
                <span className={cn('text-sm uppercase tracking-wider shrink-0 font-medium', toneStyles[tone])}>
                  {mode === 'book' && isSelected ? 'Seçildi' : label}
                </span>
              </RowTag>
            );
          })}
        </div>
      )}
    </div>
  );
}
