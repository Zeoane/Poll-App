let idSeq = 0;

/** Builds a short unique id string for question/answer rows. */
export function nextSurveyRowId(prefix: string): string {
  idSeq += 1;
  return `${prefix}-${Date.now()}-${idSeq}`;
}

export interface AnswerRow {
  id: string;
  text: string;
}

export interface QuestionBlock {
  id: string;
  /** Feste 1-basierte Nummer beim Anlegen (bleibt beim Löschen anderer Fragen erhalten). */
  displayOrdinal: number;
  prompt: string;
  allowMultiple: boolean;
  answers: AnswerRow[];
}

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
