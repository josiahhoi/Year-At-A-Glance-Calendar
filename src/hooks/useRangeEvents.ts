import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import { listEventsRange } from '../api/events';
import { appEventFromWire, type AppEvent } from '../model/eventModel';
import type { IsoDate } from '../model/isoDate';
import { addDays } from '../model/isoDate';

/**
 * Events from several calendars overlapping [rangeStart, rangeEnd] (inclusive
 * calendar dates). One query per calendar so toggling a calendar on/off hits
 * the cache instead of refetching everything.
 *
 * The instant window is intentionally generous (UTC day boundaries ± nothing
 * fancy): the API selects by overlap and views re-clip precisely by date.
 */
export function useRangeEvents(calendarIds: string[], rangeStart: IsoDate, rangeEnd: IsoDate) {
  const timeMin = `${rangeStart}T00:00:00Z`;
  const timeMax = `${addDays(rangeEnd, 2)}T00:00:00Z`;

  const results = useQueries({
    queries: calendarIds.map((calId) => ({
      queryKey: ['events', calId, 'range', rangeStart, rangeEnd] as const,
      staleTime: 60 * 1000,
      queryFn: async () => {
        const wire = await listEventsRange(calId, timeMin, timeMax);
        return wire.map((w) => appEventFromWire(w, calId)).filter((e): e is AppEvent => e !== null);
      },
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const error = results.find((r) => r.error)?.error ?? null;

  const events = useMemo(
    () => results.flatMap((r) => r.data ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...results.map((r) => r.data)],
  );

  return { events, isLoading, error };
}
