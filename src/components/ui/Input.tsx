import { cn } from '@/lib/cn';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm text-text-muted uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full bg-surface border border-border rounded-sm px-4 py-2.5 text-text placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors',
          error && 'border-danger',
          className,
        )}
        {...props}
      />
      {error && <span className="text-sm text-danger">{error}</span>}
    </div>
  );
}
