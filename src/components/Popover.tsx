import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import styles from './popover.module.css';

interface PopoverProps {
  /** Viewport-relative rect to anchor next to. */
  anchor: { left: number; top: number; right: number; bottom: number };
  onClose: () => void;
  children: ReactNode;
}

/**
 * Fixed-position popover anchored to a rect, clamped to the viewport.
 * Closes on outside pointerdown and Escape.
 */
export function Popover({ anchor, onClose, children }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const margin = 8;

    // Prefer right of the anchor, then left, then below.
    let left = anchor.right + margin;
    if (left + width > window.innerWidth - margin) {
      left = anchor.left - width - margin;
    }
    if (left < margin) {
      left = Math.min(Math.max(anchor.left, margin), window.innerWidth - width - margin);
    }

    let top = anchor.top;
    if (top + height > window.innerHeight - margin) {
      top = window.innerHeight - height - margin;
    }
    if (top < margin) top = margin;

    setPos({ left, top });
  }, [anchor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={styles.popover}
      style={pos ? { left: pos.left, top: pos.top, visibility: 'visible' } : undefined}
      role="dialog"
    >
      {children}
    </div>
  );
}
