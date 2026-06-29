import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  className?: string;
  disabled?: boolean;
};

function CheckIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-bg)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('transition-opacity duration-100', visible ? 'opacity-100' : 'opacity-0')}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function Checkbox({ checked, onChange, label, className, disabled }: CheckboxProps) {
  return (
    <label
      className={cn(
        'inline-flex items-center gap-2.5 min-w-0 cursor-pointer select-none',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          'relative flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors',
          checked
            ? 'border-accent bg-accent'
            : 'border-border bg-surface',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-bg',
        )}
      >
        <CheckIcon visible={checked} />
      </span>
      {label != null && <span className="min-w-0">{label}</span>}
    </label>
  );
}
