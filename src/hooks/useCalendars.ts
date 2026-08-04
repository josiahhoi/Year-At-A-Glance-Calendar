import { useQuery } from '@tanstack/react-query';
import { listCalendars, type CalendarInfo } from '../api/calendarList';

export function useCalendars() {
  return useQuery<CalendarInfo[]>({
    queryKey: ['calendars'],
    queryFn: listCalendars,
    staleTime: 5 * 60 * 1000,
  });
}
