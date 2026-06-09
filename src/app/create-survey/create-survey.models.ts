let rowIdSequence = 0;

/**
 * Builds a short unique id string for question/answer rows.
 * @param prefix - Short namespace prefix (e.g. `'q'` or `'a'`).
 * @returns Unique row id combining prefix, timestamp, and sequence.
 */
export function nextSurveyRowId(prefix: string): string {
  rowIdSequence += 1;
  return `${prefix}-${Date.now()}-${rowIdSequence}`;
}

export interface AnswerRow {
  id: string;
  text: string;
}

export interface QuestionBlock {
  id: string;
  displayOrdinal: number;
  prompt: string;
  allowMultiple: boolean;
  answers: AnswerRow[];
}

/**
 * Creates a blank question block with two empty answer rows.
 * @param displayOrdinal - 1-based ordinal shown in the UI for this question.
 * @returns New question block with default single-select and two answer rows.
 */
export function createEmptyQuestionBlock(displayOrdinal: number): QuestionBlock {
  return {
    id: nextSurveyRowId('q'),
    displayOrdinal,
    prompt: '',
    allowMultiple: false,
    answers: [
      { id: nextSurveyRowId('a'), text: '' },
      { id: nextSurveyRowId('a'), text: '' },
    ],
  };
}
