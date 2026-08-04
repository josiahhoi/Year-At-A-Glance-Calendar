/**
 * Interval layout shared by the year grid (day spans), month-view chip rows
 * (weekday spans), and week-view timed events (minute spans).
 *
 * Items are placed into lanes greedily; each item also learns the width of
 * its collision group (`cols`) so non-overlapping items can use full width
 * while overlapping ones share it.
 */

export interface IntervalItem {
  key: string;
  start: number; // inclusive
  end: number; // EXCLUSIVE — for day spans pass endDay + 1
}

export interface IntervalPlacement {
  lane: number;
  cols: number; // lane count of this item's collision group
}

export function layoutIntervals(items: IntervalItem[]): Map<string, IntervalPlacement> {
  const sorted = [...items].sort(
    (a, b) => a.start - b.start || b.end - b.start - (a.end - a.start) || (a.key < b.key ? -1 : 1),
  );

  const placements = new Map<string, IntervalPlacement>();
  const laneEnds: number[] = []; // exclusive end of the last item in each lane

  // Collision groups: a group closes when every active item has ended.
  let group: string[] = [];
  let groupMaxLane = 0;
  let groupEnd = -Infinity;

  const closeGroup = () => {
    for (const key of group) {
      placements.get(key)!.cols = groupMaxLane + 1;
    }
    group = [];
    groupMaxLane = 0;
  };

  for (const item of sorted) {
    if (group.length > 0 && item.start >= groupEnd) closeGroup();

    let lane = laneEnds.findIndex((end) => end <= item.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.end);
    } else {
      laneEnds[lane] = item.end;
    }

    placements.set(item.key, { lane, cols: 1 });
    group.push(item.key);
    groupMaxLane = Math.max(groupMaxLane, lane);
    groupEnd = Math.max(groupEnd, item.end);
  }
  if (group.length > 0) closeGroup();

  return placements;
}
