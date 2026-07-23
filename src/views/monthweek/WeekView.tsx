import { useEffect, useMemo, useRef, useState } from 'react';
import type { CalendarInfo } from '../../api/calendarList';
import { CalendarTogglePanel } from '../../components/CalendarTogglePanel';
import { useRangeEvents } from '../../hooks/useRangeEvents';
import { useSettings } from '../../hooks/useSettings';
import { contrastText } from '../../model/color';
import type { AppEvent } from '../../model/eventModel';
import { formatTimeShort } from '../../model/format';
import { layoutIntervals, type IntervalItem } from '../../model/lanes';
import {
  addDays,
  dayOf,
  diffDays,
  monthOf,
  today,
  yearOf,
  type IsoDate,
} from '../../model/isoDate';
import { clipToRange } from '../../model/segments';
import type { Route } from '../../route';
import type { AnchorRect } from '../year/useGridDrag';
import { EventDetailPopover } from './EventDetailPopover';
import { weekDates } from './gridDates';
import styles from './monthWeek.module.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_H = 48;
const ALLDAY_LANE_H = 24;
const MIN_MINUTES = 20; // layout floor so back-to-back short events still stack

interface WeekViewProps {
  date: IsoDate;
  calendars: CalendarInfo[];
  onNavigate: (route: Route) => void;
}

