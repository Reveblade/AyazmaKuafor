import { cn } from '@/lib/cn';

interface PageLoaderProps {
  visible: boolean;
}

export function PageLoader({ visible }: PageLoaderProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg transition-opacity duration-500',
        visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
      )}
      aria-hidden={!visible}
      aria-live="polite"
      aria-busy={visible}
    >
      <p className="font-display text-3xl md:text-4xl tracking-[0.25em] uppercase text-accent">
        Ayazma
      </p>
      <div className="mt-8 h-px w-16 bg-border overflow-hidden">
        <div className="h-full w-full origin-left animate-loader-bar bg-accent" />
      </div>
    </div>
  );
}
