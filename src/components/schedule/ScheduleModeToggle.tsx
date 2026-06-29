import { cn } from '@/lib/utils';
import type { SchedulePanelMode } from './DaySchedulePanel';

type ScheduleModeToggleProps = {
  mode: SchedulePanelMode;
  onModeChange: (mode: SchedulePanelMode) => void;
};

const buttonClass = (active: boolean) =>
  cn(
    'flex-1 sm:flex-none sm:w-40 px-3 py-2 text-sm uppercase tracking-wider border rounded-sm transition-colors text-center',
    active
      ? 'border-accent bg-accent/10 text-accent'
      : 'border-border text-text-muted hover:text-text',
  );

export function ScheduleModeToggle({ mode, onModeChange }: ScheduleModeToggleProps) {
  return (
    <div className="flex w-full sm:w-auto gap-2 shrink-0">
      <button type="button" onClick={() => onModeChange('block')} className={buttonClass(mode === 'block')}>
        Saat Kapat / Aç
      </button>
      <button type="button" onClick={() => onModeChange('book')} className={buttonClass(mode === 'book')}>
        Randevu Yaz
      </button>
    </div>
  );
}
