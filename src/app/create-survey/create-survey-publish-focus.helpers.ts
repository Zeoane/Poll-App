import type { QuestionBlock } from './create-survey.models';
import { answerFieldErrorKey } from './create-survey-validation.helpers';

export interface PublishFocusDocument {
  getElementById(elementId: string): HTMLElement | null;
}

/**
 * Scrolls the viewport to the first field flagged in errors.
 * @param errors - Current publish validation error map.
 * @param questions - Question blocks used to resolve answer field ids.
 * @param document - DOM accessor for focus targets.
 */
export function scrollToFirstPublishError(
  errors: Record<string, boolean>,
  questions: readonly QuestionBlock[],
  document: PublishFocusDocument,
): void {
  if (errors['surveyName'] === true) {
    focusAndScroll(document, 'survey-name');
    return;
  }
  if (errors['endDate'] === true) {
    focusAndScroll(document, 'survey-end');
    return;
  }
  const questionIndex = questions.findIndex(
    (_, index) => errors[`q-prompt-${index}`] === true,
  );
  if (questionIndex >= 0) {
    focusAndScroll(document, `create-q-prompt-${questionIndex}`);
    return;
  }
  focusFirstAnswerPublishError(errors, questions, document);
}

/**
 * Focuses the first invalid answer field flagged during publish.
 * @param errors - Current publish validation error map.
 * @param questions - Question blocks containing answer rows.
 * @param document - DOM accessor for focus targets.
 */
function focusFirstAnswerPublishError(
  errors: Record<string, boolean>,
  questions: readonly QuestionBlock[],
  document: PublishFocusDocument,
): void {
  for (let qi = 0; qi < questions.length; qi += 1) {
    const question = questions[qi];
    if (question === undefined) {
      continue;
    }
    for (let ai = 0; ai < question.answers.length; ai += 1) {
      if (errors[answerFieldErrorKey(qi, ai)] === true) {
        focusAndScroll(document, `create-a-${qi}-${ai}`);
        return;
      }
    }
  }
}

/**
 * Focuses one element id and centers it in the viewport.
 * @param document - DOM accessor for the target element.
 * @param elementId - DOM id of the field to focus.
 */
function focusAndScroll(document: PublishFocusDocument, elementId: string): void {
  const element = document.getElementById(elementId);
  element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  element?.focus();
}
