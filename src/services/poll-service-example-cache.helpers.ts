import type { Poll } from '../types/poll';

import { upsertPollInList } from './poll-service-cache.helpers';

/**
 * Stores an updated example poll and notifies listeners.
 * @param poll - Mutated example poll to cache.
 * @param polls - Mutable in-memory poll list.
 * @param notify - List listener notification callback.
 * @param notifySurvey - Detail listener notification callback.
 * @returns The same poll after upsert and notification.
 */
export function commitExamplePollToCache(
  poll: Poll,
  polls: Poll[],
  notify: () => void,
  notifySurvey: (surveyId: string) => void,
): Poll {
  upsertPollInList(polls, poll);
  notify();
  notifySurvey(poll.id);
  return poll;
}
