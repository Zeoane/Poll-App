import { isExamplePoll } from '../data/example-polls';
import type { Poll, VoterChoicesByQuestion } from '../types/poll';
import { buildExampleVoterChoices } from '../utils/voter-choices.helpers';

import { pollHasQuestionDetail } from './poll-service-cache.helpers';
import type { SupabaseSurveyRepository } from './supabase-survey.repository';

export interface PollDetailLookupDeps {
  readonly findPollById: (pollId: string) => Poll | undefined;
  readonly repo: SupabaseSurveyRepository;
  readonly upsertPoll: (poll: Poll) => void;
  readonly notify: () => void;
}

/**
 * Loads full survey detail and merges it into the cache.
 * @param pollId - Survey or example poll id.
 * @param deps - Cache lookup and persistence helpers.
 * @returns Poll with question detail, or `undefined` when not found remotely.
 * @remarks Returns cached example polls as-is; fetches from Supabase only when detail is missing.
 */
export async function resolvePollDetail(
  pollId: string,
  deps: PollDetailLookupDeps,
): Promise<Poll | undefined> {
  const cached = deps.findPollById(pollId);
  if (isExamplePoll(cached)) {
    return cached;
  }
  if (cached !== undefined && pollHasQuestionDetail(cached)) {
    return cached;
  }
  if (!deps.repo.isAvailable()) {
    return cached;
  }
  const detail = await deps.repo.fetchSurveyDetail(pollId);
  if (detail === null) {
    return undefined;
  }
  deps.upsertPoll(detail);
  deps.notify();
  return detail;
}

/**
 * Loads stored option choices for the current voter on one survey.
 * @param pollId - Survey or example poll id.
 * @param deps - Poll detail lookup and repository access.
 * @returns Question id to selected option id lists; empty object when unavailable.
 * @remarks Example polls derive choices from local storage; returns `{}` when Supabase is offline.
 */
export async function resolveVoterChoices(
  pollId: string,
  deps: PollDetailLookupDeps,
): Promise<VoterChoicesByQuestion> {
  const poll = await resolvePollDetail(pollId, deps);
  if (poll === undefined) {
    return {};
  }
  if (isExamplePoll(poll)) {
    return buildExampleVoterChoices(poll);
  }
  if (!deps.repo.isAvailable()) {
    return {};
  }
  return deps.repo.fetchVoterResponses(pollId);
}
