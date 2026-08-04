/**
 * The `#` marker convention: an event on the primary calendar whose title
 * starts with '#' belongs on the year-at-a-glance grid. The marker lives in
 * Google Calendar; the grid strips it for display and re-adds it on save.
 */

const HASH_PREFIX = /^#\s*/;

export function isHashTitle(title: string): boolean {
  return title.startsWith('#');
}

export function stripHash(title: string): string {
  return title.replace(HASH_PREFIX, '');
}

export function withHash(title: string): string {
  return `#${title}`;
}
