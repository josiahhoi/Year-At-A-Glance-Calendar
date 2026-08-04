import { useEffect, useMemo, useRef, useState } from 'react';
import type { CalendarInfo } from '../../api/calendarList';
import { useEventMutations } from '../../hooks/useEventMutations';
import { useYearEvents } from '../../hooks/useYearEvents';
import type { AppEvent } from '../../model/eventModel';
import { isHashTitle, stripHash, withHash } from '../../model/hashTag';
import { layoutIntervals, type IntervalItem } from '../../model/lanes';
import { monthOf, today, yearOf, type IsoDate } from '../../model/isoDate';
import { monthSegments } from '../../model/segments';
import type { Route } from '../../route';
import { EventPopover } from './EventPopover';
import { MonthColumn, segKey, type PlacedSegment } from './MonthColumn';
import type { AnchorRect } from './useGridDrag';
import styles from './yearView.module.css';

interface YearViewProps {
  year: number;
  primaryCalendar: CalendarInfo | null;
  onNavigate: (route: Route) => void;
  onOpenSettings: () => void;
}

type PopoverState =
  | { kind: 'create'; startDate: IsoDate; endDate: IsoDate; anchor: AnchorRect }
  | { kind: 'edit'; eventId: string; anchor: AnchorRect };

export function YearView({ year, primaryCalendar, onNavigate, onOpenSettings }: YearViewProps) {
  const { data, isLoading, error, refetch } = useYearEvents(primaryCalendar?.id ?? null, year);
  const mutations = useEventMutations(primaryCalendar?.id ?? '');
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const todayDate = today();

  // The year grid shows only #-marked events from the primary calendar.
  const events = useMemo(() => (data ?? []).filter((e) => isHashTitle(e.title)), [data]);

  // Lay out each month's segments into lanes.
  const placedByMonth = useMemo(() => {
    const byMonth = new Map<number, PlacedSegment[]>();
    for (let m = 1; m <= 12; m++) byMonth.set(m, []);

    const segsByMonth = new Map<number, ReturnType<typeof monthSegments>>();
    for (const event of events) {
      for (const seg of monthSegments(event)) {
        if (seg.year !== year) continue;
        if (!segsByMonth.has(seg.month)) segsByMonth.set(seg.month, []);
        segsByMonth.get(seg.month)!.push(seg);
      }
    }

    for (const [month, segs] of segsByMonth) {
      const items: IntervalItem[] = segs.map((seg) => ({
        key: segKey(seg),
        start: seg.startDay,
        end: seg.endDay + 1,
      }));
      const placements = layoutIntervals(items);
      byMonth.set(
        month,
        segs.map((seg) => {
          const p = placements.get(segKey(seg))!;
          return { seg, lane: p.lane, cols: p.cols };
        }),
      );
    }
    return byMonth;
  }, [events, year]);

  const eventById = useMemo(() => {
    const map = new Map<string, AppEvent>();
    for (const e of events) map.set(e.id, e);
    return map;
  }, [events]);

  // Close an edit popover whose event vanished (deleted in another tab).
  useEffect(() => {
    if (popover?.kind === 'edit' && !eventById.has(popover.eventId)) setPopover(null);
  }, [popover, eventById]);

  const scrollToCurrentMonth = () => {
    gridRef.current
      ?.querySelector(`[data-month="${monthOf(todayDate)}"]`)
      ?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
  };

  useEffect(() => {
    if (year === yearOf(todayDate)) {
      gridRef.current
        ?.querySelector(`[data-month="${monthOf(todayDate)}"]`)
        ?.scrollIntoView({ inline: 'center', block: 'nearest' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  if (!primaryCalendar) {
    return (
      <div className={styles.empty}>
        <p>Couldn't find your primary Google Calendar.</p>
        <button className="btn" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  const editingEvent = popover?.kind === 'edit' ? eventById.get(popover.eventId) : undefined;
  const editingReadOnly = editingEvent
    ? editingEvent.recurringEventId
      ? ('recurring' as const)
      : !editingEvent.isAllDay
        ? ('timed' as const)
        : undefined
    : undefined;

  return (
    <div className={styles.view}>
      <div className={styles.toolbar}>
        <div className={styles.yearNav}>
          <button
            className="btn btn-ghost"
            aria-label="Previous year"
            onClick={() => onNavigate({ view: 'year', year: year - 1 })}
          >
            ◀
          </button>
          <span className={styles.yearLabel}>{year}</span>
          <button
            className="btn btn-ghost"
            aria-label="Next year"
            onClick={() => onNavigate({ view: 'year', year: year + 1 })}
          >
            ▶
          </button>
        </div>
        <button
          className="btn"
          onClick={() => {
            if (year !== yearOf(todayDate)) onNavigate({ view: 'year', year: yearOf(todayDate) });
            else scrollToCurrentMonth();
          }}
        >
          Today
        </button>
        <button className={styles.calChip} onClick={onOpenSettings} title="Events starting with # on this calendar appear here">
          <span className={styles.calDot} style={{ background: primaryCalendar.bg }} />
          # · {primaryCalendar.summary}
        </button>
        {isLoading && <span className={styles.loading}>Loading…</span>}
        {error != null && (
          <span className={styles.loadError}>
            Couldn't load events.{' '}
            <button className="btn" onClick={() => refetch()}>
              Retry
            </button>
          </span>
        )}
        {!isLoading && !error && events.length === 0 && (
          <span className={styles.hint}>
            Start an event's name with <b>#</b> in Google Calendar to pin it here — or click any
            day to add one.
          </span>
        )}
      </div>

      <div className={styles.gridScroll} ref={gridRef}>
        <div className={styles.grid}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
            <MonthColumn
              key={month}
              year={year}
              month={month}
              placed={placedByMonth.get(month) ?? []}
              color={primaryCalendar.bg}
              todayDate={todayDate}
              callbacks={{
                onClickDay: (day, anchor) => {
                  const date = `${year}-${pad2(month)}-${pad2(day)}`;
                  setPopover({ kind: 'create', startDate: date, endDate: date, anchor });
                },
                onCreateRange: (startDay, endDay, anchor) => {
                  setPopover({
                    kind: 'create',
                    startDate: `${year}-${pad2(month)}-${pad2(startDay)}`,
                    endDate: `${year}-${pad2(month)}-${pad2(endDay)}`,
                    anchor,
                  });
                },
                onClickSegment: (seg, anchor) => {
                  setPopover({ kind: 'edit', eventId: seg.event.id, anchor });
                },
                onChangeEventDates: (event, startDate, endDate) => {
                  mutations.updateEvent.mutate({ event, startDate, endDate });
                },
              }}
            />
          ))}
        </div>
      </div>

      {popover?.kind === 'create' && (
        <EventPopover
          mode="create"
          anchor={popover.anchor}
          initialTitle=""
          initialStart={popover.startDate}
          initialEnd={popover.endDate}
          onClose={() => setPopover(null)}
          onSave={(title, startDate, endDate) => {
            // The marker lives in Google Calendar; the grid adds it for you.
            mutations.createEvent.mutate({ title: withHash(title), startDate, endDate });
            setPopover(null);
          }}
        />
      )}

      {popover?.kind === 'edit' && editingEvent && (
        <EventPopover
          mode="edit"
          anchor={popover.anchor}
          initialTitle={stripHash(editingEvent.title)}
          initialStart={editingEvent.startDate}
          initialEnd={editingEvent.endDate}
          readOnlyReason={editingReadOnly}
          htmlLink={editingEvent.htmlLink}
          onClose={() => setPopover(null)}
          onSave={(title, startDate, endDate) => {
            mutations.updateEvent.mutate({
              event: editingEvent,
              title: title !== stripHash(editingEvent.title) ? withHash(title) : undefined,
              startDate,
              endDate,
            });
            setPopover(null);
          }}
          onDelete={() => {
            mutations.removeEvent.mutate(editingEvent);
            setPopover(null);
          }}
        />
      )}
    </div>
  );
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
