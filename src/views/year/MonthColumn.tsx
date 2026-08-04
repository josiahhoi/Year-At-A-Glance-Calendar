import { useMemo } from 'react';
import { contrastText } from '../../model/color';
import type { AppEvent } from '../../model/eventModel';
import { dayOfWeek, daysInMonth, fromParts, type IsoDate } from '../../model/isoDate';
import type { MonthSegment } from '../../model/segments';
import { useGridDrag, type GridDragCallbacks } from './useGridDrag';
import styles from './yearView.module.css';

export interface PlacedSegment {
  seg: MonthSegment;
  lane: number;
  cols: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface MonthColumnProps {
  year: number;
  month: number;
  placed: PlacedSegment[];
  color: string;
  todayDate: IsoDate;
  callbacks: GridDragCallbacks;
}

export function MonthColumn({ year, month, placed, color, todayDate, callbacks }: MonthColumnProps) {
  const monthDays = daysInMonth(year, month);

  const segmentsByKey = useMemo(() => {
    const map = new Map<string, MonthSegment>();
    for (const p of placed) map.set(segKey(p.seg), p.seg);
    return map;
  }, [placed]);

  const { bodyRef, preview, handlers } = useGridDrag(year, month, monthDays, segmentsByKey, callbacks);

  const days = useMemo(() => {
    return Array.from({ length: 31 }, (_, i) => {
      const day = i + 1;
      const valid = day <= monthDays;
      const date = valid ? fromParts(year, month, day) : null;
      const dow = date ? dayOfWeek(date) : 0;
      return { day, valid, isToday: date === todayDate, isWeekend: valid && (dow === 0 || dow === 6) };
    });
  }, [year, month, monthDays, todayDate]);

  const isCurrentMonth = todayDate.startsWith(`${year}-${String(month).padStart(2, '0')}`);
  const draggedEventId = preview?.eventId;
  const fg = contrastText(color);

  return (
    <div className={styles.monthCol} data-month={month}>
      <div className={`${styles.monthHeader} ${isCurrentMonth ? styles.monthHeaderNow : ''}`}>
        {MONTH_NAMES[month - 1]}
      </div>
      <div
        ref={bodyRef}
        className={styles.monthBody}
        onPointerDown={handlers.onPointerDown}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        onPointerCancel={handlers.onPointerCancel}
      >
        {days.map(({ day, valid, isToday, isWeekend }) => (
          <div
            key={day}
            className={[
              styles.dayRow,
              valid ? '' : styles.dayInvalid,
              isWeekend ? styles.dayWeekend : '',
              isToday ? styles.dayToday : '',
            ].join(' ')}
          >
            <span className={styles.dayNum}>{valid ? day : ''}</span>
          </div>
        ))}

        <div className={styles.eventArea}>
          {placed.map(({ seg, lane, cols }) => {
            const span = seg.endDay - seg.startDay + 1;
            const isDragged = draggedEventId === seg.event.id;
            return (
              <div
                key={segKey(seg)}
                data-seg-key={segKey(seg)}
                className={[
                  styles.eventBlock,
                  seg.clippedTop ? styles.clippedTop : '',
                  seg.clippedBottom ? styles.clippedBottom : '',
                  seg.event.recurringEventId ? styles.recurring : '',
                  isDragged ? styles.dragSource : '',
                ].join(' ')}
                style={{
                  top: `calc((${seg.startDay} - 1) * var(--day-row-h) + 1px)`,
                  height: `calc(${span} * var(--day-row-h) - 2px)`,
                  left: `${(lane / cols) * 100}%`,
                  width: `calc(${100 / cols}% - 2px)`,
                  background: color,
                  color: fg,
                }}
                title={`${seg.event.title}\n${seg.event.startDate} → ${seg.event.endDate}`}
              >
                {!seg.event.recurringEventId && !seg.clippedTop && (
                  <div className={styles.handleTop} />
                )}
                <span className={styles.eventTitle} style={{ WebkitLineClamp: Math.max(span, 1) }}>
                  {seg.event.title}
                </span>
                {!seg.event.recurringEventId && !seg.clippedBottom && (
                  <div className={styles.handleBottom} />
                )}
              </div>
            );
          })}

          {preview && (
            <div
              className={`${styles.previewBlock} ${preview.mode === 'create' ? styles.previewCreate : ''}`}
              style={{
                top: `calc((${preview.startDay} - 1) * var(--day-row-h))`,
                height: `calc(${preview.endDay - preview.startDay + 1} * var(--day-row-h))`,
                background: preview.mode === 'create' ? undefined : color,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function segKey(seg: MonthSegment): string {
  return `${seg.event.id}:${seg.year}-${seg.month}`;
}

export function eventForSeg(placed: PlacedSegment[], key: string): AppEvent | null {
  for (const p of placed) if (segKey(p.seg) === key) return p.seg.event;
  return null;
}
