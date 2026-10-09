import { useEffect, useRef, useState } from 'react';

export function useMinimumLoading(active: boolean, minMs = 400, resetKey?: string | null) {
  const [visible, setVisible] = useState(false);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, [resetKey]);

  useEffect(() => {
    if (active) {
      if (startedAt.current == null) startedAt.current = Date.now();
      setVisible(true);
      return;
    }

    if (startedAt.current == null) {
      setVisible(false);
      return;
    }

    const remaining = minMs - (Date.now() - startedAt.current);
    if (remaining <= 0) {
      startedAt.current = null;
      setVisible(false);
      return;
    }

    const timer = window.setTimeout(() => {
      startedAt.current = null;
      setVisible(false);
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [active, minMs, resetKey]);

  return visible;
}
