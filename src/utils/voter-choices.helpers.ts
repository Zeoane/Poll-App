import type { Poll, VoterChoicesByQuestion } from '../types/poll';

import { getUserVoteOptionId } from './poll-vote-storage';

/** Builds voter choices for one in-memory example survey. */
export function buildExampleVoterChoices(poll: Poll): VoterChoicesByQuestion {
  const optionId = getUserVoteOptionId(poll.id);
  const questionId = poll.questions?.[0]?.id;
  if (optionId === null || questionId === undefined) {
    return {};
  }
  return { [questionId]: [optionId] };
}

/** Returns true when a question has at least one stored choice. */
export function hasChosenOptions(choices: ReadonlyArray<string>): boolean {
  return choices.length > 0;
}
