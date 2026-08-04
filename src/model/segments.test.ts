import { describe, expect, it } from 'vitest';
import type { AppEvent } from './eventModel';
import { clipToRange, monthSegments } from './segments';

function evt(startDate: string, endDate: string): AppEvent {
  return {
    id: 'x',
    calendarId: 'cal',
    title: 'T',
    isAllDay: true,
    startDate,
    endDate,
  };
}

describe('monthSegments', () => {
  it('single-day event → one segment', () => {
    const segs = monthSegments(evt('2026-07-04', '2026-07-04'));
    expect(segs).toHaveLength(1);
    expect(segs[0]).toMatchObject({
      year: 2026,
      month: 7,
      startDay: 4,
      endDay: 4,
      clippedTop: false,
      clippedBottom: false,
    });
  });

  it('multi-day within one month → one segment', () => {
    const segs = monthSegments(evt('2026-05-22', '2026-05-26'));
    expect(segs).toHaveLength(1);
    expect(segs[0]).toMatchObject({ month: 5, startDay: 22, endDay: 26 });
  });

  it('cross-month event → clipped segments in both months', () => {
    // Aug 29 – Sep 5 (the Honduras trip pattern)
    const segs = monthSegments(evt('2026-08-29', '2026-09-05'));
    expect(segs).toHaveLength(2);
    expect(segs[0]).toMatchObject({
      month: 8,
      startDay: 29,
      endDay: 31,
      clippedTop: false,
      clippedBottom: true,
    });
    expect(segs[1]).toMatchObject({
      month: 9,
      startDay: 1,
      endDay: 5,
      clippedTop: true,
      clippedBottom: false,
    });
  });

  it('event spanning three months fills the middle month', () => {
    // Jun 21 – Sep 12 (the summer block pattern)
    const segs = monthSegments(evt('2026-06-21', '2026-09-12'));
    expect(segs).toHaveLength(4);
    expect(segs[1]).toMatchObject({
      month: 7,
      startDay: 1,
      endDay: 31,
      clippedTop: true,
      clippedBottom: true,
    });
    expect(segs[2]).toMatchObject({ month: 8, startDay: 1, endDay: 31 });
  });

  it('cross-year event spans into the next year', () => {
    const segs = monthSegments(evt('2026-12-28', '2027-01-03'));
    expect(segs).toHaveLength(2);
    expect(segs[0]).toMatchObject({ year: 2026, month: 12, startDay: 28, endDay: 31 });
    expect(segs[1]).toMatchObject({ year: 2027, month: 1, startDay: 1, endDay: 3 });
  });

  it('February segment ends on the right day', () => {
    const segs = monthSegments(evt('2026-02-25', '2026-03-02'));
    expect(segs[0]).toMatchObject({ month: 2, endDay: 28 });
  });
});

describe('clipToRange', () => {
  it('returns null when outside the range', () => {
    expect(clipToRange(evt('2026-07-01', '2026-07-02'), '2026-07-05', '2026-07-11')).toBeNull();
  });

  it('clips both edges and flags them', () => {
    const seg = clipToRange(evt('2026-07-01', '2026-07-20'), '2026-07-05', '2026-07-11');
    expect(seg).toMatchObject({
      startDate: '2026-07-05',
      endDate: '2026-07-11',
      clippedStart: true,
      clippedEnd: true,
    });
  });

  it('keeps interior events untouched', () => {
    const seg = clipToRange(evt('2026-07-06', '2026-07-07'), '2026-07-05', '2026-07-11');
    expect(seg).toMatchObject({
      startDate: '2026-07-06',
      endDate: '2026-07-07',
      clippedStart: false,
      clippedEnd: false,
    });
  });
});
