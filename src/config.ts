export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

export const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar';

export const GCAL_API_BASE = 'https://www.googleapis.com/calendar/v3';

/** Auto-created hidden calendar that holds tentative year-grid items. */
export const TENTATIVE_CALENDAR_NAME = 'Tentative (YAAG)';
