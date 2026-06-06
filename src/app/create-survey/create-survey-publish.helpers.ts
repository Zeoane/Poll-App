import type { QuestionBlock } from './create-survey.models';

/** Resolves poll options from the first question block with sensible fallbacks. */
export function resolveFirstQuestionOptions(first: QuestionBlock): string[] {
  const filledOpts = first.answers.map((a) => a.text.trim()).filter(Boolean);
  if (filledOpts.length >= 2) {
    return [...filledOpts];
  }
  if (filledOpts.length === 1) {
    return [...filledOpts, 'Option B'];
  }
  return ['Option A', 'Option B'];
}

/** Appends extra question lines below the main describing text. */
function withExtraQuestionBlock(description: string, extra: string): string {
  return (description.length > 0 ? `${description}\n\n` : '') + extra;
}

/** Builds the stored poll description from describing text and extra questions. */
export function buildPublishedDescription(
  describingText: string,
  questions: QuestionBlock[],
): string {
  let description = describingText.trim();
  const extra = formatExtraQuestionLines(questions);
  if (extra.length > 0) {
    description = withExtraQuestionBlock(description, extra);
  }
  return description.length > 0
    ? description
    : defaultDescriptionFallback(questions[0]);
}

/** Formats prompts from questions 2+ as numbered lines. */
function formatExtraQuestionLines(questions: QuestionBlock[]): string {
  const lines = questions
    .slice(1)
    .map((q, i) => {
      const p = q.prompt.trim();
      return p.length > 0 ? `${i + 2}. ${p}` : null;
    })
    .filter((x): x is string => x !== null);
  return lines.join('\n');
}

/** Uses the first question prompt when no describing text is available. */
function defaultDescriptionFallback(first: QuestionBlock | undefined): string {
  const p = first?.prompt.trim() ?? '';
  return p.length > 0 ? p : 'Survey without description.';
}
