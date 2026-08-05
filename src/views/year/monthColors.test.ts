import { describe, expect, it } from 'vitest';
import { MONTH_COLORS, monthColor } from './monthColors';

const HEX = /^#[0-9a-f]{6}$/;

describe('monthColors', () => {
  it('provides 12 months of valid colors', () => {
    expect(MONTH_COLORS).toHaveLength(12);
    for (const c of MONTH_COLORS) {
      expect(c.header).toMatch(HEX);
      expect(c.weekend).toMatch(HEX);
      expect(c.block).toMatch(HEX);
      expect(['#1f2430', '#ffffff']).toContain(c.blockFg);
    }
  });

  it('repeats the 6-color cycle in the second half of the year', () => {
    expect(monthColor(7)).toEqual(monthColor(1));
    expect(monthColor(12)).toEqual(monthColor(6));
    expect(monthColor(1).header).not.toBe(monthColor(2).header);
  });
});
