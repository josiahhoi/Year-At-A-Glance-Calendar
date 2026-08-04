import { addDays, dayOfWeek, daysInMonth, fromParts, type IsoDate } from '../../model/isoDate';

/** Sunday-start week rows covering the whole month (5 or 6 rows of 7). */
export function monthGridWeeks(year: number, month: number): IsoDate[][] {
  const first = fromParts(year, month, 1);
  const gridStart = addDays(first, -dayOfWeek(first));
  const rows = Math.ceil((dayOfWeek(first) + daysInMonth(year, month)) / 7);
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: 7 }, (_, c) => addDays(gridStart, r * 7 + c)),
  );
}

/** The Sunday-start week containing the given date. */
export function weekDates(date: IsoDate): IsoDate[] {
  const start = addDays(date, -dayOfWeek(date));
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
