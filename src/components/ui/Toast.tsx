import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';

type ToastVariant = 'warning' | 'error' | 'info';

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, string> = {
  warning: 'border-warning/60 text-text',
  error: 'border-danger/60 text-text',
  info: 'border-accent/60 text-text',
};

function ToastBanner({ toast, onDone }: { toast: ToastItem; onDone: () => void }) {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter');

  useEffect(() => {
    const enterFrame = requestAnimationFrame(() => setPhase('visible'));
    const hideTimer = setTimeout(() => setPhase('exit'), 2800);
    const removeTimer = setTimeout(onDone, 3300);

    return () => {
      cancelAnimationFrame(enterFrame);
      clearTimeout(hideTimer);
      clearTimeout(removeTimer);
    };
  }, [onDone]);

  return (
    <div
      role="alert"
      className={cn(
        'pointer-events-auto max-w-md w-full rounded-sm border bg-surface-elevated px-4 py-3 text-sm shadow-lg transition-all duration-300 ease-out',
        variantStyles[toast.variant],
        phase === 'enter' && '-translate-y-full opacity-0',
        phase === 'visible' && 'translate-y-0 opacity-100',
        phase === 'exit' && '-translate-y-full opacity-0',
      )}
    >
      {toast.message}
    </div>
  );
}

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (!toasts.length) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 px-4 pt-4 pointer-events-none">
      {toasts.map((toast) => (
        <ToastBanner key={toast.id} toast={toast} onDone={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, variant: ToastVariant = 'warning') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
