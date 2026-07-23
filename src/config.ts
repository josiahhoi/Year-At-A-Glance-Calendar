export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

export const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar';

export const GCAL_API_BASE = 'https://www.googleapis.com/calendar/v3';

/** Calendar summary the app looks for on first run to pick the glance calendar. */
export const DEFAULT_GLANCE_CALENDAR_NAME = 'Sheet Events';
