const MINUTE_IN_MS = 60 * 1000;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;
const DAY_IN_MS = 24 * HOUR_IN_MS;
const PERCENT_FACTOR = 100;

const dateTimeFormatter = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const relativeFormatter = new Intl.RelativeTimeFormat('de-DE', {
  numeric: 'auto',
});

/** Formats an absolute date for display; null yields a neutral placeholder. */
export function formatDateTime(date: Date | null): string {
  if (date === null) {
    return 'No deadline';
  }
  return dateTimeFormatter.format(date);
}

/** Formats a relative time string; null yields a neutral placeholder. */
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

function endsInDaysLabel(diffMs: number): string {
  const days = Math.ceil(diffMs / DAY_IN_MS);
  return `Ends in ${days} ${days === 1 ? 'Day' : 'Days'}`;
}

function endsInHoursLabel(diffMs: number): string {
  const hours = Math.ceil(diffMs / HOUR_IN_MS);
  return `Ends in ${hours} ${hours === 1 ? 'Hour' : 'Hours'}`;
}

function endsInMinutesLabel(diffMs: number): string {
  const minutes = Math.max(1, Math.ceil(diffMs / MINUTE_IN_MS));
  return `Ends in ${minutes} ${minutes === 1 ? 'Minute' : 'Minutes'}`;
}

function endsInFromPositiveDiff(diffMs: number): string {
  if (diffMs >= DAY_IN_MS) {
    return endsInDaysLabel(diffMs);
  }
  if (diffMs >= HOUR_IN_MS) {
    return endsInHoursLabel(diffMs);
  }
  return endsInMinutesLabel(diffMs);
}

/** Card pill text for time until deadline, or null when none / already passed. */
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

/** Vote share as a 0–100 integer for progress display. */
export function calculatePercentage(votes: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((votes / total) * PERCENT_FACTOR);
}
