import { cn } from '@/lib/cn';
import type { HTMLAttributes } from 'react';

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-surface border border-border rounded-sm p-6', className)}
      {...props}
    >
      {children}
    </div>
  );
}
