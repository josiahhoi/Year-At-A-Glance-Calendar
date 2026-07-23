import { describe, expect, it } from 'vitest';
import {
  addDays,
  compare,
  daysInMonth,
  diffDays,
  fromParts,
  isValidIsoDate,
  monthOf,
  yearOf,
} from './isoDate';

describe('isoDate', () => {
  it('formats parts with padding', () => {
    expect(fromParts(2026, 7, 4)).toBe('2026-07-04');
    expect(fromParts(2026, 12, 31)).toBe('2026-12-31');
  });

  it('adds days across month ends', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-07-04', 10)).toBe('2026-07-14');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('adds days across year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('handles leap years', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01');
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2026, 6)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  it('computes day differences', () => {
    expect(diffDays('2026-07-04', '2026-07-01')).toBe(3);
    expect(diffDays('2026-01-01', '2025-12-31')).toBe(1);
    expect(diffDays('2026-03-01', '2026-02-01')).toBe(28);
    expect(diffDays('2024-03-01', '2024-02-01')).toBe(29);
  });

  it('compares lexicographically', () => {
    expect(compare('2026-07-04', '2026-07-05')).toBe(-1);
    expect(compare('2026-10-01', '2026-09-30')).toBe(1);
    expect(compare('2026-07-04', '2026-07-04')).toBe(0);
  });

  it('extracts parts', () => {
    expect(yearOf('2026-07-04')).toBe(2026);
    expect(monthOf('2026-07-04')).toBe(7);
  });

  it('validates dates', () => {
    expect(isValidIsoDate('2026-07-04')).toBe(true);
    expect(isValidIsoDate('2026-02-30')).toBe(false);
    expect(isValidIsoDate('2024-02-29')).toBe(true);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
    expect(isValidIsoDate('garbage')).toBe(false);
  });
});
