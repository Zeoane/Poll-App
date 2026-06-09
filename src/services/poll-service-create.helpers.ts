import type { CreateSurveyInput, NewPollInput, Poll } from '../types/poll';

import { upsertPollInList } from './poll-service-cache.helpers';
import type { SupabaseSurveyRepository } from './supabase-survey.repository';

/**
 * Persists a multi-question survey and refreshes the cache.
 * @param input - Survey metadata and question graph to store.
 * @param polls - Mutable in-memory poll list.
 * @param repo - Supabase survey repository.
 * @param notify - List listener notification callback.
 * @returns The created survey with nested questions and options.
 */
export async function createSurveyInRepo(
  input: CreateSurveyInput,
  polls: Poll[],
  repo: SupabaseSurveyRepository,
  notify: () => void,
): Promise<Poll> {
  const created = await repo.createSurvey(input);
  upsertPollInList(polls, created);
  notify();
  return created;
}

/**
 * Maps a legacy single-question payload into a multi-question create input.
 * @param input - Legacy poll fields (title doubles as the single question prompt).
 * @returns Survey create payload with one question block.
 */
export function mapLegacyPollToSurveyInput(input: NewPollInput): CreateSurveyInput {
  return {
    title: input.title,
    description: input.description,
    category: input.category,
    deadline: input.deadline,
    questions: [
      {
        prompt: input.title,
        allowMultiple: false,
        answers: [...input.options],
      },
    ],
  };
}
