import {
  createEmptyQuestionBlock,
  nextSurveyRowId,
  type QuestionBlock,
} from './create-survey.models';

export type QuestionRemovalAction = 'noop' | 'splice' | 'reset';

/**
 * Decides whether to delete, reset, or ignore a question removal request.
 * @param questions - Current question blocks in display order.
 * @param index - Zero-based index of the question to remove.
 * @param fullDeleteOrdinalMin - Minimum display ordinal that allows full delete when only one block remains.
 * @returns `'splice'` to remove, `'reset'` to clear in place, or `'noop'` when the index is invalid.
 * @remarks A sole high-ordinal question can be spliced; lower ordinals reset instead of deleting the last block.
 */
export function resolveQuestionRemovalAction(
  questions: readonly QuestionBlock[],
  index: number,
  fullDeleteOrdinalMin: number,
): QuestionRemovalAction {
  const question = questions[index];
  if (!question) {
    return 'noop';
  }
  const soleFullDelete =
    questions.length === 1 &&
    question.displayOrdinal >= fullDeleteOrdinalMin;
  if (questions.length > 1 || soleFullDelete) {
    return 'splice';
  }
  return 'reset';
}

/**
 * Builds the aria-label for a question remove control.
 * @param questions - Current question blocks in display order.
 * @param index - Zero-based index of the question.
 * @param fullDeleteOrdinalMin - Minimum display ordinal that labels remove as delete when alone.
 * @returns Accessible label describing delete vs reset behavior.
 */
export function questionRemoveAriaLabel(
  questions: readonly QuestionBlock[],
  index: number,
  fullDeleteOrdinalMin: number,
): string {
  const question = questions[index];
  if (!question) {
    return 'Remove question';
  }
  if (questions.length > 1) {
    return 'Delete question';
  }
  if (question.displayOrdinal >= fullDeleteOrdinalMin) {
    return 'Delete question';
  }
  return 'Reset question';
}

/**
 * Clears one question block back to its empty defaults.
 * @param question - Mutable question block to reset in place.
 */
export function resetQuestionBlock(question: QuestionBlock): void {
  question.prompt = '';
  question.allowMultiple = false;
  question.answers = [
    { id: nextSurveyRowId('a'), text: '' },
    { id: nextSurveyRowId('a'), text: '' },
  ];
}

/**
 * Returns the next display ordinal for a newly appended question.
 * @param questions - Existing question blocks.
 * @returns Next ordinal (1 when the list is empty).
 */
export function nextQuestionDisplayOrdinal(
  questions: readonly QuestionBlock[],
): number {
  if (questions.length === 0) {
    return 1;
  }
  return Math.max(...questions.map((entry) => entry.displayOrdinal)) + 1;
}

/**
 * Creates a new empty question block with the next ordinal.
 * @param questions - Mutable question list to append to.
 * @returns Zero-based index of the newly appended block.
 */
export function appendEmptyQuestion(questions: QuestionBlock[]): number {
  const ordinal = nextQuestionDisplayOrdinal(questions);
  questions.push(createEmptyQuestionBlock(ordinal));
  return questions.length - 1;
}

/**
 * Returns the aria-label for an answer row clear control.
 * @param answerIndex - Zero-based index of the answer row.
 * @param fullRemoveFromIndex - Index from which remove replaces clear in the label.
 * @returns `'Remove answer'` or `'Clear answer'` depending on index and list rules.
 */
export function answerRowClearAriaLabel(
  answerIndex: number,
  fullRemoveFromIndex: number,
): string {
  return answerIndex >= fullRemoveFromIndex ? 'Remove answer' : 'Clear answer';
}
