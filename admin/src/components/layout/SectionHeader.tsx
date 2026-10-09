import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SectionHeaderProps = {
  title: string;
  description?: ReactNode;
  descriptionClassName?: string;
  actions?: ReactNode;
  className?: string;
};

export function SectionHeader({
  title,
  description,
  descriptionClassName,
  actions,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('mb-3', className)}>
      <div
        className={cn(
          actions ? 'flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start' : undefined,
        )}
      >
        <div className="min-w-0">
          <h2 className="font-display text-xl uppercase">{title}</h2>
          {description && (
            <p
              className={cn(
                'text-xs text-text-muted mt-0.5 max-w-xl leading-snug',
                descriptionClassName,
              )}
            >
              {description}
            </p>
          )}
        </div>
        {actions}
      </div>
    </div>
  );
}
