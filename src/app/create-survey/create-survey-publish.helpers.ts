import type { CreateSurveyQuestionInput } from '../../types/poll';

import type { QuestionBlock } from './create-survey.models';

/**
 * Maps all question blocks into Supabase create payloads.
 * @param questions - In-memory question blocks from the create form.
 * @returns Payload array ready for survey creation.
 */
export function mapQuestionsForPublish(
  questions: ReadonlyArray<QuestionBlock>,
): CreateSurveyQuestionInput[] {
  return questions.map((question) => ({
    prompt: question.prompt.trim(),
    allowMultiple: question.allowMultiple,
    answers: resolveFirstQuestionOptions(question),
  }));
}

/**
 * Resolves poll options from the first question block with sensible fallbacks.
 * @param first - Question block whose answers supply option text.
 * @returns At least two option strings, with placeholders when fewer answers are filled.
 * @remarks Pads with `'Option A'` / `'Option B'` when the block has fewer than two non-empty answers.
 */
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

/**
 * Appends extra question lines below the main describing text.
 * @param description - Base description text.
 * @param extra - Additional block to append after an optional separator.
 * @returns Combined description string.
 */
function withExtraQuestionBlock(description: string, extra: string): string {
  return (description.length > 0 ? `${description}\n\n` : '') + extra;
}

/**
 * Builds the stored poll description from describing text and extra questions.
 * @param describingText - Primary optional description field.
 * @param questions - All question blocks; prompts from index 1 onward are appended.
 * @returns Final description string, with a fallback when all inputs are empty.
 */
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

/**
 * Formats prompts from questions 2+ as numbered lines.
 * @param questions - All question blocks; index 0 is skipped.
 * @returns Newline-joined numbered lines, or an empty string when none qualify.
 */
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

/**
 * Uses the first question prompt when no describing text is available.
 * @param first - First question block, if present.
 * @returns Trimmed first prompt or a generic fallback string.
 */
function defaultDescriptionFallback(first: QuestionBlock | undefined): string {
  const p = first?.prompt.trim() ?? '';
  return p.length > 0 ? p : 'Survey without description.';
}
