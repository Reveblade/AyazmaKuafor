import { cn } from '@/lib/cn';
import type { AppointmentStatus } from '@/types';

const statusStyles: Record<AppointmentStatus, string> = {
  pending: 'bg-warning/20 text-warning border-warning/40',
  accepted: 'bg-success/20 text-success border-success/40',
  rejected: 'bg-danger/20 text-danger border-danger/40',
  cancelled: 'bg-text-muted/20 text-text-muted border-text-muted/40',
  completed: 'bg-accent/20 text-accent border-accent/40',
};

interface BadgeProps {
  status: AppointmentStatus;
  label: string;
}

export function Badge({ status, label }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider border rounded-sm',
        statusStyles[status],
      )}
    >
      {label}
    </span>
  );
}
