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

/** Formats an absolute date in localized form (e.g. "28.04.2026, 10:00"). */
export function formatDateTime(date: Date | null): string {
  if (date === null) {
    return 'Keine Deadline';
  }
  return dateTimeFormatter.format(date);
}

/** Formats a date as a human-readable relative time (e.g. "in 3 Stunden"). */
export function formatRelative(date: Date | null, reference: Date = new Date()): string {
  if (date === null) {
    return 'Keine Deadline';
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
 * Formats a future deadline as a short "Ends in N Day(s)" / "Ends in N Hour(s)"
 * string for the deadline pill on poll cards. Returns `null` for missing or
 * already-elapsed deadlines so the caller can hide the pill entirely.
 *
 * Math.ceil ensures that "20h left" still reads as "Ends in 1 Day", which
 * matches the visual intent of the Figma cards ("Ends in 1/2/3 Days").
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
  if (diffMs >= DAY_IN_MS) {
    const days = Math.ceil(diffMs / DAY_IN_MS);
    return `Ends in ${days} ${days === 1 ? 'Day' : 'Days'}`;
  }
  if (diffMs >= HOUR_IN_MS) {
    const hours = Math.ceil(diffMs / HOUR_IN_MS);
    return `Ends in ${hours} ${hours === 1 ? 'Hour' : 'Hours'}`;
  }
  const minutes = Math.max(1, Math.ceil(diffMs / MINUTE_IN_MS));
  return `Ends in ${minutes} ${minutes === 1 ? 'Minute' : 'Minutes'}`;
}

/** Calculates the percentage share (0–100) of votes within the total. */
export function calculatePercentage(votes: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((votes / total) * PERCENT_FACTOR);
}
