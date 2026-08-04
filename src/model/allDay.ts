/**
 * The single conversion chokepoint between the Google Calendar wire format
 * and the app's event model for all-day dates.
 *
 * On the wire, an all-day event's `end.date` is EXCLUSIVE (a one-day event
 * on Jul 4 has start.date 07-04 and end.date 07-05). The app model uses an
 * INCLUSIVE endDate everywhere so UI code never has to think about it.
 */
import { addDays, type IsoDate } from './isoDate';

export interface WireAllDayRange {
  start: { date: IsoDate };
  end: { date: IsoDate };
}

export function inclusiveEndFromWire(exclusiveEnd: IsoDate): IsoDate {
  return addDays(exclusiveEnd, -1);
}

export function wireRangeFromInclusive(startDate: IsoDate, endDate: IsoDate): WireAllDayRange {
  return {
    start: { date: startDate },
    end: { date: addDays(endDate, 1) },
  };
}
