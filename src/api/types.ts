/** Raw Google Calendar API v3 wire shapes (only the fields we request). */

export interface GEventTime {
  date?: string; // 'YYYY-MM-DD' for all-day (end is exclusive)
  dateTime?: string; // RFC3339 with offset for timed events
  timeZone?: string;
}

export interface GEvent {
  id: string;
  status?: string;
  summary?: string;
  start?: GEventTime;
  end?: GEventTime;
  recurringEventId?: string;
  htmlLink?: string;
}

export interface GEventList {
  items?: GEvent[];
  nextPageToken?: string;
}

export interface GCalendarListEntry {
  id: string;
  summary: string;
  summaryOverride?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
  primary?: boolean;
  selected?: boolean;
}

export interface GCalendarList {
  items?: GCalendarListEntry[];
  nextPageToken?: string;
}
