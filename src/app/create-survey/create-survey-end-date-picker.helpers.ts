import {
  formatGermanDmy,
  minimumSurveyEndDate,
  parseGermanDmyDate,
} from './create-survey-end-date';

export type CalendarDayCell = {
  readonly date: Date;
  readonly day: number;
  readonly inMonth: boolean;
  readonly disabled: boolean;
  readonly selected: boolean;
};

export const CALENDAR_WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;

export const CALENDAR_MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/**
 * Normalizes a date to local midnight for day comparisons.
 * @param date - Instant to normalize.
 * @returns Copy with hours set to 00:00:00.000.
 */
export function normalizeToMidnight(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * True when the calendar day is strictly before the minimum allowed day.
 * @param day - Candidate calendar day.
 * @param minDay - Earliest selectable day (normalized).
 * @returns Whether {@link day} is before {@link minDay}.
 */
export function isDayBeforeMin(day: Date, minDay: Date): boolean {
  return normalizeToMidnight(day).getTime() < normalizeToMidnight(minDay).getTime();
}

/**
 * True when a month contains at least one selectable end date.
 * @param year - Four-digit calendar year.
 * @param month - Zero-based month index.
 * @param minDay - Earliest selectable day.
 * @returns Whether any day in the month is on or after {@link minDay}.
 */
export function monthHasSelectableDay(year: number, month: number, minDay: Date): boolean {
  const lastDay = new Date(year, month + 1, 0);
  return !isDayBeforeMin(lastDay, minDay);
}

/**
 * Shifts the visible month by one step.
 * @param year - Current view year.
 * @param month - Current zero-based view month.
 * @param delta - `-1` for previous month, `1` for next.
 * @returns Updated year and month for the calendar header.
 */
export function shiftViewMonth(
  year: number,
  month: number,
  delta: -1 | 1,
): { year: number; month: number } {
  const shifted = new Date(year, month + delta, 1);
  return { year: shifted.getFullYear(), month: shifted.getMonth() };
}

/**
 * Picks the initial calendar month from the field value or minimum date.
 * @param rawValue - Current end-date field text.
 * @param reference - Calendar day used as "today".
 * @returns Year and zero-based month to show when opening the picker.
 */
export function resolveInitialCalendarView(
  rawValue: string,
  reference = new Date(),
): { year: number; month: number } {
  const parsed = parseGermanDmyDate(rawValue.trim());
  if (parsed !== null) {
    return { year: parsed.getFullYear(), month: parsed.getMonth() };
  }
  const min = minimumSurveyEndDate(reference);
  return { year: min.getFullYear(), month: min.getMonth() };
}

/**
 * Builds a six-week grid for one visible month.
 * @param year - Four-digit calendar year.
 * @param month - Zero-based month index.
 * @param minDay - Earliest selectable day.
 * @param selectedRaw - Current field value for highlighting.
 * @returns Day cells for the month grid (Monday-first).
 */
export function buildMonthGrid(
  year: number,
  month: number,
  minDay: Date,
  selectedRaw: string,
): CalendarDayCell[] {
  const selected = parseGermanDmyDate(selectedRaw.trim());
  const selectedKey = selected === null ? null : formatGermanDmy(selected);
  const firstOfMonth = new Date(year, month, 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - mondayOffset);
  return Array.from({ length: 42 }, (_, index) =>
    buildGridCell(gridStart, index, year, month, minDay, selectedKey),
  );
}

/**
 * Builds one day cell in the month grid.
 * @param gridStart - Date of the first visible grid cell.
 * @param index - Zero-based offset from {@link gridStart}.
 * @param viewYear - Visible month year.
 * @param viewMonth - Visible zero-based month.
 * @param minDay - Earliest selectable day.
 * @param selectedKey - Selected dd.mm.yyyy key, if any.
 * @returns One calendar cell descriptor.
 */
function buildGridCell(
  gridStart: Date,
  index: number,
  viewYear: number,
  viewMonth: number,
  minDay: Date,
  selectedKey: string | null,
): CalendarDayCell {
  const date = new Date(gridStart);
  date.setDate(gridStart.getDate() + index);
  const inMonth = date.getMonth() === viewMonth && date.getFullYear() === viewYear;
  const disabled = isDayBeforeMin(date, minDay);
  const selected = selectedKey !== null && formatGermanDmy(date) === selectedKey;
  return { date, day: date.getDate(), inMonth, disabled, selected };
}
