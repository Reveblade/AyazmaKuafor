import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SectionHeaderProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function SectionHeader({ title, description, actions, className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-4', className)}>
      <div
        className={cn(
          actions ? 'flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start' : undefined,
        )}
      >
        <div>
          <h2 className="font-display text-xl uppercase">{title}</h2>
          {description && (
            <p className="text-sm text-text-muted mt-1 max-w-2xl">{description}</p>
          )}
        </div>
        {actions}
      </div>
    </div>
  );
}
