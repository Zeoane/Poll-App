const MIN_END_DATE_LEAD_DAYS = 1;

export type SurveyEndDateIssue = 'invalid' | 'tooSoon';

/**
 * Returns the earliest allowed end date (tomorrow, local midnight).
 * @param reference - Calendar day used as "today" when computing the minimum.
 * @returns Local midnight on the day after {@link reference}.
 */
export function minimumSurveyEndDate(reference = new Date()): Date {
  const min = new Date(reference);
  min.setHours(0, 0, 0, 0);
  min.setDate(min.getDate() + MIN_END_DATE_LEAD_DAYS);
  return min;
}

/**
 * True when the deadline falls on or after the minimum allowed calendar day.
 * @param deadline - Candidate end date (time-of-day is normalized to midnight for comparison).
 * @param reference - Calendar day used as "today" when computing the minimum.
 * @returns Whether {@link deadline} is on or after {@link minimumSurveyEndDate}.
 */
export function isAllowedSurveyEndDate(deadline: Date, reference = new Date()): boolean {
  const min = minimumSurveyEndDate(reference);
  const day = new Date(deadline);
  day.setHours(0, 0, 0, 0);
  return day.getTime() >= min.getTime();
}

/**
 * Validates optional end-date text; empty input is allowed.
 * @param raw - Raw end-date field value.
 * @param reference - Calendar day used as "today" when checking lead time.
 * @returns Validation issue code, or `null` when empty or valid.
 */
export function validateSurveyEndDateRaw(
  raw: string,
  reference = new Date(),
): SurveyEndDateIssue | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = parseSurveyEndDate(trimmed);
  if (parsed === null) {
    return 'invalid';
  }
  if (!isAllowedSurveyEndDate(parsed, reference)) {
    return 'tooSoon';
  }
  return null;
}

/**
 * User-facing message for one end-date validation issue.
 * @param issue - Validation issue from {@link validateSurveyEndDateRaw}.
 * @returns Localized error string for the issue.
 */
export function surveyEndDateErrorMessage(issue: SurveyEndDateIssue): string {
  if (issue === 'invalid') {
    return 'Please enter a valid end date.';
  }
  return 'End date must be at least one day in the future.';
}

/**
 * True when the full trimmed string is exactly dd.mm.yyyy.
 * @param raw - Raw input to test against the German date pattern.
 * @returns Whether {@link raw} matches `dd.mm.yyyy` exactly.
 */
export function looksLikeGermanDmyDate(raw: string): boolean {
  return /^(\d{2})\.(\d{2})\.(\d{4})$/.test(raw.trim());
}

/**
 * Formats a local calendar day as dd.mm.yyyy.
 * @param date - Calendar instant to format (time-of-day is ignored).
 * @returns German date string for the local day.
 */
export function formatGermanDmy(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}.${month}.${year}`;
}

/**
 * Removes separators that are not allowed in the create-survey end-date field.
 * @param raw - Raw field value while typing or pasting.
 * @returns Value with `-` and `:` stripped out.
 */
export function sanitizeGermanDateRawInput(raw: string): string {
  return raw.replace(/[-:]/g, '');
}

/** Inline rejection copy when a complete typed end date is not allowed. */
export const SURVEY_END_DATE_REJECTED_INPUT_MESSAGE = 'Enter valid date.';

/**
 * True when typed text is a complete dd.mm.yyyy date before the minimum end day.
 * @param raw - Raw field value while typing or pasting.
 * @param reference - Calendar day used as "today" when checking lead time.
 * @returns Whether {@link raw} is complete and on or before today.
 */
export function isRejectedTypedSurveyEndDate(
  raw: string,
  reference = new Date(),
): boolean {
  const trimmed = raw.trim();
  if (!looksLikeGermanDmyDate(trimmed)) {
    return false;
  }
  const parsed = parseGermanDmyDate(trimmed);
  if (parsed === null) {
    return false;
  }
  return !isAllowedSurveyEndDate(parsed, reference);
}

/**
 * Parses a strict dd.mm.yyyy string into an end-of-day Date.
 * @param raw - German-format date string.
 * @returns End-of-day local date, or `null` when the string is invalid.
 */
export function parseGermanDmyDate(raw: string): Date | null {
  const trimmed = raw.trim();
  const parsed = tryParseDeDmy(trimmed);
  if (parsed === null || !isValidCalendarDay(parsed.y, parsed.m, parsed.d)) {
    return null;
  }
  const { y, m, d } = parsed;
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

/**
 * Parses ISO or German date strings into an end-of-day deadline.
 * @param raw - ISO `yyyy-mm-dd` or German `dd.mm.yyyy` date string.
 * @returns End-of-day local deadline, or `null` when parsing fails.
 */
export function parseSurveyEndDate(raw: string): Date | null {
  const s = raw.trim();
  if (s.length === 0) {
    return null;
  }
  const parsed = tryParseDateSegments(s);
  if (parsed === null || !isValidCalendarDay(parsed.y, parsed.m, parsed.d)) {
    return null;
  }
  const { y, m, d } = parsed;
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

/**
 * Tries ISO yyyy-mm-dd first, then German dd.mm.yyyy.
 * @param s - Trimmed date string.
 * @returns Parsed year, month, and day parts, or `null`.
 */
function tryParseDateSegments(s: string): { y: number; m: number; d: number } | null {
  return tryParseIsoYmd(s) ?? tryParseDeDmy(s);
}

/**
 * Parses a yyyy-mm-dd date string into numeric parts.
 * @param s - ISO date string.
 * @returns Parsed year, month, and day parts, or `null` when the pattern does not match.
 */
function tryParseIsoYmd(s: string): { y: number; m: number; d: number } | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso === null) {
    return null;
  }
  return { y: Number(iso[1]), m: Number(iso[2]), d: Number(iso[3]) };
}

/**
 * Parses a dd.mm.yyyy date string into numeric parts.
 * @param s - German date string.
 * @returns Parsed year, month, and day parts, or `null` when the pattern does not match.
 */
function tryParseDeDmy(s: string): { y: number; m: number; d: number } | null {
  const de = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
  if (de === null) {
    return null;
  }
  return { y: Number(de[3]), m: Number(de[2]), d: Number(de[1]) };
}

/**
 * Returns true when y/m/d form a real calendar date.
 * @param y - Four-digit year.
 * @param m - Month (1–12).
 * @param d - Day of month.
 * @returns Whether the parts round-trip through the `Date` constructor unchanged.
 */
function isValidCalendarDay(y: number, m: number, d: number): boolean {
  if (y < 1000 || y > 9999 || m < 1 || m > 12 || d < 1 || d > 31) {
    return false;
  }
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}
