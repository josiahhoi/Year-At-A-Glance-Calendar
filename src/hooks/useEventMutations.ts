import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { deleteEvent, insertAllDayEvent, moveEvent, patchAllDayEvent } from '../api/events';
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

type YearSnapshot = Array<{ calendarId: string; year: number; data: AppEvent[] | undefined }>;

async function snapshotAndCancel(
  qc: QueryClient,
  calendarId: string,
  years: number[],
): Promise<YearSnapshot> {
  await qc.cancelQueries({ queryKey: ['events', calendarId] });
  return years.map((year) => ({
    calendarId,
    year,
    data: qc.getQueryData<AppEvent[]>(yearEventsKey(calendarId, year)),
  }));
}

function restore(qc: QueryClient, snapshots: YearSnapshot) {
  for (const { calendarId, year, data } of snapshots) {
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
  /** Target calendar; omit when it may not exist yet and pass ensureCalendar. */
  calendarId?: string;
  /** Resolves (creating if needed) the target calendar id. */
  ensureCalendar?: () => Promise<string>;
}

export interface UpdateEventVars {
  event: AppEvent;
  title?: string;
  startDate?: IsoDate;
  endDate?: IsoDate;
}

export interface ChangeStatusVars {
  event: AppEvent;
  toCalendarId: string;
  newTitle: string;
  startDate?: IsoDate;
  endDate?: IsoDate;
}

export function useEventMutations() {
  const qc = useQueryClient();

  const createEvent = useMutation({
    mutationFn: async (vars: CreateEventVars) => {
      const calendarId = vars.calendarId ?? (await vars.ensureCalendar!());
      const wire = await insertAllDayEvent(calendarId, vars.title, vars.startDate, vars.endDate);
      return { wire, calendarId };
    },
    onMutate: async (vars) => {
      // Optimistic insert only when the target calendar is already known.
      if (!vars.calendarId) return { snapshots: [] as YearSnapshot, tempId: null, years: [] };
      const years = touchedYears(vars.startDate, vars.endDate);
      const snapshots = await snapshotAndCancel(qc, vars.calendarId, years);
      const tempId = `tmp-${Math.random().toString(36).slice(2)}`;
      const temp: AppEvent = {
        id: tempId,
        calendarId: vars.calendarId,
        title: vars.title,
        isAllDay: true,
        startDate: vars.startDate,
        endDate: vars.endDate,
      };
      mapYearCaches(qc, vars.calendarId, years, (events) => [...events, temp]);
      return { snapshots, tempId, years };
    },
    onSuccess: ({ wire, calendarId }, _vars, ctx) => {
      const real = appEventFromWire(wire, calendarId);
      if (real && ctx.tempId) {
        mapYearCaches(qc, calendarId, ctx.years, (events) =>
          events.map((e) => (e.id === ctx.tempId ? real : e)),
        );
      }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) restore(qc, ctx.snapshots);
      showToast("Couldn't create the event — reverted.", 'error');
    },
    onSettled: (result) => {
      if (result) qc.invalidateQueries({ queryKey: ['events', result.calendarId] });
      else qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['calendars'] });
    },
  });

  const updateEvent = useMutation({
    mutationFn: (vars: UpdateEventVars) =>
      patchAllDayEvent(vars.event.calendarId, vars.event.id, {
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
      const snapshots = await snapshotAndCancel(qc, vars.event.calendarId, years);
      mapYearCaches(qc, vars.event.calendarId, years, (events) =>
        events.map((e) => (e.id === vars.event.id ? next : e)),
      );
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) restore(qc, ctx.snapshots);
      showToast("Couldn't save the change — reverted.", 'error');
    },
    onSettled: (_res, _err, vars) =>
      qc.invalidateQueries({ queryKey: ['events', vars.event.calendarId] }),
  });

  const removeEvent = useMutation({
    mutationFn: (event: AppEvent) => deleteEvent(event.calendarId, event.id),
    onMutate: async (event) => {
      const years = touchedYears(event.startDate, event.endDate);
      const snapshots = await snapshotAndCancel(qc, event.calendarId, years);
      mapYearCaches(qc, event.calendarId, years, (events) =>
        events.filter((e) => e.id !== event.id),
      );
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) restore(qc, ctx.snapshots);
      showToast("Couldn't delete the event — restored.", 'error');
    },
    onSettled: (_res, _err, event) =>
      qc.invalidateQueries({ queryKey: ['events', event.calendarId] }),
  });

  /** Moves an event between calendars (tentative ⇄ confirmed) and retitles it. */
  const changeStatus = useMutation({
    mutationFn: async (vars: ChangeStatusVars) => {
      await moveEvent(vars.event.calendarId, vars.event.id, vars.toCalendarId);
      return patchAllDayEvent(vars.toCalendarId, vars.event.id, {
        title: vars.newTitle,
        startDate: vars.startDate,
        endDate: vars.endDate,
      });
    },
    onMutate: async (vars) => {
      const next: AppEvent = {
        ...vars.event,
        calendarId: vars.toCalendarId,
        title: vars.newTitle,
        startDate: vars.startDate ?? vars.event.startDate,
        endDate: vars.endDate ?? vars.event.endDate,
      };
      const years = touchedYears(
        vars.event.startDate,
        vars.event.endDate,
        next.startDate,
        next.endDate,
      );
      const snapshots = [
        ...(await snapshotAndCancel(qc, vars.event.calendarId, years)),
        ...(await snapshotAndCancel(qc, vars.toCalendarId, years)),
      ];
      mapYearCaches(qc, vars.event.calendarId, years, (events) =>
        events.filter((e) => e.id !== vars.event.id),
      );
      mapYearCaches(qc, vars.toCalendarId, years, (events) => [...events, next]);
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) restore(qc, ctx.snapshots);
      showToast("Couldn't change the event's status — reverted.", 'error');
    },
    onSettled: (_res, _err, vars) => {
      qc.invalidateQueries({ queryKey: ['events', vars.event.calendarId] });
      qc.invalidateQueries({ queryKey: ['events', vars.toCalendarId] });
    },
  });

  return { createEvent, updateEvent, removeEvent, changeStatus };
}
