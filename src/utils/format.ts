const MINUTE_IN_MS = 60 * 1000;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;
const DAY_IN_MS = 24 * HOUR_IN_MS;
const PERCENT_FACTOR = 100;

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const relativeFormatter = new Intl.RelativeTimeFormat('en-US', {
  numeric: 'auto',
});

/**
 * Formats an absolute date for display; null yields a neutral placeholder.
 * @param date - Deadline or timestamp to format.
 * @returns Locale-formatted date/time string, or `'No deadline'` when {@link date} is null.
 */
export function formatDateTime(date: Date | null): string {
  if (date === null) {
    return 'No deadline';
  }
  return dateTimeFormatter.format(date);
}

/**
 * Formats a relative day/hour/minute label for a deadline vs reference.
 * @param date - Deadline to compare against {@link reference}.
 * @param reference - Anchor instant; defaults to the current time.
 * @returns Relative time phrase, or `'No deadline'` when {@link date} is null.
 */
export function formatRelative(date: Date | null, reference: Date = new Date()): string {
  if (date === null) {
    return 'No deadline';
  }
  const diffMs = date.getTime() - reference.getTime();
  if (Math.abs(diffMs) >= DAY_IN_MS) {
    return relativeFormatter.format(Math.round(diffMs / DAY_IN_MS), 'day');
  }
  if (Math.abs(diffMs) >= HOUR_IN_MS) {
    return relativeFormatter.format(Math.round(diffMs / HOUR_IN_MS), 'hour');
  }
  return relativeFormatter.format(Math.round(diffMs / MINUTE_IN_MS), 'minute');
}

/**
 * Builds an "Ends in N Day(s)" pill fragment for positive day differences.
 * @param diffMs - Milliseconds until the deadline (positive).
 * @returns Pill label using day granularity.
 */
function endsInDaysLabel(diffMs: number): string {
  const days = Math.ceil(diffMs / DAY_IN_MS);
  return `Ends in ${days} ${days === 1 ? 'Day' : 'Days'}`;
}

/**
 * Builds an "Ends in N Hour(s)" pill fragment.
 * @param diffMs - Milliseconds until the deadline (positive, under one day).
 * @returns Pill label using hour granularity.
 */
function endsInHoursLabel(diffMs: number): string {
  const hours = Math.ceil(diffMs / HOUR_IN_MS);
  return `Ends in ${hours} ${hours === 1 ? 'Hour' : 'Hours'}`;
}

/**
 * Builds an "Ends in N Minute(s)" pill fragment.
 * @param diffMs - Milliseconds until the deadline (positive, under one hour).
 * @returns Pill label using minute granularity; never shows zero minutes.
 */
function endsInMinutesLabel(diffMs: number): string {
  const minutes = Math.max(1, Math.ceil(diffMs / MINUTE_IN_MS));
  return `Ends in ${minutes} ${minutes === 1 ? 'Minute' : 'Minutes'}`;
}

/**
 * Maps a positive time-until-deadline to the coarsest human label.
 * @param diffMs - Milliseconds until the deadline (positive).
 * @returns The day, hour, or minute pill label for {@link diffMs}.
 */
function endsInFromPositiveDiff(diffMs: number): string {
  if (diffMs >= DAY_IN_MS) {
    return endsInDaysLabel(diffMs);
  }
  if (diffMs >= HOUR_IN_MS) {
    return endsInHoursLabel(diffMs);
  }
  return endsInMinutesLabel(diffMs);
}

/**
 * Card pill text for time until deadline, or null when none / already passed.
 * @param date - Poll deadline to evaluate.
 * @param reference - Anchor instant; defaults to the current time.
 * @returns Pill text when the deadline is in the future, otherwise `null`.
 */
export function formatEndsIn(
  date: Date | null,
  reference: Date = new Date(),
): string | null {
  if (date === null) {
    return null;
  }
  const diffMs = date.getTime() - reference.getTime();
  if (diffMs <= 0) {
    return null;
  }
  return endsInFromPositiveDiff(diffMs);
}

/**
 * Vote share as a 0–100 integer for progress display.
 * @param votes - Votes for one option.
 * @param total - Total votes across all options.
 * @returns Rounded percentage; `0` when {@link total} is not positive.
 */
export function calculatePercentage(votes: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((votes / total) * PERCENT_FACTOR);
}
