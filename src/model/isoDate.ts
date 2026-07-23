/**
 * Calendar-date arithmetic on 'YYYY-MM-DD' strings.
 *
 * All-day events are calendar dates, not instants. `new Date('YYYY-MM-DD')`
 * parses as UTC midnight, which is the *previous day* in negative-offset
 * timezones — so Date objects never escape this module. ISO date strings
 * compare correctly with plain string comparison.
 */

export type IsoDate = string; // 'YYYY-MM-DD'

export function fromParts(year: number, month: number, day: number): IsoDate {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function yearOf(date: IsoDate): number {
  return Number(date.slice(0, 4));
}

/** 1-12 */
export function monthOf(date: IsoDate): number {
  return Number(date.slice(5, 7));
}

/** 1-31 */
export function dayOf(date: IsoDate): number {
  return Number(date.slice(8, 10));
}

function toUtcMs(date: IsoDate): number {
  return Date.UTC(yearOf(date), monthOf(date) - 1, dayOf(date));
}

function fromUtcMs(ms: number): IsoDate {
  const d = new Date(ms);
  return fromParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtcMs(toUtcMs(date) + days * 86400000);
}

/** a - b in whole days */
export function diffDays(a: IsoDate, b: IsoDate): number {
  return Math.round((toUtcMs(a) - toUtcMs(b)) / 86400000);
}

export function compare(a: IsoDate, b: IsoDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function minDate(a: IsoDate, b: IsoDate): IsoDate {
  return a < b ? a : b;
}

export function maxDate(a: IsoDate, b: IsoDate): IsoDate {
  return a > b ? a : b;
}

/** month is 1-12 */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 0 = Sunday … 6 = Saturday */
export function dayOfWeek(date: IsoDate): number {
  return new Date(toUtcMs(date)).getUTCDay();
}

/** Today as a calendar date in the user's local timezone. */
export function today(): IsoDate {
  const now = new Date();
  return fromParts(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Local calendar date of a real timestamp (for timed events). */
export function isoDateOfLocal(d: Date): IsoDate {
  return fromParts(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const m = monthOf(s);
  const d = dayOf(s);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(yearOf(s), m);
}
