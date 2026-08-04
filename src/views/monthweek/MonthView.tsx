import { useMemo, useState } from 'react';
import type { CalendarInfo } from '../../api/calendarList';
import { CalendarTogglePanel } from '../../components/CalendarTogglePanel';
import { Popover } from '../../components/Popover';
import { useRangeEvents } from '../../hooks/useRangeEvents';
import { useSettings } from '../../hooks/useSettings';
import { contrastText } from '../../model/color';
import type { AppEvent } from '../../model/eventModel';
import { formatDate, formatTimeShort } from '../../model/format';
import { layoutIntervals, type IntervalItem } from '../../model/lanes';
import { dayOf, diffDays, monthOf, today, yearOf, type IsoDate } from '../../model/isoDate';
import { clipToRange } from '../../model/segments';
import type { Route } from '../../route';
import type { AnchorRect } from '../year/useGridDrag';
import { EventDetailPopover } from './EventDetailPopover';
import { monthGridWeeks } from './gridDates';
import styles from './monthWeek.module.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const HEADER_H = 26;
const LANE_H = 22;
const MORE_H = 18;
const MAX_LANES = 4;

interface MonthViewProps {
  year: number;
  month: number;
  calendars: CalendarInfo[];
  onNavigate: (route: Route) => void;
}

type PopState =
  | { type: 'detail'; event: AppEvent; anchor: AnchorRect }
  | { type: 'day'; date: IsoDate; anchor: AnchorRect };

export function MonthView({ year, month, calendars, onNavigate }: MonthViewProps) {
  const settings = useSettings();
  const [pop, setPop] = useState<PopState | null>(null);
  const todayDate = today();

  const weeks = useMemo(() => monthGridWeeks(year, month), [year, month]);
  const gridStart = weeks[0][0];
  const gridEnd = weeks[weeks.length - 1][6];

  const hidden = new Set(settings.hiddenCalendarIds);
  const visibleIds = calendars.filter((c) => !hidden.has(c.id)).map((c) => c.id);
  const { events, isLoading } = useRangeEvents(visibleIds, gridStart, gridEnd);
  const calById = useMemo(() => new Map(calendars.map((c) => [c.id, c])), [calendars]);

  const prev = () =>
    onNavigate(
      month === 1
        ? { view: 'month', year: year - 1, month: 12 }
        : { view: 'month', year, month: month - 1 },
    );
  const next = () =>
    onNavigate(
      month === 12
        ? { view: 'month', year: year + 1, month: 1 }
        : { view: 'month', year, month: month + 1 },
    );

  const eventsForDay = (date: IsoDate) =>
    events
      .filter((e) => e.startDate <= date && date <= e.endDate)
      .sort(
        (a, b) =>
          Number(!isBar(a)) - Number(!isBar(b)) ||
          (a.startDateTime ?? a.startDate).localeCompare(b.startDateTime ?? b.startDate),
      );

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <CalendarTogglePanel calendars={calendars} />
      </aside>

      <section className={styles.content}>
        <div className={styles.toolbar}>
          <button className="btn btn-ghost" aria-label="Previous month" onClick={prev}>
            ◀
          </button>
          <button className="btn btn-ghost" aria-label="Next month" onClick={next}>
            ▶
          </button>
          <span className={styles.periodLabel}>
            {MONTH_LABELS[month - 1]} {year}
          </span>
          <button
            className="btn"
            onClick={() =>
              onNavigate({ view: 'month', year: yearOf(todayDate), month: monthOf(todayDate) })
            }
          >
            Today
          </button>
          {isLoading && <span className={styles.loading}>Loading…</span>}
        </div>

        <div className={styles.monthScroll}>
          <div className={styles.monthGrid}>
            <div className={styles.weekdayHeader}>
              {WEEKDAYS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>

            {weeks.map((week) => (
              <WeekRow
                key={week[0]}
                week={week}
                month={month}
                todayDate={todayDate}
                events={events}
                calById={calById}
                onChipClick={(event, anchor) => setPop({ type: 'detail', event, anchor })}
                onMoreClick={(date, anchor) => setPop({ type: 'day', date, anchor })}
                onDayClick={(date) => onNavigate({ view: 'week', date })}
              />
            ))}
          </div>
        </div>
      </section>

      {pop?.type === 'detail' && (
        <EventDetailPopover
          event={pop.event}
          calendar={calById.get(pop.event.calendarId)}
          anchor={pop.anchor}
          onClose={() => setPop(null)}
        />
      )}

      {pop?.type === 'day' && (
        <EventDetailListPopover
          date={pop.date}
          events={eventsForDay(pop.date)}
          calById={calById}
          anchor={pop.anchor}
          onPick={(event, anchor) => setPop({ type: 'detail', event, anchor })}
          onClose={() => setPop(null)}
        />
      )}
    </div>
  );
}

