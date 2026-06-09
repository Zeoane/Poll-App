import { isExamplePoll } from '../data/example-polls';
import type { Poll } from '../types/poll';

/**
 * True when a poll already has nested question detail.
 * @param poll - Poll entry from the in-memory list.
 * @returns True when `questions` is defined and non-empty.
 */
export function pollHasQuestionDetail(poll: Poll): boolean {
  return poll.questions !== undefined && poll.questions.length > 0;
}

/**
 * Inserts or replaces one poll in the in-memory list.
 * @param polls - Mutable poll cache array.
 * @param poll - Poll to insert or merge.
 * @remarks Skips replacing an example poll with a non-example entry at the same id.
 */
/**
 * Finds a cached poll, preferring built-in example entries over remote duplicates.
 * @param polls - In-memory poll cache.
 * @param pollId - Poll id to resolve.
 * @returns Matching poll, or `undefined` when absent.
 */
export function findCachedPollById(
  polls: readonly Poll[],
  pollId: string,
): Poll | undefined {
  const example = polls.find((entry) => entry.id === pollId && entry.isExample === true);
  if (example !== undefined) {
    return example;
  }
  return polls.find((entry) => entry.id === pollId);
}

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
