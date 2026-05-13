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
  prompt: string;
  allowMultiple: boolean;
  answers: AnswerRow[];
}

export function createEmptyQuestionBlock(): QuestionBlock {
  return {
    id: nextSurveyRowId('q'),
    prompt: '',
    allowMultiple: false,
    answers: [
      { id: nextSurveyRowId('a'), text: '' },
      { id: nextSurveyRowId('a'), text: '' },
    ],
  };
}