function isBar(e: AppEvent): boolean {
  return e.isAllDay || e.startDate !== e.endDate;
}

interface WeekRowProps {
  week: IsoDate[];
  month: number;
  todayDate: IsoDate;
  events: AppEvent[];
  calById: Map<string, CalendarInfo>;
  onChipClick: (event: AppEvent, anchor: AnchorRect) => void;
  onMoreClick: (date: IsoDate, anchor: AnchorRect) => void;
  onDayClick: (date: IsoDate) => void;
}

function WeekRow({
  week,
  month,
  todayDate,
  events,
  calById,
  onChipClick,
  onMoreClick,
  onDayClick,
}: WeekRowProps) {
  const { chips, hiddenPerDay, visibleLanes } = useMemo(() => {
    interface Chip {
      event: AppEvent;
      startCol: number;
      span: number;
      lane: number;
      bar: boolean;
      clippedStart: boolean;
      clippedEnd: boolean;
    }

    const raw: Array<Omit<Chip, 'lane'> & { key: string }> = [];
    for (const event of events) {
      const seg = clipToRange(event, week[0], week[6]);
      if (!seg) continue;
      const startCol = diffDays(seg.startDate, week[0]);
      const span = diffDays(seg.endDate, seg.startDate) + 1;
      const bar = isBar(event);
      // Key prefix orders bars before timed chips; timed sort by start time.
      const timePrefix = bar
        ? '0'
        : `1-${new Date(event.startDateTime!).getHours().toString().padStart(2, '0')}${new Date(event.startDateTime!).getMinutes().toString().padStart(2, '0')}`;
      raw.push({
        key: `${timePrefix}:${event.calendarId}:${event.id}:${seg.startDate}`,
        event,
        startCol,
        span,
        bar,
        clippedStart: seg.clippedStart,
        clippedEnd: seg.clippedEnd,
      });
    }

    const items: IntervalItem[] = raw.map((c) => ({
      key: c.key,
      start: c.startCol,
      end: c.startCol + c.span,
    }));
    const placements = layoutIntervals(items);

    const chips: Chip[] = [];
    const hiddenPerDay = new Array(7).fill(0) as number[];
    let maxVisibleLane = -1;

    for (const c of raw) {
      const lane = placements.get(c.key)!.lane;
      if (lane < MAX_LANES) {
        chips.push({ ...c, lane });
        maxVisibleLane = Math.max(maxVisibleLane, lane);
      } else {
        for (let col = c.startCol; col < c.startCol + c.span; col++) hiddenPerDay[col] += 1;
      }
    }

    return { chips, hiddenPerDay, visibleLanes: maxVisibleLane + 1 };
  }, [events, week]);

  const anyHidden = hiddenPerDay.some((n) => n > 0);
  const height = Math.max(HEADER_H + visibleLanes * LANE_H + (anyHidden ? MORE_H : 0) + 6, 96);

  return (
    <div className={styles.weekRow} style={{ height }}>
      {week.map((date) => {
        const inMonth = monthOf(date) === month;
        const isToday = date === todayDate;
        return (
          <div key={date} className={`${styles.dayCell} ${inMonth ? '' : styles.dayOutside}`}>
            <button
              className={`${styles.dateNum} ${isToday ? styles.dateToday : ''}`}
              onClick={() => onDayClick(date)}
              title="Open week view"
            >
              {dayOf(date)}
            </button>
          </div>
        );
      })}

      {chips.map((chip) => {
        const cal = calById.get(chip.event.calendarId);
        const bg = cal?.bg ?? '#4285f4';
        return chip.bar ? (
          <button
            key={`${chip.event.id}-${chip.startCol}`}
            className={[
              styles.barChip,
              chip.clippedStart ? styles.chipClipStart : '',
              chip.clippedEnd ? styles.chipClipEnd : '',
            ].join(' ')}
            style={{
              left: `calc(${(chip.startCol / 7) * 100}% + 3px)`,
              width: `calc(${(chip.span / 7) * 100}% - 6px)`,
              top: HEADER_H + chip.lane * LANE_H,
              background: bg,
              color: contrastText(bg),
            }}
            onClick={(e) => onChipClick(chip.event, e.currentTarget.getBoundingClientRect())}
          >
            {chip.event.title}
          </button>
        ) : (
          <button
            key={`${chip.event.id}-${chip.startCol}`}
            className={styles.timedChip}
            style={{
              left: `calc(${(chip.startCol / 7) * 100}% + 3px)`,
              width: `calc(${(chip.span / 7) * 100}% - 6px)`,
              top: HEADER_H + chip.lane * LANE_H,
            }}
            onClick={(e) => onChipClick(chip.event, e.currentTarget.getBoundingClientRect())}
          >
            <span className={styles.timedDot} style={{ background: bg }} />
            <span className={styles.timedText}>
              {formatTimeShort(chip.event.startDateTime!)} {chip.event.title}
            </span>
          </button>
        );
      })}

      {hiddenPerDay.map((count, col) =>
        count > 0 ? (
          <button
            key={col}
            className={styles.moreLink}
            style={{
              left: `calc(${(col / 7) * 100}% + 3px)`,
              width: `calc(${100 / 7}% - 6px)`,
              top: HEADER_H + visibleLanes * LANE_H,
            }}
            onClick={(e) => onMoreClick(week[col], e.currentTarget.getBoundingClientRect())}
          >
            +{count} more
          </button>
        ) : null,
      )}
    </div>
  );
}

