import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { deleteEvent, insertAllDayEvent, patchAllDayEvent } from '../api/events';
import { showToast } from '../components/Toast';
import { appEventFromWire, type AppEvent } from '../model/eventModel';
import { yearOf, type IsoDate } from '../model/isoDate';
import { yearEventsKey } from './useYearEvents';

/** Every year cache a date range touches (usually one, two across New Year). */
function touchedYears(...dates: IsoDate[]): number[] {
  const years = dates.map(yearOf);
  const result: number[] = [];
  for (let y = Math.min(...years); y <= Math.max(...years); y++) result.push(y);
  return result;
}

type YearSnapshot = Array<{ year: number; data: AppEvent[] | undefined }>;

async function snapshotAndCancel(
  qc: QueryClient,
  calendarId: string,
  years: number[],
): Promise<YearSnapshot> {
  await qc.cancelQueries({ queryKey: ['events', calendarId] });
  return years.map((year) => ({
    year,
    data: qc.getQueryData<AppEvent[]>(yearEventsKey(calendarId, year)),
  }));
}

function restore(qc: QueryClient, calendarId: string, snapshots: YearSnapshot) {
  for (const { year, data } of snapshots) {
    qc.setQueryData(yearEventsKey(calendarId, year), data);
  }
}

function mapYearCaches(
  qc: QueryClient,
  calendarId: string,
  years: number[],
  fn: (events: AppEvent[]) => AppEvent[],
) {
  for (const year of years) {
    const key = yearEventsKey(calendarId, year);
    // Only touch caches that exist — creating empty ones would mask loading states.
    if (qc.getQueryData<AppEvent[]>(key) !== undefined) {
      qc.setQueryData<AppEvent[]>(key, (old) => fn(old ?? []));
    }
  }
}

export interface CreateEventVars {
  title: string;
  startDate: IsoDate;
  endDate: IsoDate;
}

export interface UpdateEventVars {
  event: AppEvent;
  title?: string;
  startDate?: IsoDate;
  endDate?: IsoDate;
}

export function useEventMutations(calendarId: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['events', calendarId] });

  const createEvent = useMutation({
    mutationFn: (vars: CreateEventVars) =>
      insertAllDayEvent(calendarId, vars.title, vars.startDate, vars.endDate),
    onMutate: async (vars) => {
      const years = touchedYears(vars.startDate, vars.endDate);
      const snapshots = await snapshotAndCancel(qc, calendarId, years);
      const tempId = `tmp-${Math.random().toString(36).slice(2)}`;
      const temp: AppEvent = {
        id: tempId,
        calendarId,
        title: vars.title,
        isAllDay: true,
        startDate: vars.startDate,
        endDate: vars.endDate,
      };
      mapYearCaches(qc, calendarId, years, (events) => [...events, temp]);
      return { snapshots, tempId, years };
    },
    onSuccess: (wire, _vars, ctx) => {
      const real = appEventFromWire(wire, calendarId);
      if (real) {
        mapYearCaches(qc, calendarId, ctx.years, (events) =>
          events.map((e) => (e.id === ctx.tempId ? real : e)),
        );
      }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) restore(qc, calendarId, ctx.snapshots);
      showToast("Couldn't create the event — reverted.", 'error');
    },
    onSettled: invalidate,
  });

  const updateEvent = useMutation({
    mutationFn: (vars: UpdateEventVars) =>
      patchAllDayEvent(calendarId, vars.event.id, {
        title: vars.title,
        startDate: vars.startDate,
        endDate: vars.endDate,
      }),
    onMutate: async (vars) => {
      const next: AppEvent = {
        ...vars.event,
        title: vars.title ?? vars.event.title,
        startDate: vars.startDate ?? vars.event.startDate,
        endDate: vars.endDate ?? vars.event.endDate,
      };
      const years = touchedYears(
        vars.event.startDate,
        vars.event.endDate,
        next.startDate,
        next.endDate,
      );
      const snapshots = await snapshotAndCancel(qc, calendarId, years);
      mapYearCaches(qc, calendarId, years, (events) =>
        events.map((e) => (e.id === vars.event.id ? next : e)),
      );
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) restore(qc, calendarId, ctx.snapshots);
      showToast("Couldn't save the change — reverted.", 'error');
    },
    onSettled: invalidate,
  });

  const removeEvent = useMutation({
    mutationFn: (event: AppEvent) => deleteEvent(calendarId, event.id),
    onMutate: async (event) => {
      const years = touchedYears(event.startDate, event.endDate);
      const snapshots = await snapshotAndCancel(qc, calendarId, years);
      mapYearCaches(qc, calendarId, years, (events) => events.filter((e) => e.id !== event.id));
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) restore(qc, calendarId, ctx.snapshots);
      showToast("Couldn't delete the event — restored.", 'error');
    },
    onSettled: invalidate,
  });

  return { createEvent, updateEvent, removeEvent };
}
