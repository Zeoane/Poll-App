import { buildExamplePolls } from '../data/example-polls';
import type { Poll } from '../types/poll';

import type { SupabaseSurveyRepository } from './supabase-survey.repository';

/**
 * Loads published remote surveys and appends in-memory example polls.
 * @param repo - Supabase survey repository.
 * @returns Poll list for the in-memory cache.
 * @remarks Returns example polls only when Supabase is unavailable.
 */
export async function loadPublishedPollList(
  repo: SupabaseSurveyRepository,
): Promise<readonly Poll[]> {
  const examples = [...buildExamplePolls()];
  if (!repo.isAvailable()) {
    return examples;
  }
  const remote = await repo.fetchPublishedSurveys();
  return [...remote, ...examples];
}
