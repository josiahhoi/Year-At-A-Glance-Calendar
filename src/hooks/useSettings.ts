import { useSyncExternalStore } from 'react';

export interface Settings {
  hiddenCalendarIds: string[];
  defaultView: 'year' | 'month' | 'week';
  lastYear: number | null;
  tentativeCalendarId: string | null;
  /** Extra calendars whose #-events also show on the year grid (view-only). */
  glanceSourceIds: string[];
}

const STORAGE_KEY = 'yag.settings.v1';

const DEFAULTS: Settings = {
  hiddenCalendarIds: [],
  defaultView: 'year',
  lastYear: null,
  tentativeCalendarId: null,
  glanceSourceIds: [],
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      hiddenCalendarIds: Array.isArray(parsed.hiddenCalendarIds)
        ? parsed.hiddenCalendarIds.filter((x: unknown) => typeof x === 'string')
        : [],
      defaultView: ['year', 'month', 'week'].includes(parsed.defaultView)
        ? parsed.defaultView
        : 'year',
      lastYear: typeof parsed.lastYear === 'number' ? parsed.lastYear : null,
      tentativeCalendarId:
        typeof parsed.tentativeCalendarId === 'string' ? parsed.tentativeCalendarId : null,
      glanceSourceIds: Array.isArray(parsed.glanceSourceIds)
        ? parsed.glanceSourceIds.filter((x: unknown) => typeof x === 'string')
        : [],
    };
  } catch {
    return DEFAULTS;
  }
}

let current: Settings = load();
const listeners = new Set<() => void>();

export function getSettings(): Settings {
  return current;
}

export function updateSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // storage full/unavailable — keep going with in-memory settings
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings);
}
