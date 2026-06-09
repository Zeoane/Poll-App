import type { Poll } from '../types/poll';

import type { SupabaseSurveyRepository } from './supabase-survey.repository';

/**
 * Reloads one survey from Supabase and updates the cache.
 * @param pollId - Survey id to reload.
 * @param repo - Supabase survey repository.
 * @param upsertPoll - Cache merge callback.
 * @param notify - List listener notification callback.
 * @param notifySurvey - Detail listener notification callback.
 * @returns Fresh poll detail, or `undefined` when the survey no longer exists.
 */
export async function reloadPollDetailFromRepo(
  pollId: string,
  repo: SupabaseSurveyRepository,
  upsertPoll: (poll: Poll) => void,
  notify: () => void,
  notifySurvey: (surveyId: string) => void,
): Promise<Poll | undefined> {
  const detail = await repo.fetchSurveyDetail(pollId);
  if (detail === null) {
    return undefined;
  }
  upsertPoll(detail);
  notify();
  notifySurvey(pollId);
  return detail;
}
