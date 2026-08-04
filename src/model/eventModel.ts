import type { GEvent } from '../api/types';
import { inclusiveEndFromWire } from './allDay';
import { isoDateOfLocal, type IsoDate } from './isoDate';

/**
 * Normalized event used by every view.
 * For all-day events, startDate/endDate are inclusive calendar dates.
 * For timed events, they are the local calendar dates of start/end instants.
 */
export interface AppEvent {
  id: string;
  calendarId: string;
  title: string;
  isAllDay: boolean;
  startDate: IsoDate;
  endDate: IsoDate; // inclusive
  startDateTime?: string; // RFC3339, timed events only
  endDateTime?: string;
  recurringEventId?: string;
  htmlLink?: string;
}

/** Returns null for events we can't render (cancelled, missing times). */
export function appEventFromWire(wire: GEvent, calendarId: string): AppEvent | null {
  if (wire.status === 'cancelled') return null;

  const base = {
    id: wire.id,
    calendarId,
    title: wire.summary ?? '(no title)',
    recurringEventId: wire.recurringEventId,
    htmlLink: wire.htmlLink,
  };

  if (wire.start?.date && wire.end?.date) {
    return {
      ...base,
      isAllDay: true,
      startDate: wire.start.date,
      endDate: inclusiveEndFromWire(wire.end.date),
    };
  }

  if (wire.start?.dateTime && wire.end?.dateTime) {
    const start = new Date(wire.start.dateTime);
    // The end instant is exclusive: an event ending at exactly midnight
    // belongs to the previous day, so back it off by 1ms before taking
    // its local calendar date.
    const end = new Date(new Date(wire.end.dateTime).getTime() - 1);
    return {
      ...base,
      isAllDay: false,
      startDate: isoDateOfLocal(start),
      endDate: isoDateOfLocal(end < start ? start : end),
      startDateTime: wire.start.dateTime,
      endDateTime: wire.end.dateTime,
    };
  }

  return null;
}
