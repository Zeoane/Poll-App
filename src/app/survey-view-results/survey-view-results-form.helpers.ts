import { POLL_TITLE_MAX_CHARS, POLL_TITLE_MAX_WORDS } from '../../types/poll';

/** Counts words in a trimmed survey title string. */
export function countTitleWords(title: string): number {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

/** Formats a deadline as yyyy-mm-dd for display bindings. */
export function deadlineToEndsOnInput(deadline: Date | null): string {
  if (deadline === null) {
    return '';
  }
  const year = deadline.getFullYear();
  const month = String(deadline.getMonth() + 1).padStart(2, '0');
  const day = String(deadline.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Builds an end-of-day Date from numeric y/m/d parts or returns null. */
export function dateFromYmdParts(parts: number[]): Date | null {
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day)
  ) {
    return null;
  }
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

/** Parses endsOn yyyy-mm-dd into an end-of-day Date. */
export function parseEndsOnDate(endsOn: string): Date | null {
  const raw = endsOn.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return null;
  }
  return dateFromYmdParts(raw.split('-').map((part) => Number(part)));
}

/** Returns the first validation error for the complete-survey action. */
export function validateCompleteSurveyForm(
  surveyName: string,
  endsOn: string,
): string | null {
  const title = surveyName.trim();
  if (title.length < 3) {
    return 'Please enter a survey name with at least 3 characters.';
  }
  if (title.length > POLL_TITLE_MAX_CHARS) {
    return `Survey name must be at most ${POLL_TITLE_MAX_CHARS} characters.`;
  }
  if (countTitleWords(title) > POLL_TITLE_MAX_WORDS) {
    return `Survey name must be at most ${POLL_TITLE_MAX_WORDS} words.`;
  }
  if (parseEndsOnDate(endsOn) === null) {
    return 'Please choose a valid end date.';
  }
  return null;
}
