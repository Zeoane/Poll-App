import { isExamplePoll } from '../data/example-polls';
import type { Poll } from '../types/poll';

import { changeExampleVote } from './poll-service-example-vote';

type VoteOnQuestionFn = (
  pollId: string,
  questionId: string,
  optionId: string,
) => Promise<Poll | undefined>;

export interface ChangeVoteOnQuestionDeps {
  readonly retractVoteOnQuestion: VoteOnQuestionFn;
  readonly voteOnQuestion: VoteOnQuestionFn;
  readonly commitExamplePoll: (poll: Poll) => Poll;
}

/**
 * Switches one vote between options for an example or Supabase survey.
 * @param poll - Current poll detail (example or remote).
 * @param pollId - Target survey id.
 * @param questionId - Question whose vote is changing.
 * @param fromOptionId - Option id to retract.
 * @param toOptionId - Option id to cast.
 * @param deps - Retract, vote, and example-commit callbacks from the service.
 * @returns Updated poll detail, or undefined when a step fails.
 */
export async function runChangeVoteOnQuestion(
  poll: Poll,
  pollId: string,
  questionId: string,
  fromOptionId: string,
  toOptionId: string,
  deps: ChangeVoteOnQuestionDeps,
): Promise<Poll | undefined> {
  if (isExamplePoll(poll)) {
    return applyExampleVoteChange(poll, questionId, fromOptionId, toOptionId, deps.commitExamplePoll);
  }
  return applyRemoteVoteChange(
    pollId,
    questionId,
    fromOptionId,
    toOptionId,
    deps.retractVoteOnQuestion,
    deps.voteOnQuestion,
  );
}

/**
 * Applies an in-memory example poll vote switch.
 * @param poll - Example poll to mutate.
 * @param questionId - Question whose vote is changing.
 * @param fromOptionId - Option id to decrement.
 * @param toOptionId - Option id to increment.
 * @param commitExamplePoll - Persists the mutated example poll in the service cache.
 * @returns Committed poll, or undefined when retraction fails.
 */
function applyExampleVoteChange(
  poll: Poll,
  questionId: string,
  fromOptionId: string,
  toOptionId: string,
  commitExamplePoll: (poll: Poll) => Poll,
): Poll | undefined {
  const updated = changeExampleVote(poll, questionId, fromOptionId, toOptionId);
  return updated === undefined ? undefined : commitExamplePoll(updated);
}

/**
 * Retracts one option vote, then casts the new option vote.
 * @param pollId - Target survey id.
 * @param questionId - Question whose vote is changing.
 * @param fromOptionId - Option id to retract via Supabase.
 * @param toOptionId - Option id to cast via Supabase.
 * @param retractVoteOnQuestion - Service callback that retracts one vote.
 * @param voteOnQuestion - Service callback that casts one vote.
 * @returns Updated poll after the new vote, or undefined when retraction fails.
 */
async function applyRemoteVoteChange(
  pollId: string,
  questionId: string,
  fromOptionId: string,
  toOptionId: string,
  retractVoteOnQuestion: VoteOnQuestionFn,
  voteOnQuestion: VoteOnQuestionFn,
): Promise<Poll | undefined> {
  const retracted = await retractVoteOnQuestion(pollId, questionId, fromOptionId);
  if (retracted === undefined) {
    return undefined;
  }
  return voteOnQuestion(pollId, questionId, toOptionId);
}
