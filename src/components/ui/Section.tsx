import { cn } from '@/lib/cn';
import type { HTMLAttributes } from 'react';

export function Container({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mx-auto w-full max-w-[var(--max-width-content)] px-4 md:px-6', className)} {...props}>
      {children}
    </div>
  );
}

interface SectionProps extends HTMLAttributes<HTMLElement> {
  id?: string;
}

export function Section({ className, children, ...props }: SectionProps) {
  return (
    <section className={cn('section-padding', className)} {...props}>
      {children}
    </section>
  );
}
