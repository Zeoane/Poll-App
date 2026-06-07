import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../types/database.types';
import type { CreateSurveyInput, VoterChoicesByQuestion } from '../types/poll';

type DbClient = SupabaseClient<Database>;

/** Throws when Supabase returns a PostgREST or RPC error. */
export function throwOnSupabaseError(error: { message: string } | null): void {
  if (error !== null) {
    throw new Error(error.message);
  }
}

/** Builds the insert payload for a new survey header row. */
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

/** Builds the insert payload for one question row. */
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

/** Builds option insert rows for one question. */
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

/** Groups flat response rows into question → option id lists. */
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

/** Subscribes to survey_responses changes for one survey. */
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
