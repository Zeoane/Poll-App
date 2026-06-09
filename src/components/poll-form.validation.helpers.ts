import {
  isAllowedSurveyEndDate,
  surveyEndDateErrorMessage,
} from '../app/create-survey/create-survey-end-date';
import { POLL_TITLE_MAX_CHARS, POLL_TITLE_MAX_WORDS } from '../types/poll';

const MIN_TITLE_LENGTH = 3;
const MIN_OPTIONS = 2;

/**
 * Counts non-empty trimmed words in a title string.
 * @param title - Raw title input to measure.
 * @returns Number of whitespace-separated words after trimming.
 */
function countTitleWords(title: string): number {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

/**
 * Returns a title validation message or undefined when valid.
 * @param title - Trimmed poll title to validate.
 * @returns Error message, or `undefined` when the title passes all rules.
 */
export function validationTitleError(title: string): string | undefined {
  if (title.length < MIN_TITLE_LENGTH) {
    return `Please enter a title with at least ${MIN_TITLE_LENGTH} characters.`;
  }
  if (title.length > POLL_TITLE_MAX_CHARS) {
    return `Title must be at most ${POLL_TITLE_MAX_CHARS} characters long.`;
  }
  if (countTitleWords(title) > POLL_TITLE_MAX_WORDS) {
    return `Title must be at most ${POLL_TITLE_MAX_WORDS} words.`;
  }
  return undefined;
}

/**
 * Returns a deadline validation message or undefined when valid or empty.
 * @param deadline - Parsed deadline, or `null` when omitted.
 * @returns Error message, or `undefined` when empty, valid, or allowed.
 */
export function validationDeadlineError(deadline: Date | null): string | undefined {
  if (deadline === null) {
    return undefined;
  }
  if (Number.isNaN(deadline.getTime())) {
    return surveyEndDateErrorMessage('invalid');
  }
  if (!isAllowedSurveyEndDate(deadline)) {
    return surveyEndDateErrorMessage('tooSoon');
  }
  return undefined;
}

/**
 * Formats a Date for datetime-local min attributes.
 * @param date - Minimum allowed survey end instant.
 * @returns `datetime-local` compatible local timestamp string.
 */
export function formatDatetimeLocalMin(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Returns an options validation message or undefined when valid.
 * @param options - Trimmed, non-empty answer option lines.
 * @returns Error message, or `undefined` when count and uniqueness pass.
 */
export function validationOptionsError(options: ReadonlyArray<string>): string | undefined {
  const uniqueOptions = new Set(options.map((option) => option.toLowerCase()));
  if (options.length < MIN_OPTIONS) {
    return `Please enter at least ${MIN_OPTIONS} answer options (one per line).`;
  }
  if (uniqueOptions.size !== options.length) {
    return 'Answer options must be unique.';
  }
  return undefined;
}
