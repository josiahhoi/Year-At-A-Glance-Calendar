import { gfetch } from './gcalClient';
import type { GCalendarList, GCalendarListEntry } from './types';

export interface CalendarInfo {
  id: string;
  summary: string;
  bg: string;
  fg: string;
  accessRole: string;
  primary: boolean;
  writable: boolean;
}

export async function listCalendars(): Promise<CalendarInfo[]> {
  const calendars: CalendarInfo[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({ maxResults: '250' });
    if (pageToken) params.set('pageToken', pageToken);
    const page = await gfetch<GCalendarList>(`/users/me/calendarList?${params}`);
    for (const item of page.items ?? []) {
      calendars.push({
        id: item.id,
        summary: item.summaryOverride ?? item.summary,
        bg: item.backgroundColor ?? '#4285f4',
        fg: item.foregroundColor ?? '#ffffff',
        accessRole: item.accessRole,
        primary: !!item.primary,
        writable: item.accessRole === 'owner' || item.accessRole === 'writer',
      });
    }
    pageToken = page.nextPageToken;
  } while (pageToken);

  // Primary first, then alphabetical — stable, familiar ordering.
  return calendars.sort(
    (a, b) => Number(b.primary) - Number(a.primary) || a.summary.localeCompare(b.summary),
  );
}

export async function createCalendar(summary: string): Promise<{ id: string }> {
  return gfetch<{ id: string }>('/calendars', {
    method: 'POST',
    body: JSON.stringify({ summary }),
  });
}

/**
 * Unchecks the calendar in Google Calendar's own UI so it never clutters
 * the user's normal views there. Cosmetic — failures are swallowed.
 */
export async function hideCalendarInGoogleUi(calendarId: string): Promise<void> {
  try {
    await gfetch<GCalendarListEntry>(`/users/me/calendarList/${encodeURIComponent(calendarId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ selected: false }),
    });
  } catch {
    // The calendar still works; it just stays visible in Google's UI.
  }
}
