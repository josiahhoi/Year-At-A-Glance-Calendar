/**
 * Hash-based routing: #/year/2026, #/month/2026-07, #/week/2026-07-20.
 * Hash URLs survive reloads on GitHub Pages without any 404 tricks.
 */
import { useSyncExternalStore } from 'react';
import { isValidIsoDate, monthOf, today, yearOf, type IsoDate } from './model/isoDate';
import { getSettings } from './hooks/useSettings';

export type Route =
  | { view: 'year'; year: number }
  | { view: 'month'; year: number; month: number }
  | { view: 'week'; date: IsoDate };

export function formatHash(route: Route): string {
  switch (route.view) {
    case 'year':
      return `#/year/${route.year}`;
    case 'month':
      return `#/month/${route.year}-${String(route.month).padStart(2, '0')}`;
    case 'week':
      return `#/week/${route.date}`;
  }
}

export function parseHash(hash: string): Route | null {
  const yearMatch = /^#\/year\/(\d{4})$/.exec(hash);
  if (yearMatch) return { view: 'year', year: Number(yearMatch[1]) };

  const monthMatch = /^#\/month\/(\d{4})-(\d{2})$/.exec(hash);
  if (monthMatch) {
    const month = Number(monthMatch[2]);
    if (month >= 1 && month <= 12) {
      return { view: 'month', year: Number(monthMatch[1]), month };
    }
  }

  const weekMatch = /^#\/week\/(\d{4}-\d{2}-\d{2})$/.exec(hash);
  if (weekMatch && isValidIsoDate(weekMatch[1])) {
    return { view: 'week', date: weekMatch[1] };
  }

  return null;
}

export function defaultRoute(): Route {
  const settings = getSettings();
  const now = today();
  switch (settings.defaultView) {
    case 'month':
      return { view: 'month', year: yearOf(now), month: monthOf(now) };
    case 'week':
      return { view: 'week', date: now };
    default:
      return { view: 'year', year: settings.lastYear ?? yearOf(now) };
  }
}

function subscribe(fn: () => void): () => void {
  window.addEventListener('hashchange', fn);
  return () => window.removeEventListener('hashchange', fn);
}

function getSnapshot(): string {
  return window.location.hash;
}

export function useRoute(): [Route, (route: Route) => void] {
  const hash = useSyncExternalStore(subscribe, getSnapshot);
  const route = parseHash(hash) ?? defaultRoute();
  const navigate = (next: Route) => {
    window.location.hash = formatHash(next);
  };
  return [route, navigate];
}