export function WeekView({ date, calendars, onNavigate }: WeekViewProps) {
  const settings = useSettings();
  const [detail, setDetail] = useState<{ event: AppEvent; anchor: AnchorRect } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayDate = today();

  const dates = useMemo(() => weekDates(date), [date]);
  const hidden = new Set(settings.hiddenCalendarIds);
  const visibleIds = calendars.filter((c) => !hidden.has(c.id)).map((c) => c.id);
  const { events, isLoading } = useRangeEvents(visibleIds, dates[0], dates[6]);
  const calById = useMemo(() => new Map(calendars.map((c) => [c.id, c])), [calendars]);

  const allDayEvents = events.filter((e) => e.isAllDay || e.startDate !== e.endDate);
  const timedEvents = events.filter((e) => !e.isAllDay);

  // All-day strip: same weekly lane layout as the month view rows.
  const strip = useMemo(() => {
    const raw = allDayEvents
      .map((event) => ({ event, seg: clipToRange(event, dates[0], dates[6]) }))
      .filter((x): x is { event: AppEvent; seg: NonNullable<ReturnType<typeof clipToRange>> } => !!x.seg);
    const items: IntervalItem[] = raw.map(({ event, seg }) => ({
      key: event.id,
      start: diffDays(seg.startDate, dates[0]),
      end: diffDays(seg.endDate, dates[0]) + 1,
    }));
    const placements = layoutIntervals(items);
    const lanes = items.reduce((max, i) => Math.max(max, placements.get(i.key)!.lane + 1), 0);
    return { raw, placements, lanes };
  }, [allDayEvents, dates]);

  // Scroll to 7am on mount / week change.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 7 * HOUR_H - 6 });
  }, [date]);

  // Now-line, updated each minute.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const now = new Date(nowTick);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayCol = dates.indexOf(todayDate);

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <CalendarTogglePanel calendars={calendars} />
      </aside>

      <section className={styles.content}>
        <div className={styles.toolbar}>
          <button
            className="btn btn-ghost"
            aria-label="Previous week"
            onClick={() => onNavigate({ view: 'week', date: addDays(date, -7) })}
          >
            ◀
          </button>
          <button
            className="btn btn-ghost"
            aria-label="Next week"
            onClick={() => onNavigate({ view: 'week', date: addDays(date, 7) })}
          >
            ▶
          </button>
          <span className={styles.periodLabel}>{weekLabel(dates)}</span>
          <button className="btn" onClick={() => onNavigate({ view: 'week', date: todayDate })}>
            Today
          </button>
          {isLoading && <span className={styles.loading}>Loading…</span>}
        </div>

        <div className={styles.weekHeaderRow}>
          <div className={styles.gutterSpacer} />
          {dates.map((d, i) => (
            <div key={d} className={styles.weekHeaderCell}>
              <span className={styles.weekHeaderDay}>{WEEKDAYS[i]}</span>
              <span className={`${styles.weekHeaderDate} ${d === todayDate ? styles.dateToday : ''}`}>
                {dayOf(d)}
              </span>
            </div>
          ))}
        </div>

        {strip.lanes > 0 && (
          <div className={styles.allDayStrip} style={{ height: strip.lanes * ALLDAY_LANE_H + 6 }}>
            <div className={styles.gutterSpacer} />
            <div className={styles.allDayArea}>
              {strip.raw.map(({ event, seg }) => {
                const p = strip.placements.get(event.id)!;
                const startCol = diffDays(seg.startDate, dates[0]);
                const span = diffDays(seg.endDate, seg.startDate) + 1;
                const bg = calById.get(event.calendarId)?.bg ?? '#4285f4';
                return (
                  <button
                    key={event.id}
                    className={[
                      styles.barChip,
                      seg.clippedStart ? styles.chipClipStart : '',
                      seg.clippedEnd ? styles.chipClipEnd : '',
                    ].join(' ')}
                    style={{
                      left: `calc(${(startCol / 7) * 100}% + 3px)`,
                      width: `calc(${(span / 7) * 100}% - 6px)`,
                      top: p.lane * ALLDAY_LANE_H + 3,
                      background: bg,
                      color: contrastText(bg),
                    }}
                    onClick={(e) => setDetail({ event, anchor: e.currentTarget.getBoundingClientRect() })}
                  >
                    {event.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className={styles.timeScroll} ref={scrollRef}>
          <div className={styles.timeGrid} style={{ height: 24 * HOUR_H }}>
            <div className={styles.hourGutter}>
              {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => (
                <span key={h} className={styles.hourLabel} style={{ top: h * HOUR_H }}>
                  {hourLabel(h)}
                </span>
              ))}
            </div>

            {dates.map((d) => (
              <DayTimeColumn
                key={d}
                date={d}
                events={timedEvents}
                calById={calById}
                onChipClick={(event, anchor) => setDetail({ event, anchor })}
              />
            ))}

            <div className={styles.hourLines}>
              {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => (
                <div key={h} className={styles.hourLine} style={{ top: h * HOUR_H }} />
              ))}
            </div>

            {todayCol >= 0 && (
              <div
                className={styles.nowLine}
                style={{
                  top: (nowMinutes / 1440) * 24 * HOUR_H,
                  left: `calc(var(--gutter-w) + (100% - var(--gutter-w)) * ${todayCol / 7})`,
                  width: `calc((100% - var(--gutter-w)) / 7)`,
                }}
              >
                <span className={styles.nowDot} />
              </div>
            )}
          </div>
        </div>
      </section>

      {detail && (
        <EventDetailPopover
          event={detail.event}
          calendar={calById.get(detail.event.calendarId)}
          anchor={detail.anchor}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

interface DayTimeColumnProps {
  date: IsoDate;
  events: AppEvent[];
  calById: Map<string, CalendarInfo>;
  onChipClick: (event: AppEvent, anchor: AnchorRect) => void;
}

function DayTimeColumn({ date, events, calById, onChipClick }: DayTimeColumnProps) {
  const placed = useMemo(() => {
    const dayStart = new Date(yearOf(date), monthOf(date) - 1, dayOf(date), 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600_000);

    const spans = events
      .filter((e) => e.startDate <= date && date <= e.endDate)
      .map((event) => {
        const s = new Date(event.startDateTime!);
        const en = new Date(event.endDateTime!);
        const clampedStart = s < dayStart ? dayStart : s;
        const clampedEnd = en > dayEnd ? dayEnd : en;
        const startMin = Math.round((clampedStart.getTime() - dayStart.getTime()) / 60000);
        const endMin = Math.max(
          Math.round((clampedEnd.getTime() - dayStart.getTime()) / 60000),
          startMin + MIN_MINUTES,
        );
        return { event, startMin, endMin: Math.min(endMin, 1440) };
      })
      .filter((s) => s.endMin > s.startMin);

    const placements = layoutIntervals(
      spans.map((s) => ({ key: s.event.id, start: s.startMin, end: s.endMin })),
    );
    return spans.map((s) => ({ ...s, ...placements.get(s.event.id)! }));
  }, [events, date]);

  return (
    <div className={styles.dayTimeCol}>
      {placed.map(({ event, startMin, endMin, lane, cols }) => {
        const bg = calById.get(event.calendarId)?.bg ?? '#4285f4';
        return (
          <button
            key={event.id}
            className={styles.timedBlock}
            style={{
              top: `${(startMin / 1440) * 100}%`,
              height: `max(${((endMin - startMin) / 1440) * 100}%, 18px)`,
              left: `${(lane / cols) * 100}%`,
              width: `calc(${100 / cols}% - 2px)`,
              background: bg,
              color: contrastText(bg),
            }}
            onClick={(e) => onChipClick(event, e.currentTarget.getBoundingClientRect())}
          >
            <span className={styles.timedBlockLabel}>
              {formatTimeShort(event.startDateTime!)} {event.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function hourLabel(h: number): string {
  if (h === 0) return '';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function weekLabel(dates: IsoDate[]): string {
  const first = dates[0];
  const last = dates[6];
  const fmt = (d: IsoDate) =>
    new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(
      new Date(yearOf(d), monthOf(d) - 1, dayOf(d), 12),
    );
  return `${fmt(first)} – ${fmt(last)}, ${yearOf(last)}`;
}
