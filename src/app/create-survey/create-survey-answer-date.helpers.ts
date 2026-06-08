import {
  isAllowedSurveyEndDate,
  looksLikeGermanDmyDate,
  parseGermanDmyDate,
} from './create-survey-end-date';

export type AnswerDateIssue = 'invalid' | 'tooSoon';

/** Validates dd.mm.yyyy answer text; non-date text is ignored. */
export function validateGermanAnswerDateRaw(
  raw: string,
  reference = new Date(),
): AnswerDateIssue | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0 || !looksLikeGermanDmyDate(trimmed)) {
    return null;
  }
  const parsed = parseGermanDmyDate(trimmed);
  if (parsed === null) {
    return 'invalid';
  }
  if (!isAllowedSurveyEndDate(parsed, reference)) {
    return 'tooSoon';
  }
  return null;
}

/** User-facing message for one answer-date validation issue. */
export function germanAnswerDateErrorMessage(issue: AnswerDateIssue): string {
  if (issue === 'invalid') {
    return 'Please enter a valid date (dd.mm.yyyy).';
  }
  return 'Answer date must be at least one day in the future.';
}
