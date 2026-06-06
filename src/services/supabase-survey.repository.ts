import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../types/database.types';
import type { CreateSurveyInput, Poll, VoterChoicesByQuestion } from '../types/poll';
import { getVoterToken } from '../utils/voter-token';

import {
  mapSurveyDetailToPoll,
  mapSurveyRowToListPoll,
} from './supabase-survey.mapper';

type DbClient = SupabaseClient<Database>;
type ClientGetter = () => DbClient | null;

/** Loads and mutates survey data through the Supabase browser client. */
export class SupabaseSurveyRepository {
  private readonly getClient: ClientGetter;

  /** Stores the client getter used for each repository call. */
  public constructor(getClient: ClientGetter) {
    this.getClient = getClient;
  }

  /** Lists published surveys for the home screen. */
  public async fetchPublishedSurveys(): Promise<ReadonlyArray<Poll>> {
    return this.fetchSurveysByStatus('published');
  }

  /** Loads option ids the current voter chose on one survey. */
  public async fetchVoterResponses(surveyId: string): Promise<VoterChoicesByQuestion> {
    const client = this.requireClient();
    const { data, error } = await client
      .from('survey_responses')
      .select('question_id, option_id')
      .eq('survey_id', surveyId)
      .eq('voter_token', getVoterToken());
    if (error !== null) {
      throw new Error(error.message);
    }
    return groupResponsesByQuestion(data ?? []);
  }

  /** Loads one survey with questions, options, and vote stats. */
  public async fetchSurveyDetail(surveyId: string): Promise<Poll | null> {
    const client = this.requireClient();
    const survey = await this.fetchSurveyRow(client, surveyId);
    if (survey === null) {
      return null;
    }
    const questions = await this.fetchQuestionRows(client, surveyId);
    const options = await this.fetchOptionRows(client, questions);
    const stats = await this.fetchResultStats(client, surveyId);
    return mapSurveyDetailToPoll(survey, questions, options, stats);
  }

  /** Persists a full survey graph and returns the stored detail. */
  public async createSurvey(input: CreateSurveyInput): Promise<Poll> {
    const client = this.requireClient();
    const surveyId = await this.insertSurveyRow(client, input);
    await this.insertQuestionGraph(client, surveyId, input.questions);
    const detail = await this.fetchSurveyDetail(surveyId);
    if (detail === null) {
      throw new Error('Created survey could not be loaded.');
    }
    return detail;
  }

