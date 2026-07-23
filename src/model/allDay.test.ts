import { describe, expect, it } from 'vitest';
import { inclusiveEndFromWire, wireRangeFromInclusive } from './allDay';

describe('allDay wire conversion', () => {
  it('one-day event round-trips', () => {
    // Jul 4 single day → wire end Jul 5 (exclusive)
    const wire = wireRangeFromInclusive('2026-07-04', '2026-07-04');
    expect(wire.start.date).toBe('2026-07-04');
    expect(wire.end.date).toBe('2026-07-05');
    expect(inclusiveEndFromWire(wire.end.date)).toBe('2026-07-04');
  });

  it('multi-day event round-trips', () => {
    // Jul 3–5 → wire end Jul 6
    const wire = wireRangeFromInclusive('2026-07-03', '2026-07-05');
    expect(wire.end.date).toBe('2026-07-06');
    expect(inclusiveEndFromWire(wire.end.date)).toBe('2026-07-05');
  });

  it('round-trips across month and year boundaries', () => {
    expect(wireRangeFromInclusive('2026-01-31', '2026-01-31').end.date).toBe('2026-02-01');
    expect(wireRangeFromInclusive('2026-12-28', '2026-12-31').end.date).toBe('2027-01-01');
    expect(inclusiveEndFromWire('2027-01-01')).toBe('2026-12-31');
  });
});
