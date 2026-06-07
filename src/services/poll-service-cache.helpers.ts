import { isExamplePoll } from '../data/example-polls';
import type { Poll } from '../types/poll';

/** True when a poll already has nested question detail. */
export function pollHasQuestionDetail(poll: Poll): boolean {
  return poll.questions !== undefined && poll.questions.length > 0;
}

/** Inserts or replaces one poll in the in-memory list. */
export function upsertPollInList(polls: Poll[], poll: Poll): void {
  const index = polls.findIndex((entry) => entry.id === poll.id);
  if (index < 0) {
    polls.push(poll);
    return;
  }
  if (isExamplePoll(polls[index]) && !isExamplePoll(poll)) {
    return;
  }
  polls[index] = poll;
}
