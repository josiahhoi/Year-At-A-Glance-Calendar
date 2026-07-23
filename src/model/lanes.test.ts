import { describe, expect, it } from 'vitest';
import { layoutIntervals } from './lanes';

describe('layoutIntervals', () => {
  it('disjoint items all get lane 0 and full width', () => {
    const p = layoutIntervals([
      { key: 'a', start: 1, end: 3 },
      { key: 'b', start: 5, end: 6 },
      { key: 'c', start: 10, end: 20 },
    ]);
    for (const key of ['a', 'b', 'c']) {
      expect(p.get(key)).toEqual({ lane: 0, cols: 1 });
    }
  });

  it('two overlapping items split into two lanes', () => {
    const p = layoutIntervals([
      { key: 'a', start: 1, end: 5 },
      { key: 'b', start: 3, end: 8 },
    ]);
    expect(p.get('a')).toEqual({ lane: 0, cols: 2 });
    expect(p.get('b')).toEqual({ lane: 1, cols: 2 });
  });

  it('nested intervals share the group', () => {
    const p = layoutIntervals([
      { key: 'outer', start: 1, end: 30 },
      { key: 'inner', start: 10, end: 12 },
    ]);
    expect(p.get('outer')!.lane).toBe(0);
    expect(p.get('inner')!.lane).toBe(1);
    expect(p.get('inner')!.cols).toBe(2);
  });

  it('adjacent (touching) intervals do not overlap', () => {
    // exclusive ends: [1,5) and [5,9) touch but don't overlap
    const p = layoutIntervals([
      { key: 'a', start: 1, end: 5 },
      { key: 'b', start: 5, end: 9 },
    ]);
    expect(p.get('a')).toEqual({ lane: 0, cols: 1 });
    expect(p.get('b')).toEqual({ lane: 0, cols: 1 });
  });

  it('chains share one collision group', () => {
    const p = layoutIntervals([
      { key: 'a', start: 0, end: 10 },
      { key: 'b', start: 5, end: 15 },
      { key: 'c', start: 10, end: 20 },
    ]);
    expect(p.get('a')!.lane).toBe(0);
    expect(p.get('b')!.lane).toBe(1);
    expect(p.get('c')!.lane).toBe(0); // reuses lane 0 after a ends
    expect(p.get('a')!.cols).toBe(2);
    expect(p.get('c')!.cols).toBe(2);
  });

  it('separate groups size independently', () => {
    const p = layoutIntervals([
      { key: 'a', start: 0, end: 5 },
      { key: 'b', start: 0, end: 5 },
      { key: 'c', start: 20, end: 25 },
    ]);
    expect(p.get('a')!.cols).toBe(2);
    expect(p.get('b')!.cols).toBe(2);
    expect(p.get('c')).toEqual({ lane: 0, cols: 1 });
  });

  it('longer intervals get lower lanes at equal start', () => {
    const p = layoutIntervals([
      { key: 'short', start: 1, end: 2 },
      { key: 'long', start: 1, end: 10 },
    ]);
    expect(p.get('long')!.lane).toBe(0);
    expect(p.get('short')!.lane).toBe(1);
  });

  it('three-way overlap gets three lanes', () => {
    const p = layoutIntervals([
      { key: 'a', start: 1, end: 10 },
      { key: 'b', start: 2, end: 9 },
      { key: 'c', start: 3, end: 8 },
    ]);
    const lanes = new Set([p.get('a')!.lane, p.get('b')!.lane, p.get('c')!.lane]);
    expect(lanes.size).toBe(3);
    expect(p.get('c')!.cols).toBe(3);
  });
});
