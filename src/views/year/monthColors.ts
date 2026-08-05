import { contrastText } from '../../model/color';

/**
 * Per-month palette matching the original spreadsheet: a 6-color cycle
 * (red, orange, blue, green, purple, magenta) over Jan–Jun, repeating for
 * Jul–Dec. Strong shade for headers and event blocks, light tint for
 * weekend rows. Hexes are Google's standard color grid, same as the sheet.
 */

export interface MonthColor {
  header: string;
  weekend: string;
  block: string;
  blockFg: string;
}

const CYCLE: Array<{ strong: string; light: string }> = [
  { strong: '#e06666', light: '#f4cccc' }, // red
  { strong: '#f6b26b', light: '#fce5cd' }, // orange
  { strong: '#6fa8dc', light: '#cfe2f3' }, // blue
  { strong: '#93c47d', light: '#d9ead3' }, // green
  { strong: '#8e7cc3', light: '#d9d2e9' }, // purple
  { strong: '#c27ba0', light: '#ead1dc' }, // magenta
];

export const MONTH_COLORS: MonthColor[] = Array.from({ length: 12 }, (_, i) => {
  const { strong, light } = CYCLE[i % 6];
  return {
    header: strong,
    weekend: light,
    block: strong,
    blockFg: contrastText(strong),
  };
});

/** month is 1-12 */
export function monthColor(month: number): MonthColor {
  return MONTH_COLORS[(month - 1) % 12];
}
