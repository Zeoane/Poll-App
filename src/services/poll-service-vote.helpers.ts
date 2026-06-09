import { isExamplePoll } from '../data/example-polls';
import type { Poll } from '../types/poll';

import {
  castExampleVote,
  retractExampleVote,
} from './poll-service-example-vote';

export interface PollVoteActionDeps {
  readonly ensurePollDetail: (pollId: string) => Promise<Poll | undefined>;
  readonly isPollEnded: (poll: Poll) => boolean;
}

export interface PollVoteMutationDeps extends PollVoteActionDeps {
  readonly commitExamplePoll: (poll: Poll) => Poll;
  readonly castRemoteVote: (
    pollId: string,
    questionId: string,
    optionId: string,
  ) => Promise<void>;
  readonly retractRemoteVote: (questionId: string, optionId: string) => Promise<void>;
  readonly reloadPollDetail: (pollId: string) => Promise<Poll | undefined>;
}

/**
 * Loads an open poll before applying a vote mutation.
 * @param pollId - Target survey id.
 * @param deps - Poll lookup and ended-state helpers.
 * @returns Poll ready for voting, or `undefined` when missing or closed.
 */
export async function resolveOpenPollForVote(
  pollId: string,
  deps: PollVoteActionDeps,
): Promise<Poll | undefined> {
  const poll = await deps.ensurePollDetail(pollId);
  if (poll === undefined || deps.isPollEnded(poll)) {
    return undefined;
  }
  return poll;
}

/**
 * True when the poll should use in-memory example vote handling.
 * @param poll - Poll being voted on.
 * @returns Whether votes mutate the local example cache only.
 */
export function isExamplePollVote(poll: Poll): boolean {
  return isExamplePoll(poll);
}

/**
 * Records one vote on a question and reloads survey detail.
 * @param pollId - Target survey id.
 * @param questionId - Question receiving the vote.
 * @param optionId - Selected option id.
 * @param deps - Poll resolution and persistence helpers.
 * @returns Updated poll detail, or `undefined` when the poll is missing or ended.
 */
export async function runVoteOnQuestion(
  pollId: string,
  questionId: string,
  optionId: string,
  deps: PollVoteMutationDeps,
): Promise<Poll | undefined> {
  const poll = await resolveOpenPollForVote(pollId, deps);
  if (poll === undefined) {
    return undefined;
  }
  if (isExamplePollVote(poll)) {
    return deps.commitExamplePoll(castExampleVote(poll, questionId, optionId));
  }
  await deps.castRemoteVote(pollId, questionId, optionId);
  return deps.reloadPollDetail(pollId);
}

/**
 * Removes one vote from a question and reloads survey detail.
 * @param pollId - Target survey id.
 * @param questionId - Question losing the vote.
 * @param optionId - Option id to retract.
 * @param deps - Poll resolution and persistence helpers.
 * @returns Updated poll detail, or `undefined` when blocked or retraction fails.
 */
export async function runRetractVoteOnQuestion(
  pollId: string,
  questionId: string,
  optionId: string,
  deps: PollVoteMutationDeps,
): Promise<Poll | undefined> {
  const poll = await resolveOpenPollForVote(pollId, deps);
  if (poll === undefined) {
    return undefined;
  }
  if (isExamplePollVote(poll)) {
    const updated = retractExampleVote(poll, questionId, optionId);
    return updated === undefined ? undefined : deps.commitExamplePoll(updated);
  }
  await deps.retractRemoteVote(questionId, optionId);
  return deps.reloadPollDetail(pollId);
}
