import { POLL_TITLE_MAX_CHARS, POLL_TITLE_MAX_WORDS } from '../../types/poll';

import type { QuestionBlock } from './create-survey.models';

/** Returns field keys that block publishing when empty or invalid. */
export function computeCreateSurveyFieldErrors(
  surveyName: string,
  questions: readonly QuestionBlock[],
): Record<string, boolean> {
  const errors: Record<string, boolean> = {};
  addSurveyNameFieldErrors(surveyName, errors);
  addQuestionPromptFieldErrors(questions, errors);
  return errors;
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

/** Removes stale question-prompt error keys after the questions array changes. */
export function stripQuestionPromptErrorKeys(
  errors: Record<string, boolean>,
): Record<string, boolean> {
  const next = { ...errors };
  for (const key of Object.keys(next)) {
    if (key.startsWith('q-prompt-')) {
      delete next[key];
    }
  }
  return next;
}