  /** Records one vote through the cast_survey_vote RPC. */
  public async castVote(
    surveyId: string,
    questionId: string,
    optionId: string,
  ): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.rpc('cast_survey_vote', {
      p_survey_id: surveyId,
      p_question_id: questionId,
      p_option_id: optionId,
      p_voter_token: getVoterToken(),
    });
    if (error !== null) {
      throw new Error(error.message);
    }
  }

  /** Removes one vote through the retract_survey_vote RPC. */
  public async retractVote(questionId: string, optionId: string): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.rpc('retract_survey_vote', {
      p_question_id: questionId,
      p_option_id: optionId,
      p_voter_token: getVoterToken(),
    });
    if (error !== null) {
      throw new Error(error.message);
    }
  }

  /** Subscribes to response changes for one survey. */
  public subscribeToSurveyResponses(
    surveyId: string,
    onChange: () => void,
  ): () => void {
    const client = this.getClient();
    if (client === null) {
      return () => undefined;
    }
    const channel = client
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
    return () => {
      void client.removeChannel(channel);
    };
  }

  /** True when a Supabase client is available. */
  public isAvailable(): boolean {
    return this.getClient() !== null;
  }

  /** Returns the client or throws when Supabase is not configured. */
  private requireClient(): DbClient {
    const client = this.getClient();
    if (client === null) {
      throw new Error('Supabase client is not configured.');
    }
    return client;
  }

  /** Lists surveys filtered by publication status. */
  private async fetchSurveysByStatus(status: 'published'): Promise<ReadonlyArray<Poll>> {
    const client = this.requireClient();
    const { data, error } = await client
      .from('surveys')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    if (error !== null) {
      throw new Error(error.message);
    }
    return (data ?? []).map(mapSurveyRowToListPoll);
  }

  /** Loads one survey row by id. */
  private async fetchSurveyRow(
    client: DbClient,
    surveyId: string,
  ): Promise<Database['public']['Tables']['surveys']['Row'] | null> {
    const { data, error } = await client
      .from('surveys')
      .select('*')
      .eq('id', surveyId)
      .maybeSingle();
    if (error !== null) {
      throw new Error(error.message);
    }
    return data;
  }

  /** Loads all questions for one survey. */
  private async fetchQuestionRows(
    client: DbClient,
    surveyId: string,
  ): Promise<ReadonlyArray<Database['public']['Tables']['questions']['Row']>> {
    const { data, error } = await client
      .from('questions')
      .select('*')
      .eq('survey_id', surveyId)
      .order('sort_order', { ascending: true });
    if (error !== null) {
      throw new Error(error.message);
    }
    return data ?? [];
  }

  /** Loads options for the given question ids. */
  private async fetchOptionRows(
    client: DbClient,
    questions: ReadonlyArray<Database['public']['Tables']['questions']['Row']>,
  ): Promise<ReadonlyArray<Database['public']['Tables']['question_options']['Row']>> {
    const questionIds = questions.map((question) => question.id);
    if (questionIds.length === 0) {
      return [];
    }
    const { data, error } = await client
      .from('question_options')
      .select('*')
      .in('question_id', questionIds)
      .order('sort_order', { ascending: true });
    if (error !== null) {
      throw new Error(error.message);
    }
    return data ?? [];
  }

  /** Loads aggregated vote stats for one survey. */
  private async fetchResultStats(
    client: DbClient,
    surveyId: string,
  ): Promise<ReadonlyArray<Database['public']['Views']['question_result_stats']['Row']>> {
    const { data, error } = await client
      .from('question_result_stats')
      .select('*')
      .eq('survey_id', surveyId);
    if (error !== null) {
      throw new Error(error.message);
    }
    return data ?? [];
  }

  /** Inserts the survey header row and returns its id. */
  private async insertSurveyRow(
    client: DbClient,
    input: CreateSurveyInput,
  ): Promise<string> {
    const { data, error } = await client
      .from('surveys')
      .insert({
        title: input.title.trim(),
        description: input.description.trim(),
        category: input.category,
        deadline: input.deadline === null ? null : input.deadline.toISOString(),
        status: 'published',
      })
      .select('id')
      .single();
    if (error !== null) {
      throw new Error(error.message);
    }
    return data.id;
  }

  /** Inserts all questions and options for one survey. */
  private async insertQuestionGraph(
    client: DbClient,
    surveyId: string,
    questions: CreateSurveyInput['questions'],
  ): Promise<void> {
    for (const [index, question] of questions.entries()) {
      await this.insertQuestionWithOptions(client, surveyId, question, index + 1);
    }
  }

  /** Inserts one question row and its answer options. */
  private async insertQuestionWithOptions(
    client: DbClient,
    surveyId: string,
    question: CreateSurveyInput['questions'][number],
    sortOrder: number,
  ): Promise<void> {
    const { data, error } = await client
      .from('questions')
      .insert({
        survey_id: surveyId,
        sort_order: sortOrder,
        prompt: question.prompt.trim(),
        allow_multiple: question.allowMultiple,
      })
      .select('id')
      .single();
    if (error !== null) {
      throw new Error(error.message);
    }
    await this.insertOptionRows(client, data.id, question.answers);
  }

  /** Inserts answer options for one question. */
  private async insertOptionRows(
    client: DbClient,
    questionId: string,
    answers: ReadonlyArray<string>,
  ): Promise<void> {
    const rows = answers.map((label, index) => ({
      question_id: questionId,
      sort_order: index + 1,
      label: label.trim(),
    }));
    if (rows.length === 0) {
      return;
    }
    const { error } = await client.from('question_options').insert(rows);
    if (error !== null) {
      throw new Error(error.message);
    }
  }
}

/** Groups flat response rows into question → option id lists. */
function groupResponsesByQuestion(
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
