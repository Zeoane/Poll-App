let rowIdSequence = 0;

/** Builds a short unique id string for question/answer rows. */
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

/** Creates a blank question block with two empty answer rows. */
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
