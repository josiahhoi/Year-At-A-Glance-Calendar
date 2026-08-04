import { wireRangeFromInclusive } from '../model/allDay';
import type { IsoDate } from '../model/isoDate';
import { GcalError, gfetch } from './gcalClient';
import type { GEvent, GEventList } from './types';

const EVENT_FIELDS = 'items(id,status,summary,start,end,recurringEventId,htmlLink),nextPageToken';

/**
 * All events overlapping [timeMinIso, timeMaxIso) with recurrences expanded.
 * timeMin/timeMax are RFC3339 instants (e.g. '2026-01-01T00:00:00Z').
 */
export async function listEventsRange(
  calendarId: string,
  timeMinIso: string,
  timeMaxIso: string,
): Promise<GEvent[]> {
  const events: GEvent[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      timeMin: timeMinIso,
      timeMax: timeMaxIso,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '2500',
      fields: EVENT_FIELDS,
    });
    if (pageToken) params.set('pageToken', pageToken);
    const page = await gfetch<GEventList>(
      `/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    );
    for (const item of page.items ?? []) {
      if (item.status !== 'cancelled') events.push(item);
    }
    pageToken = page.nextPageToken;
  } while (pageToken);

  return events;
}

export async function insertAllDayEvent(
  calendarId: string,
  title: string,
  startDate: IsoDate,
  endDate: IsoDate,
): Promise<GEvent> {
  return gfetch<GEvent>(`/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    body: JSON.stringify({ summary: title, ...wireRangeFromInclusive(startDate, endDate) }),
  });
}

export interface EventPatch {
  title?: string;
  startDate?: IsoDate;
  endDate?: IsoDate; // inclusive; must be provided together with startDate
}

export async function patchAllDayEvent(
  calendarId: string,
  eventId: string,
  patch: EventPatch,
): Promise<GEvent> {
  const body: Record<string, unknown> = {};
  if (patch.title !== undefined) body.summary = patch.title;
  if (patch.startDate !== undefined && patch.endDate !== undefined) {
    Object.assign(body, wireRangeFromInclusive(patch.startDate, patch.endDate));
  }
  return gfetch<GEvent>(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
}

export async function deleteEvent(calendarId: string, eventId: string): Promise<void> {
  try {
    await gfetch<null>(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: 'DELETE' },
    );
  } catch (err) {
    // Already gone — that's the outcome we wanted.
    if (err instanceof GcalError && (err.status === 410 || err.status === 404)) return;
    throw err;
  }
}
