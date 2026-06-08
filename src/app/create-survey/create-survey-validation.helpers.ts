import { POLL_TITLE_MAX_CHARS, POLL_TITLE_MAX_WORDS } from '../../types/poll';

import { validateGermanAnswerDateRaw } from './create-survey-answer-date.helpers';
import { validateSurveyEndDateRaw } from './create-survey-end-date';
import type { QuestionBlock } from './create-survey.models';

/** Returns field keys that block publishing when empty or invalid. */
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

/** Flags answers that look like dd.mm.yyyy but are invalid or too soon. */
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

/** Builds the publish error key for one answer input. */
export function answerFieldErrorKey(questionIndex: number, answerIndex: number): string {
  return `a-${questionIndex}-${answerIndex}`;
}

/** Flags end date when format is invalid or the day is too soon. */
function addEndDateFieldErrors(endDate: string, errors: Record<string, boolean>): void {
  if (validateSurveyEndDateRaw(endDate) !== null) {
    errors['endDate'] = true;
  }
}

/** Flags survey name when length or word count is out of bounds. */
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

/** Flags each question whose prompt is blank. */
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

/** Removes stale question and answer error keys after structural edits. */
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
