import { cn } from '@/lib/utils';

export const skeletonBarClass = 'bg-border/25 rounded-sm animate-pulse';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn(skeletonBarClass, className)} aria-hidden="true" />;
}

export function SkeletonSpinner({ label = 'Yükleniyor...' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-text-muted" role="status" aria-live="polite">
      <div
        className="h-4 w-4 border-2 border-border border-t-accent rounded-full animate-spin shrink-0"
        aria-hidden="true"
      />
      <span className="text-xs uppercase tracking-wider">{label}</span>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-sm p-6">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-10 w-16 mt-3" />
    </div>
  );
}

export function StatCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function AppointmentCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-sm p-4 sm:p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2 min-w-0">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-20 shrink-0" />
      </div>
      <Skeleton className="h-4 w-3/4 max-w-xs" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

export function AppointmentListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <AppointmentCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ListRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 bg-surface border border-border rounded-sm px-4 py-3">
      <div className="flex-1 space-y-2 min-w-0">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="h-6 w-16 shrink-0" />
    </div>
  );
}

export function ListRowsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-2 sm:gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ListRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function CalendarDayCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-sm p-4 sm:p-5 flex flex-col min-h-[12rem]">
      <Skeleton className="h-5 w-full mb-3 pb-3 border-b border-border/50" />
      <div className="mt-1 flex flex-col gap-2 flex-1">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}

export function CalendarGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <CalendarDayCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CustomerListItemSkeleton() {
  return (
    <div className="w-full px-4 py-3 border-b border-border/60 space-y-2">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

export function CustomerListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="overflow-y-auto">
      {Array.from({ length: count }).map((_, i) => (
        <CustomerListItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function CustomerDetailSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'border border-border rounded-sm bg-surface flex flex-col min-h-0 h-full overflow-hidden',
        className,
      )}
    >
      <div className="p-4 sm:p-5 border-b border-border shrink-0">
        <div className="mb-4">
          <SkeletonSpinner />
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Skeleton className="h-3 w-8 mb-1.5" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div>
            <Skeleton className="h-3 w-12 mb-1.5" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <div className="mt-3">
          <Skeleton className="h-3 w-14 mb-1.5" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden p-4 sm:p-5 space-y-6">
        <section className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </section>
        <section className="space-y-3">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </section>
      </div>
    </div>
  );
}

export function ServiceCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-sm p-4 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-3 w-28" />
      </div>
      <div className="flex gap-2 shrink-0">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-10" />
      </div>
    </div>
  );
}

export function CategoryCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-sm p-3 flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
      <Skeleton className="h-4 w-28" />
      <div className="flex gap-2">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-10" />
      </div>
    </div>
  );
}

export function ServicesPageSkeleton() {
  return (
    <div className="space-y-10 mt-10">
      <section className="space-y-4">
        <Skeleton className="h-5 w-28" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <CategoryCardSkeleton key={i} />
          ))}
        </div>
      </section>
      <section className="space-y-4">
        <Skeleton className="h-5 w-36" />
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <ServiceCardSkeleton key={i} />
          ))}
        </div>
      </section>
      <section className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <div className="grid gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <ServiceCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

export function WeeklyHoursSkeleton() {
  return (
    <div className="flex flex-col flex-1 bg-surface border border-border rounded-sm p-4">
      <div className="grid gap-2 flex-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[7rem_1fr_auto_1fr] items-center gap-2 sm:gap-3 bg-bg border border-border rounded-sm px-3 py-2"
          >
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-full mt-4" />
    </div>
  );
}

export function DayScheduleSlotSkeleton() {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-border/40">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

export function DaySchedulePanelSkeleton({ dateLabel }: { dateLabel?: string }) {
  return (
    <div className="border border-border rounded-sm p-4 bg-surface h-full min-h-0 flex flex-col overflow-hidden">
      {dateLabel ? (
        <h3 className="font-display uppercase tracking-wider text-sm mb-4 shrink-0">{dateLabel}</h3>
      ) : (
        <Skeleton className="h-4 w-48 mb-4 shrink-0" />
      )}
      <div className="mb-3 shrink-0">
        <SkeletonSpinner />
      </div>
      <div className="flex flex-col gap-0 flex-1 min-h-0 overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <DayScheduleSlotSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function AppShellSkeleton() {
  return (
    <div className="min-h-dvh flex bg-bg">
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-surface p-4">
        <Skeleton className="h-6 w-32 mb-8" />
        <div className="space-y-2 flex-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
        <Skeleton className="h-9 w-full mt-4" />
      </aside>
      <main className="flex-1 p-4 md:p-8 min-w-0">
        <Skeleton className="h-8 w-40 mb-8" />
        <StatCardsSkeleton />
        <div className="mt-10">
          <Skeleton className="h-5 w-52 mb-6" />
          <AppointmentListSkeleton count={2} />
        </div>
      </main>
    </div>
  );
}
