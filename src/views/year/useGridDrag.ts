import { useEffect, useRef, useState } from 'react';
import type { AppEvent } from '../../model/eventModel';
import { addDays, fromParts, type IsoDate } from '../../model/isoDate';
import type { MonthSegment } from '../../model/segments';

export interface AnchorRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface DragPreview {
  mode: 'create' | 'move' | 'resize-start' | 'resize-end';
  startDay: number;
  endDay: number;
  eventId?: string;
}

export interface GridDragHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: () => void;
}

export interface GridDragCallbacks {
  onClickDay: (day: number, anchor: AnchorRect) => void;
  onCreateRange: (startDay: number, endDay: number, anchor: AnchorRect) => void;
  onClickSegment: (seg: MonthSegment, anchor: AnchorRect) => void;
  onChangeEventDates: (event: AppEvent, startDate: IsoDate, endDate: IsoDate) => void;
}

interface DragState {
  pointerId: number;
  mode: DragPreview['mode'];
  seg: MonthSegment | null;
  segEl: HTMLElement | null;
  anchorDay: number;
  currentDay: number;
  startClientY: number;
  moved: boolean;
}

const DRAG_THRESHOLD_PX = 4;
const RESIZE_ZONE_PX = 7;

/**
 * Pointer-event state machine for one month column of the year grid.
 *
 * idle → pointerdown classifies (create on empty cells; move/resize on a
 * block, zone-dependent) → movement past a 4px threshold starts the drag →
 * pointerup commits (or, without movement, counts as a click). Escape or
 * pointercancel abandons the gesture.
 */
export function useGridDrag(
  year: number,
  month: number,
  monthDays: number,
  segmentsByKey: Map<string, MonthSegment>,
  callbacks: GridDragCallbacks,
) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [preview, setPreview] = useState<DragPreview | null>(null);

  // Escape abandons an in-flight drag.
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dragRef.current = null;
        setPreview(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [preview]);

  function rowHeight(): number {
    const body = bodyRef.current;
    return body ? body.clientHeight / 31 : 22;
  }

  function dayAtY(clientY: number): number {
    const body = bodyRef.current;
    if (!body) return 1;
    const y = clientY - body.getBoundingClientRect().top;
    const day = Math.floor(y / rowHeight()) + 1;
    return Math.min(Math.max(day, 1), monthDays);
  }

  function cellAnchor(day: number): AnchorRect {
    const body = bodyRef.current!;
    const rect = body.getBoundingClientRect();
    const h = rowHeight();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top + (day - 1) * h,
      bottom: rect.top + day * h,
    };
  }

  function previewFor(state: DragState): DragPreview {
    const { mode, seg, anchorDay, currentDay } = state;
    if (mode === 'create' || !seg) {
      return {
        mode: 'create',
        startDay: Math.min(anchorDay, currentDay),
        endDay: Math.max(anchorDay, currentDay),
      };
    }
    if (mode === 'move') {
      const span = seg.endDay - seg.startDay;
      let delta = currentDay - anchorDay;
      delta = Math.max(delta, 1 - seg.startDay);
      delta = Math.min(delta, monthDays - seg.endDay);
      return {
        mode,
        startDay: seg.startDay + delta,
        endDay: seg.startDay + delta + span,
        eventId: seg.event.id,
      };
    }
    if (mode === 'resize-start') {
      return {
        mode,
        startDay: Math.min(currentDay, seg.endDay),
        endDay: seg.endDay,
        eventId: seg.event.id,
      };
    }
    return {
      mode: 'resize-end',
      startDay: seg.startDay,
      endDay: Math.max(currentDay, seg.startDay),
      eventId: seg.event.id,
    };
  }

  const handlers: GridDragHandlers = {
    onPointerDown(e) {
      if (e.button !== 0 || dragRef.current) return;
      const day = dayAtY(e.clientY);
      const segEl = (e.target as HTMLElement).closest<HTMLElement>('[data-seg-key]');
      const seg = segEl ? (segmentsByKey.get(segEl.dataset.segKey!) ?? null) : null;

      let mode: DragPreview['mode'] = 'create';
      if (seg) {
        // Recurring events and cross-month moves are popover-only; a drag on
        // them is treated as a click.
        const body = bodyRef.current!;
        const yInBody = e.clientY - body.getBoundingClientRect().top;
        const blockTop = (seg.startDay - 1) * rowHeight();
        const blockBottom = seg.endDay * rowHeight();
        const editable = !seg.event.recurringEventId;
        if (editable && !seg.clippedTop && yInBody - blockTop < RESIZE_ZONE_PX) {
          mode = 'resize-start';
        } else if (editable && !seg.clippedBottom && blockBottom - yInBody < RESIZE_ZONE_PX) {
          mode = 'resize-end';
        } else if (editable && !seg.clippedTop && !seg.clippedBottom) {
          mode = 'move';
        } else {
          // Click-only target: remember it, but never start a drag.
          dragRef.current = {
            pointerId: e.pointerId,
            mode: 'move',
            seg,
            segEl,
            anchorDay: day,
            currentDay: day,
            startClientY: e.clientY,
            moved: false,
          };
          return;
        }
      }

      dragRef.current = {
        pointerId: e.pointerId,
        mode,
        seg,
        segEl,
        anchorDay: day,
        currentDay: day,
        startClientY: e.clientY,
        moved: false,
      };
      bodyRef.current?.setPointerCapture(e.pointerId);
    },

    onPointerMove(e) {
      const state = dragRef.current;
      if (!state || e.pointerId !== state.pointerId) return;
      // Click-only targets (recurring / cross-month blocks) never drag.
      const clickOnly =
        state.seg &&
        (state.seg.event.recurringEventId ||
          (state.mode === 'move' && (state.seg.clippedTop || state.seg.clippedBottom)));
      if (clickOnly) return;

      state.currentDay = dayAtY(e.clientY);
      if (!state.moved && Math.abs(e.clientY - state.startClientY) > DRAG_THRESHOLD_PX) {
        state.moved = true;
      }
      setPreview(state.moved ? previewFor(state) : null);
    },

    onPointerUp(e) {
      const state = dragRef.current;
      if (!state || e.pointerId !== state.pointerId) return;
      dragRef.current = null;
      setPreview(null);

      if (!state.moved) {
        if (state.seg && state.segEl) {
          callbacks.onClickSegment(state.seg, state.segEl.getBoundingClientRect());
        } else {
          callbacks.onClickDay(state.anchorDay, cellAnchor(state.anchorDay));
        }
        return;
      }

      const p = previewFor(state);
      if (p.mode === 'create') {
        callbacks.onCreateRange(p.startDay, p.endDay, cellAnchor(p.endDay));
        return;
      }

      const seg = state.seg!;
      const event = seg.event;
      if (p.mode === 'move') {
        const delta = p.startDay - seg.startDay;
        if (delta !== 0) {
          callbacks.onChangeEventDates(
            event,
            addDays(event.startDate, delta),
            addDays(event.endDate, delta),
          );
        }
      } else if (p.mode === 'resize-start') {
        const newStart = fromParts(year, month, p.startDay);
        if (newStart !== event.startDate) {
          callbacks.onChangeEventDates(event, newStart, event.endDate);
        }
      } else {
        const newEnd = fromParts(year, month, p.endDay);
        if (newEnd !== event.endDate) {
          callbacks.onChangeEventDates(event, event.startDate, newEnd);
        }
      }
    },

    onPointerCancel() {
      dragRef.current = null;
      setPreview(null);
    },
  };

  return { bodyRef, preview, handlers };
}
