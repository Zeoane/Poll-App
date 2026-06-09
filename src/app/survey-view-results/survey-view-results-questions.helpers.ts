import type { Poll, SurveyQuestion } from '../../types/poll';

/**
 * Returns nested questions or a legacy single-question fallback from flat options.
 * @param poll - Poll whose questions or legacy flat options are normalized.
 * @returns Questions to render, synthesizing one question from {@link Poll.options} when needed.
 * @remarks Legacy polls without a `questions` array expose flat options as a single synthetic question.
 */
export function resolveDisplayQuestions(poll: Poll): ReadonlyArray<SurveyQuestion> {
  if (poll.questions !== undefined && poll.questions.length > 0) {
    return poll.questions;
  }
  if (poll.options.length === 0) {
    return [];
  }
  return [
    {
      id: `${poll.id}-q1`,
      sortOrder: 1,
      prompt: 'Choose one option',
      allowMultiple: false,
      options: poll.options,
    },
  ];
}
