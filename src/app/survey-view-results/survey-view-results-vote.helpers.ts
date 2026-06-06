import type { PollService } from '../../services/poll-service';
import type { Poll } from '../../types/poll';

export interface VoteForOptionResult {
  readonly poll: Poll;
  readonly chosenOptionId: string | null;
}

/** Applies select, switch, or deselect vote logic for one poll option. */
export function applyVoteForOption(
  poll: Poll,
  optionId: string,
  currentChoiceId: string | null,
  service: PollService,
): VoteForOptionResult | undefined {
  if (service.isPollEnded(poll)) {
    return undefined;
  }
  if (currentChoiceId === optionId) {
    return retractVoteChoice(poll, optionId, service);
  }
  if (currentChoiceId === null) {
    return castVoteChoice(poll, optionId, service);
  }
  return changeVoteChoice(poll, currentChoiceId, optionId, service);
}

/** Retracts the current vote selection. */
function retractVoteChoice(
  poll: Poll,
  optionId: string,
  service: PollService,
): VoteForOptionResult | undefined {
  const updated = service.retractVote(poll.id, optionId);
  if (updated === undefined) {
    return undefined;
  }
  return { poll: updated, chosenOptionId: null };
}

/** Casts a first vote on the poll. */
function castVoteChoice(
  poll: Poll,
  optionId: string,
  service: PollService,
): VoteForOptionResult | undefined {
  const updated = service.vote(poll.id, optionId);
  if (updated === undefined) {
    return undefined;
  }
  return { poll: updated, chosenOptionId: optionId };
}

/** Moves an existing vote to a different option. */
function changeVoteChoice(
  poll: Poll,
  fromOptionId: string,
  toOptionId: string,
  service: PollService,
): VoteForOptionResult | undefined {
  const updated = service.changeVote(poll.id, fromOptionId, toOptionId);
  if (updated === undefined) {
    return undefined;
  }
  return { poll: updated, chosenOptionId: toOptionId };
}
