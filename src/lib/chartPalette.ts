/**
 * Validated chart palette — single source of truth for every chart's colors.
 *
 * Values match the dataviz skill's validated reference palette (light mode,
 * surface #fcfcfb), re-run against this exact surface before changing any hex:
 *   node scripts/validate_palette.js "<hex,...>" --mode light --surface "#fcfcfb"
 *
 * Adjacent-pairlist (bars/lines/stacks), all 8 slots: ALL CHECKS PASS —
 * worst adjacent CVD ΔE 15.3, worst normal-vision ΔE 20.8.
 * All-pairs (donuts/scatter), first 4 slots only: ALL CHECKS PASS —
 * worst all-pairs CVD ΔE 9.2, normal-vision ΔE 16.3. Past 4 slots, all-pairs
 * forms are unsafe — fold into "Other" or use small multiples instead.
 */

/** Fixed categorical order — never cycle, never reorder per-chart. */
export const CATEGORICAL = [
  '#1baf7a', // 1 aqua/emerald
  '#2a78d6', // 2 blue
  '#eb6834', // 3 orange
  '#4a3aa7', // 4 violet
  '#e34948', // 5 red
  '#eda100', // 6 yellow
  '#008300', // 7 green
  '#e87ba4', // 8 magenta
] as const;

/** Slots that sit below 3:1 contrast on the light surface — relief rule
 *  applies: any chart using these ships direct labels or a table view. */
export const RELIEF_REQUIRED = new Set([CATEGORICAL[0], CATEGORICAL[5], CATEGORICAL[7]]);

/** All-pairs forms (donut, scatter) are only validated for the first 4 slots. */
export const CATEGORICAL_ALL_PAIRS_SAFE = CATEGORICAL.slice(0, 4);

/** Sequential single-hue ramp (blue) for magnitude — light -> dark. */
export const SEQUENTIAL_BLUE = {
  100: '#cde2fb',
  150: '#b7d3f6',
  200: '#9ec5f4',
  250: '#86b6ef',
  300: '#6da7ec',
  350: '#5598e7',
  400: '#3987e5',
  450: '#2a78d6',
  500: '#256abf',
  550: '#1c5cab',
  600: '#184f95',
  650: '#104281',
  700: '#0d366b',
} as const;

/** The app's accent (emerald-600, app/globals.css --color-accent) — for
 *  single-series magnitude UI (meters) that should read as "the app's
 *  color", not as a categorical/status encoding. */
export const ACCENT = '#059669';
export const ACCENT_SOFT = '#ecfdf5';

/** Status palette — fixed, never reused for series identity. Icon+label
 *  pairing required; never color alone (warning/serious are sub-3:1). */
export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
} as const;

/** Chart chrome — mirrors the app's design tokens (app/globals.css) so chart
 *  ink/gridlines match the surrounding page without importing CSS vars into
 *  SVG attributes (which can't resolve custom properties reliably in Recharts). */
export const CHROME = {
  surface: '#fcfcfb',
  primaryInk: '#0b0b0b',
  secondaryInk: '#52514e',
  mutedInk: '#898781',
  gridline: '#e1e0d9',
  axis: '#c3c2b7',
} as const;

/**
 * Sequential color for a 0-max score, snapped to the nearest defined ramp
 * step. Use for magnitude encodings (score bars, heatmap cells) — never for
 * identity. Higher score -> darker step.
 */
export function sequentialForScore(score: number, max = 10): string {
  const pct = Math.max(0, Math.min(1, score / max));
  const steps = Object.entries(SEQUENTIAL_BLUE);
  const idx = Math.min(steps.length - 1, Math.round(pct * (steps.length - 1)));
  return steps[idx][1];
}

/**
 * Categorical color for slot `index`, capped at the safe count for the
 * chart form. `allPairs: true` for donut/scatter forms (caps at 4);
 * `allPairs: false` for adjacent forms (bars/lines/stacks, all 8 usable).
 */
export function categoricalColor(index: number, allPairs = false): string {
  const palette = allPairs ? CATEGORICAL_ALL_PAIRS_SAFE : CATEGORICAL;
  return palette[index % palette.length];
}

/** Grade letter -> status-family color (hex, for SVG fills). Grades are a
 *  fixed 5-value scale (A-F), not open-ended categories, so status colors
 *  are the right family, with the sequential blue mid-step standing in for
 *  B (status has no "good but not great" step of its own). */
export function gradeToColor(grade: string | null): string {
  if (!grade) return CHROME.mutedInk;
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return STATUS.good;
  if (g.startsWith('B')) return SEQUENTIAL_BLUE[450];
  if (g.startsWith('C')) return STATUS.warning;
  if (g.startsWith('D')) return STATUS.serious;
  return STATUS.critical;
}

/** Grade letter -> Tailwind text-color class, for badges/labels. */
export function gradeColorClass(grade: string | null): string {
  if (!grade) return 'text-ink-muted';
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return 'text-status-good';
  if (g.startsWith('B')) return 'text-[#1c5cab]';
  if (g.startsWith('C')) return 'text-[#8a5a00]';
  if (g.startsWith('D')) return 'text-status-serious';
  return 'text-status-critical';
}
