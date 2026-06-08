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

/** Switches one vote between options for an example or Supabase survey. */
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

/** Applies an in-memory example poll vote switch. */
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

/** Retracts one option vote, then casts the new option vote. */
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
