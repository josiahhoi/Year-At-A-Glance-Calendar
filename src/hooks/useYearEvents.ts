import { useQuery } from '@tanstack/react-query';
import { listEventsRange } from '../api/events';
import { appEventFromWire, type AppEvent } from '../model/eventModel';

export function yearEventsKey(calendarId: string, year: number) {
  return ['events', calendarId, 'year', year] as const;
}

/**
 * All events of the glance calendar overlapping the given year.
 * timeMin/timeMax select by overlap, so events spilling across New Year
 * are returned for both adjacent years.
 */
export function useYearEvents(calendarId: string | null, year: number) {
  return useQuery<AppEvent[]>({
    queryKey: yearEventsKey(calendarId ?? 'none', year),
    enabled: !!calendarId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const wire = await listEventsRange(
        calendarId!,
        `${year}-01-01T00:00:00Z`,
        `${year + 1}-01-01T00:00:00Z`,
      );
      return wire
        .map((w) => appEventFromWire(w, calendarId!))
        .filter((e): e is AppEvent => e !== null);
    },
  });
}
