import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-8', className)}>
      <div
        className={cn(
          actions ? 'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between' : undefined,
        )}
      >
        <div>
          <h1 className="font-display text-2xl sm:text-3xl uppercase">{title}</h1>
          {description && (
            <p className="text-sm text-text-muted mt-2 max-w-2xl">{description}</p>
          )}
        </div>
        {actions}
      </div>
    </header>
  );
}
