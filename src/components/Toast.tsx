import { useSyncExternalStore } from 'react';
import styles from './toast.module.css';

export interface ToastItem {
  id: number;
  kind: 'error' | 'info';
  message: string;
}

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function showToast(message: string, kind: ToastItem['kind'] = 'info'): void {
  const id = nextId++;
  toasts = [...toasts, { id, kind, message }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 6000);
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function ToastHost() {
  const items = useSyncExternalStore(subscribe, () => toasts);
  if (items.length === 0) return null;
  return (
    <div className={styles.host} role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`${styles.toast} ${t.kind === 'error' ? styles.error : ''}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