interface EventDetailListPopoverProps {
  date: IsoDate;
  events: AppEvent[];
  calById: Map<string, CalendarInfo>;
  anchor: AnchorRect;
  onPick: (event: AppEvent, anchor: AnchorRect) => void;
  onClose: () => void;
}

function EventDetailListPopover({
  date,
  events,
  calById,
  anchor,
  onPick,
  onClose,
}: EventDetailListPopoverProps) {
  return (
    <EventListShell date={date} anchor={anchor} onClose={onClose}>
      {events.map((event) => {
        const bg = calById.get(event.calendarId)?.bg ?? '#4285f4';
        return (
          <button
            key={event.id}
            className={styles.dayListItem}
            onClick={(e) => onPick(event, e.currentTarget.getBoundingClientRect())}
          >
            <span className={styles.timedDot} style={{ background: bg }} />
            <span className={styles.timedText}>
              {event.isAllDay ? event.title : `${formatTimeShort(event.startDateTime!)} ${event.title}`}
            </span>
          </button>
        );
      })}
    </EventListShell>
  );
}

function EventListShell({
  date,
  anchor,
  onClose,
  children,
}: {
  date: IsoDate;
  anchor: AnchorRect;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Popover anchor={anchor} onClose={onClose}>
      <div className={styles.dayListHeading}>{formatDate(date)}</div>
      <div className={styles.dayList}>{children}</div>
    </Popover>
  );
}
