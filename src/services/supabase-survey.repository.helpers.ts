import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../types/database.types';
import type { CreateSurveyInput, VoterChoicesByQuestion } from '../types/poll';

type DbClient = SupabaseClient<Database>;

/**
 * Throws when Supabase returns a PostgREST or RPC error.
 * @param error - Supabase error object, or null when the call succeeded.
 */
export function throwOnSupabaseError(error: { message: string } | null): void {
  if (error !== null) {
    throw new Error(error.message);
  }
}

/**
 * Builds the insert payload for a new survey header row.
 * @param input - Survey metadata from the create form.
 * @returns Insert row for the `surveys` table with trimmed text and `published` status.
 */
export function buildSurveyInsertRow(
  input: CreateSurveyInput,
): Database['public']['Tables']['surveys']['Insert'] {
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    deadline: input.deadline === null ? null : input.deadline.toISOString(),
    status: 'published',
  };
}

/**
 * Builds the insert payload for one question row.
 * @param surveyId - Parent survey id.
 * @param question - Question prompt and answer labels from the create form.
 * @param sortOrder - One-based display order within the survey.
 * @returns Insert row for the `questions` table.
 */
export function buildQuestionInsertRow(
  surveyId: string,
  question: CreateSurveyInput['questions'][number],
  sortOrder: number,
): Database['public']['Tables']['questions']['Insert'] {
  return {
    survey_id: surveyId,
    sort_order: sortOrder,
    prompt: question.prompt.trim(),
    allow_multiple: question.allowMultiple,
  };
}

/**
 * Builds option insert rows for one question.
 * @param questionId - Parent question id.
 * @param answers - Answer label strings from the create form.
 * @returns Insert rows for `question_options` with one-based `sort_order`.
 */
export function buildOptionInsertRows(
  questionId: string,
  answers: ReadonlyArray<string>,
): Database['public']['Tables']['question_options']['Insert'][] {
  return answers.map((label, index) => ({
    question_id: questionId,
    sort_order: index + 1,
    label: label.trim(),
  }));
}

/**
 * Groups flat response rows into question → option id lists.
 * @param rows - `survey_responses` rows with `question_id` and `option_id`.
 * @returns Map of question id to selected option id arrays.
 */
export function groupResponsesByQuestion(
  rows: ReadonlyArray<{ question_id: string; option_id: string }>,
): VoterChoicesByQuestion {
  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    const existing = grouped.get(row.question_id) ?? [];
    existing.push(row.option_id);
    grouped.set(row.question_id, existing);
  }
  const result: Record<string, ReadonlyArray<string>> = {};
  for (const [questionId, optionIds] of grouped.entries()) {
    result[questionId] = optionIds;
  }
  return result;
}

/**
 * Subscribes to survey_responses changes for one survey.
 * @param client - Supabase browser client.
 * @param surveyId - Survey id to filter realtime events on.
 * @param onChange - Callback invoked on any insert, update, or delete.
 * @returns Subscribed realtime channel (caller must remove it on teardown).
 */
export function subscribeSurveyResponseChannel(
  client: DbClient,
  surveyId: string,
  onChange: () => void,
): RealtimeChannel {
  return client
    .channel(`survey-responses:${surveyId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'survey_responses',
        filter: `survey_id=eq.${surveyId}`,
      },
      () => onChange(),
    )
    .subscribe();
}
