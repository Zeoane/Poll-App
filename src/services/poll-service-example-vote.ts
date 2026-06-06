import type { Poll, PollOption, SurveyQuestion } from '../types/poll';

/** Increments one option vote on an in-memory example survey. */
export function castExampleVote(
  poll: Poll,
  questionId: string,
  optionId: string,
): Poll {
  return mutateExamplePoll(poll, questionId, optionId, 1);
}

/** Decrements one option vote on an in-memory example survey. */
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

/** Moves one vote between two options on an example survey. */
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

/** Applies a vote delta to one option on an example poll copy. */
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

/** Updates vote counts for one question's options. */
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

/** Updates vote counts for legacy flat options on example polls. */
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

/** Finds one option on an example poll question. */
function findExampleOption(
  poll: Poll,
  questionId: string,
  optionId: string,
): PollOption | undefined {
  const question = poll.questions?.find((entry) => entry.id === questionId);
  return question?.options.find((option) => option.id === optionId);
}
