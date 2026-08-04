import type { AppEvent } from './eventModel';
import { dayOf, daysInMonth, fromParts, monthOf, yearOf, type IsoDate } from './isoDate';

/**
 * One event's slice within a single month column of the year grid.
 * Events spanning month boundaries produce one segment per month,
 * flagged so the UI can render clipped edges.
 */
export interface MonthSegment {
  event: AppEvent;
  year: number;
  month: number; // 1-12
  startDay: number;
  endDay: number;
  clippedTop: boolean; // event continues before this month
  clippedBottom: boolean; // event continues after this month
}

export function monthSegments(event: AppEvent): MonthSegment[] {
  const segments: MonthSegment[] = [];
  let y = yearOf(event.startDate);
  let m = monthOf(event.startDate);
  const endY = yearOf(event.endDate);
  const endM = monthOf(event.endDate);

  // Guard against inverted ranges — render as a single day at the start.
  if (event.endDate < event.startDate) {
    return [
      {
        event,
        year: y,
        month: m,
        startDay: dayOf(event.startDate),
        endDay: dayOf(event.startDate),
        clippedTop: false,
        clippedBottom: false,
      },
    ];
  }

  while (y < endY || (y === endY && m <= endM)) {
    const first = y === yearOf(event.startDate) && m === monthOf(event.startDate);
    const last = y === endY && m === endM;
    segments.push({
      event,
      year: y,
      month: m,
      startDay: first ? dayOf(event.startDate) : 1,
      endDay: last ? dayOf(event.endDate) : daysInMonth(y, m),
      clippedTop: !first,
      clippedBottom: !last,
    });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return segments;
}

/**
 * Clip an event's date range to [rangeStart, rangeEnd] (inclusive).
 * Returns null when there is no overlap. Used by the month view's week rows.
 */
export interface RangeSegment {
  event: AppEvent;
  startDate: IsoDate;
  endDate: IsoDate;
  clippedStart: boolean;
  clippedEnd: boolean;
}

export function clipToRange(
  event: AppEvent,
  rangeStart: IsoDate,
  rangeEnd: IsoDate,
): RangeSegment | null {
  if (event.endDate < rangeStart || event.startDate > rangeEnd) return null;
  const startDate = event.startDate < rangeStart ? rangeStart : event.startDate;
  const endDate = event.endDate > rangeEnd ? rangeEnd : event.endDate;
  return {
    event,
    startDate,
    endDate,
    clippedStart: event.startDate < rangeStart,
    clippedEnd: event.endDate > rangeEnd,
  };
}

/** First day of a month as an IsoDate. */
export function monthStart(year: number, month: number): IsoDate {
  return fromParts(year, month, 1);
}

export function monthEnd(year: number, month: number): IsoDate {
  return fromParts(year, month, daysInMonth(year, month));
}
