import { POLL_TITLE_MAX_CHARS, POLL_TITLE_MAX_WORDS } from '../../types/poll';

import { validateGermanAnswerDateRaw } from './create-survey-answer-date.helpers';
import { validateSurveyEndDateRaw } from './create-survey-end-date';
import type { QuestionBlock } from './create-survey.models';

/**
 * Returns field keys that block publishing when empty or invalid.
 * @param surveyName - Survey title input.
 * @param questions - Question blocks to validate.
 * @param endDate - Optional end-date field value.
 * @returns Map of field keys to `true` for each blocking validation error.
 */
export function computeCreateSurveyFieldErrors(
  surveyName: string,
  questions: readonly QuestionBlock[],
  endDate = '',
): Record<string, boolean> {
  const errors: Record<string, boolean> = {};
  addSurveyNameFieldErrors(surveyName, errors);
  addEndDateFieldErrors(endDate, errors);
  addQuestionPromptFieldErrors(questions, errors);
  addAnswerDateFieldErrors(questions, errors);
  return errors;
}

/**
 * Flags answers that look like dd.mm.yyyy but are invalid or too soon.
 * @param questions - Question blocks whose answers are scanned.
 * @param errors - Mutable error map to update in place.
 */
function addAnswerDateFieldErrors(
  questions: readonly QuestionBlock[],
  errors: Record<string, boolean>,
): void {
  questions.forEach((question, questionIndex) => {
    question.answers.forEach((answer, answerIndex) => {
      if (validateGermanAnswerDateRaw(answer.text) !== null) {
        errors[answerFieldErrorKey(questionIndex, answerIndex)] = true;
      }
    });
  });
}

/**
 * Builds the publish error key for one answer input.
 * @param questionIndex - Zero-based question index.
 * @param answerIndex - Zero-based answer index within the question.
 * @returns Stable field key used in {@link computeCreateSurveyFieldErrors}.
 */
export function answerFieldErrorKey(questionIndex: number, answerIndex: number): string {
  return `a-${questionIndex}-${answerIndex}`;
}

/**
 * Flags end date when format is invalid or the day is too soon.
 * @param endDate - Raw end-date field value.
 * @param errors - Mutable error map to update in place.
 */
function addEndDateFieldErrors(endDate: string, errors: Record<string, boolean>): void {
  if (validateSurveyEndDateRaw(endDate) !== null) {
    errors['endDate'] = true;
  }
}

/**
 * Flags survey name when length or word count is out of bounds.
 * @param surveyName - Raw survey title input.
 * @param errors - Mutable error map to update in place.
 */
function addSurveyNameFieldErrors(
  surveyName: string,
  errors: Record<string, boolean>,
): void {
  const title = surveyName.trim();
  if (title.length < 3 || title.length > POLL_TITLE_MAX_CHARS) {
    errors['surveyName'] = true;
    return;
  }
  const wordCount = title.split(/\s+/).filter(Boolean).length;
  if (wordCount > POLL_TITLE_MAX_WORDS) {
    errors['surveyName'] = true;
  }
}

/**
 * Flags each question whose prompt is blank.
 * @param questions - Question blocks to inspect.
 * @param errors - Mutable error map to update in place.
 */
function addQuestionPromptFieldErrors(
  questions: readonly QuestionBlock[],
  errors: Record<string, boolean>,
): void {
  questions.forEach((question, index) => {
    if (question.prompt.trim().length === 0) {
      errors[`q-prompt-${index}`] = true;
    }
  });
}

/**
 * Removes stale question and answer error keys after structural edits.
 * @param errors - Current field error map.
 * @returns Copy with question-prompt and answer keys removed.
 * @remarks Call after splicing questions or answers so orphaned keys do not block publish.
 */
export function stripQuestionPromptErrorKeys(
  errors: Record<string, boolean>,
): Record<string, boolean> {
  const next = { ...errors };
  for (const key of Object.keys(next)) {
    if (key.startsWith('q-prompt-') || /^a-\d+-\d+$/.test(key)) {
      delete next[key];
    }
  }
  return next;
}
