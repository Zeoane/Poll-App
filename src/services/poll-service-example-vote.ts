import type { Poll, PollOption, SurveyQuestion } from '../types/poll';

/**
 * Increments one option vote on an in-memory example survey.
 * @param poll - Example poll to copy and mutate.
 * @param questionId - Question receiving the vote.
 * @param optionId - Option id to increment.
 * @returns New poll object with the updated vote count.
 */
export function castExampleVote(
  poll: Poll,
  questionId: string,
  optionId: string,
): Poll {
  return mutateExamplePoll(poll, questionId, optionId, 1);
}

/**
 * Decrements one option vote on an in-memory example survey.
 * @param poll - Example poll to copy and mutate.
 * @param questionId - Question losing the vote.
 * @param optionId - Option id to decrement.
 * @returns New poll object with the updated vote count, or undefined when the option has no votes.
 */
export function retractExampleVote(
  poll: Poll,
  questionId: string,
  optionId: string,
): Poll | undefined {
  const option = findExampleOption(poll, questionId, optionId);
  if (option === undefined || option.votes <= 0) {
    return undefined;
  }
  return mutateExamplePoll(poll, questionId, optionId, -1);
}

/**
 * Moves one vote between two options on an example survey.
 * @param poll - Example poll to copy and mutate.
 * @param questionId - Question whose vote is moving.
 * @param fromOptionId - Option id to decrement.
 * @param toOptionId - Option id to increment.
 * @returns Updated poll, or undefined when retraction fails; unchanged poll when ids match.
 */
export function changeExampleVote(
  poll: Poll,
  questionId: string,
  fromOptionId: string,
  toOptionId: string,
): Poll | undefined {
  if (fromOptionId === toOptionId) {
    return poll;
  }
  const retracted = retractExampleVote(poll, questionId, fromOptionId);
  if (retracted === undefined) {
    return undefined;
  }
  return castExampleVote(retracted, questionId, toOptionId);
}

/**
 * Applies a vote delta to one option on an example poll copy.
 * @param poll - Source example poll.
 * @param questionId - Question containing the target option.
 * @param optionId - Option id to adjust.
 * @param delta - Vote change (+1 or -1).
 * @returns Shallow copy with updated question and legacy flat options.
 */
function mutateExamplePoll(
  poll: Poll,
  questionId: string,
  optionId: string,
  delta: number,
): Poll {
  const questions = (poll.questions ?? []).map((question) =>
    question.id === questionId
      ? { ...question, options: adjustQuestionOptions(question, optionId, delta) }
      : question,
  );
  const firstQuestion = questions[0];
  return {
    ...poll,
    questions,
    options: firstQuestion?.options ?? adjustFlatOptions(poll.options, optionId, delta),
  };
}

/**
 * Updates vote counts for one question's options.
 * @param question - Question whose options to adjust.
 * @param optionId - Target option id.
 * @param delta - Vote change to apply.
 * @returns New option array with the target count clamped at zero.
 */
function adjustQuestionOptions(
  question: SurveyQuestion,
  optionId: string,
  delta: number,
): ReadonlyArray<PollOption> {
  return question.options.map((option) =>
    option.id === optionId
      ? { ...option, votes: Math.max(0, option.votes + delta) }
      : option,
  );
}

/**
 * Updates vote counts for legacy flat options on example polls.
 * @param options - Legacy top-level option list.
 * @param optionId - Target option id.
 * @param delta - Vote change to apply.
 * @returns New option array with the target count clamped at zero.
 */
function adjustFlatOptions(
  options: ReadonlyArray<PollOption>,
  optionId: string,
  delta: number,
): ReadonlyArray<PollOption> {
  return options.map((option) =>
    option.id === optionId
      ? { ...option, votes: Math.max(0, option.votes + delta) }
      : option,
  );
}

/**
 * Finds one option on an example poll question.
 * @param poll - Example poll to search.
 * @param questionId - Question containing the option.
 * @param optionId - Option id to find.
 * @returns Matching option, or undefined when the question or option is missing.
 */
function findExampleOption(
  poll: Poll,
  questionId: string,
  optionId: string,
): PollOption | undefined {
  const question = poll.questions?.find((entry) => entry.id === questionId);
  return question?.options.find((option) => option.id === optionId);
}
