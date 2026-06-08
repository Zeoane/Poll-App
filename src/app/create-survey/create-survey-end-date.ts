const MIN_END_DATE_LEAD_DAYS = 1;

export type SurveyEndDateIssue = 'invalid' | 'tooSoon';

/** Returns the earliest allowed end date (tomorrow, local midnight). */
export function minimumSurveyEndDate(reference = new Date()): Date {
  const min = new Date(reference);
  min.setHours(0, 0, 0, 0);
  min.setDate(min.getDate() + MIN_END_DATE_LEAD_DAYS);
  return min;
}

/** True when the deadline falls on or after the minimum allowed calendar day. */
export function isAllowedSurveyEndDate(deadline: Date, reference = new Date()): boolean {
  const min = minimumSurveyEndDate(reference);
  const day = new Date(deadline);
  day.setHours(0, 0, 0, 0);
  return day.getTime() >= min.getTime();
}

/** Validates optional end-date text; empty input is allowed. */
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

/** User-facing message for one end-date validation issue. */
export function surveyEndDateErrorMessage(issue: SurveyEndDateIssue): string {
  if (issue === 'invalid') {
    return 'Please enter a valid end date.';
  }
  return 'End date must be at least one day in the future.';
}

/** True when the full trimmed string is exactly dd.mm.yyyy. */
export function looksLikeGermanDmyDate(raw: string): boolean {
  return /^(\d{2})\.(\d{2})\.(\d{4})$/.test(raw.trim());
}

/** Parses a strict dd.mm.yyyy string into an end-of-day Date. */
export function parseGermanDmyDate(raw: string): Date | null {
  const trimmed = raw.trim();
  const parsed = tryParseDeDmy(trimmed);
  if (parsed === null || !isValidCalendarDay(parsed.y, parsed.m, parsed.d)) {
    return null;
  }
  const { y, m, d } = parsed;
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

/** Parses ISO or German date strings into an end-of-day deadline. */
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

/** Tries ISO yyyy-mm-dd first, then German dd.mm.yyyy. */
function tryParseDateSegments(s: string): { y: number; m: number; d: number } | null {
  return tryParseIsoYmd(s) ?? tryParseDeDmy(s);
}

/** Parses a yyyy-mm-dd date string into numeric parts. */
function tryParseIsoYmd(s: string): { y: number; m: number; d: number } | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso === null) {
    return null;
  }
  return { y: Number(iso[1]), m: Number(iso[2]), d: Number(iso[3]) };
}

/** Parses a dd.mm.yyyy date string into numeric parts. */
function tryParseDeDmy(s: string): { y: number; m: number; d: number } | null {
  const de = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
  if (de === null) {
    return null;
  }
  return { y: Number(de[3]), m: Number(de[2]), d: Number(de[1]) };
}

/** Returns true when y/m/d form a real calendar date. */
function isValidCalendarDay(y: number, m: number, d: number): boolean {
  if (y < 1000 || y > 9999 || m < 1 || m > 12 || d < 1 || d > 31) {
    return false;
  }
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}
