const STORAGE_KEY = 'admin-unseen-cancelled';

const listeners = new Set<() => void>();

function readIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeIds(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  listeners.forEach((listener) => listener());
}

export function subscribeUnseenCancelled(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getUnseenCancelledIds(): string[] {
  return [...readIds()];
}

export function getUnseenCancelledCount(): number {
  return readIds().size;
}

export function isUnseenCancelled(id: string): boolean {
  return readIds().has(id);
}

export function addUnseenCancelled(id: string) {
  const ids = readIds();
  if (ids.has(id)) return;
  ids.add(id);
  writeIds(ids);
}

export function markCancelledSeen(id: string) {
  const ids = readIds();
  if (!ids.has(id)) return;
  ids.delete(id);
  writeIds(ids);
}
