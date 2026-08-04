import type { AppEvent } from './eventModel';
import { dayOf, monthOf, yearOf, type IsoDate } from './isoDate';

/** Local Date at noon — safe for formatting (never crosses midnight in any tz). */
function localNoon(date: IsoDate): Date {
  return new Date(yearOf(date), monthOf(date) - 1, dayOf(date), 12);
}

const monthDayFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const fullDateFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

export function formatDate(date: IsoDate): string {
  return fullDateFmt.format(localNoon(date));
}

export function formatTime(dateTime: string): string {
  return timeFmt.format(new Date(dateTime));
}

/** Short label like '7:30 AM' with minutes dropped on the hour ('7 AM'). */
export function formatTimeShort(dateTime: string): string {
  const d = new Date(dateTime);
  const fmt = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    ...(d.getMinutes() !== 0 ? { minute: '2-digit' } : {}),
  });
  return fmt.format(d);
}

export function formatEventRange(event: AppEvent): string {
  if (event.isAllDay) {
    if (event.startDate === event.endDate) return formatDate(event.startDate);
    return `${monthDayFmt.format(localNoon(event.startDate))} – ${monthDayFmt.format(localNoon(event.endDate))}, ${yearOf(event.endDate)}`;
  }
  const start = event.startDateTime!;
  const end = event.endDateTime!;
  if (event.startDate === event.endDate) {
    return `${formatDate(event.startDate)} · ${formatTime(start)} – ${formatTime(end)}`;
  }
  return `${monthDayFmt.format(new Date(start))} ${formatTime(start)} – ${monthDayFmt.format(new Date(end))} ${formatTime(end)}`;
}
