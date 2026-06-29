import { format, parseISO } from 'date-fns';
import { tr, enGB } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { slotOverlapsRange } from '@/lib/utils';
import { getLocale } from '@/i18n';
import type { DaySchedule, ScheduleSlot } from '@/types';

interface DaySchedulePanelProps {
  date: string;
  schedule: DaySchedule | undefined;
  isLoading?: boolean;
  mode: 'customer' | 'admin';
  selectedTime?: string | null;
  onSelectTime?: (time: string) => void;
  bookingDurationMinutes?: number;
  slotInterval?: number;
  blockedStarts?: Set<string>;
  onToggleSlot?: (startTime: string) => void;
  onToggleAllDay?: () => void;
  isSaving?: boolean;
}

function getCustomerStatusLabel(
  slot: ScheduleSlot,
  isBlocked: boolean,
  t: (key: string) => string,
): { label: string; tone: 'available' | 'blocked' | 'booked' | 'muted' } {
  if (isBlocked || slot.status === 'blocked') {
    return { label: t('schedule.statusBlocked'), tone: 'blocked' };
  }
  if (slot.status === 'booked') {
    return { label: t('schedule.statusBooked'), tone: 'booked' };
  }
  if (slot.bookable) {
    return { label: t('schedule.statusAvailable'), tone: 'available' };
  }
  return { label: t('schedule.statusBlocked'), tone: 'muted' };
}

function getAdminStatusLabel(
  slot: ScheduleSlot,
  isBlocked: boolean,
  t: (key: string) => string,
): { label: string; tone: 'available' | 'blocked' | 'booked' } {
  if (slot.status === 'booked') {
    return { label: t('schedule.statusBooked'), tone: 'booked' };
  }
  if (isBlocked || slot.status === 'blocked') {
    return { label: t('schedule.statusClosed'), tone: 'blocked' };
  }
  return { label: t('schedule.statusOpen'), tone: 'available' };
}

const toneStyles = {
  available: 'text-success',
  blocked: 'text-danger',
  booked: 'text-text-muted',
  muted: 'text-text-muted/50',
};

export function DaySchedulePanel({
  date,
  schedule,
  isLoading,
  mode,
  selectedTime,
  onSelectTime,
  bookingDurationMinutes,
  slotInterval,
  blockedStarts,
  onToggleSlot,
  onToggleAllDay,
  isSaving,
}: DaySchedulePanelProps) {
  const { t } = useTranslation();
  const locale = getLocale();
  const dateLocale = locale === 'tr' ? tr : enGB;

  const formattedDate = format(parseISO(date), 'd MMMM yyyy, EEEE', { locale: dateLocale });

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
        <p className="text-text-muted text-sm">{t('schedule.closedDay')}</p>
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
          {mode === 'admin' && onToggleAllDay && (
            <button
              type="button"
              onClick={onToggleAllDay}
              disabled={isSaving}
              className="text-xs uppercase tracking-wider text-accent hover:text-accent-hover disabled:opacity-50"
            >
              {t('schedule.openAllDay')}
            </button>
          )}
        </div>
        <p className="text-text-muted text-sm">{t('schedule.allDayBlocked')}</p>
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
        {mode === 'admin' && onToggleAllDay && (
          <button
            type="button"
            onClick={onToggleAllDay}
            disabled={isSaving}
            className="text-xs uppercase tracking-wider text-danger hover:opacity-80 disabled:opacity-50"
          >
            {t('schedule.blockAllDay')}
          </button>
        )}
      </div>

      {schedule.slots.length === 0 ? (
        <p className="text-text-muted text-sm">{t('schedule.noSlots')}</p>
      ) : (
        <div className="flex flex-col gap-0 max-h-[420px] overflow-y-auto -mx-1">
          {schedule.slots.map((slot) => {
            const isBlocked = blockedStarts?.has(slot.startTime) ?? slot.status === 'blocked';
            const isSelectionStart = selectedTime === slot.startTime;
            const isInSelection =
              mode === 'customer' &&
              !!selectedTime &&
              !!bookingDurationMinutes &&
              slotOverlapsRange(slot.startTime, slot.endTime, selectedTime, bookingDurationMinutes);
            const slotCount =
              bookingDurationMinutes && slotInterval && bookingDurationMinutes > slotInterval
                ? bookingDurationMinutes / slotInterval
                : 1;
            const { label, tone } = mode === 'customer'
              ? getCustomerStatusLabel(slot, isBlocked, t)
              : getAdminStatusLabel(slot, isBlocked, t);

            const clickable = mode === 'customer'
              ? slot.bookable
              : slot.status !== 'booked';

            const RowTag = clickable ? 'button' : 'div';

            return (
              <RowTag
                key={slot.startTime}
                type={clickable ? 'button' : undefined}
                disabled={clickable ? (mode === 'admin' ? isSaving : false) : undefined}
                onClick={() => {
                  if (mode === 'customer' && slot.bookable) onSelectTime?.(slot.startTime);
                  if (mode === 'admin' && slot.status !== 'booked') onToggleSlot?.(slot.startTime);
                }}
                className={cn(
                  'flex items-center justify-between gap-4 px-2 py-2.5 border-b border-border/60 text-sm text-left w-full transition-colors',
                  clickable && 'hover:bg-surface-elevated cursor-pointer',
                  !clickable && 'cursor-default',
                  isInSelection && 'bg-accent/10 border-accent/30',
                  isSelectionStart && 'ring-1 ring-inset ring-accent/40',
                )}
              >
                <span className={cn('font-mono tabular-nums shrink-0', isInSelection && 'text-accent')}>
                  {slot.startTime}
                  <span className="text-text-muted mx-1.5">–</span>
                  {slot.endTime}
                  {mode === 'customer' && isSelectionStart && slotCount > 1 && (
                    <span className="text-text-muted text-xs ml-2 normal-case font-sans">
                      ({slotCount} {t('schedule.slots')})
                    </span>
                  )}
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
