import {
  createEmptyQuestionBlock,
  nextSurveyRowId,
  type QuestionBlock,
} from './create-survey.models';

export type QuestionRemovalAction = 'noop' | 'splice' | 'reset';

/** Decides whether to delete, reset, or ignore a question removal request. */
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

/** Builds the aria-label for a question remove control. */
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

/** Clears one question block back to its empty defaults. */
export function resetQuestionBlock(question: QuestionBlock): void {
  question.prompt = '';
  question.allowMultiple = false;
  question.answers = [
    { id: nextSurveyRowId('a'), text: '' },
    { id: nextSurveyRowId('a'), text: '' },
  ];
}

/** Returns the next display ordinal for a newly appended question. */
export function nextQuestionDisplayOrdinal(
  questions: readonly QuestionBlock[],
): number {
  if (questions.length === 0) {
    return 1;
  }
  return Math.max(...questions.map((entry) => entry.displayOrdinal)) + 1;
}

/** Creates a new empty question block with the next ordinal. */
export function appendEmptyQuestion(questions: QuestionBlock[]): number {
  const ordinal = nextQuestionDisplayOrdinal(questions);
  questions.push(createEmptyQuestionBlock(ordinal));
  return questions.length - 1;
}

/** Returns the aria-label for an answer row clear control. */
export function answerRowClearAriaLabel(
  answerIndex: number,
  fullRemoveFromIndex: number,
): string {
  return answerIndex >= fullRemoveFromIndex ? 'Remove answer' : 'Clear answer';
}
