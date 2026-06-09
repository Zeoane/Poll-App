import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../types/database.types';
import type { CreateSurveyInput, Poll, VoterChoicesByQuestion } from '../types/poll';
import { getVoterToken } from '../utils/voter-token';

import {
  mapSurveyDetailToPoll,
  mapSurveyRowToListPoll,
} from './supabase-survey.mapper';
import {
  buildOptionInsertRows,
  buildQuestionInsertRow,
  buildSurveyInsertRow,
  groupResponsesByQuestion,
  subscribeSurveyResponseChannel,
  throwOnSupabaseError,
} from './supabase-survey.repository.helpers';

type DbClient = SupabaseClient<Database>;
type ClientGetter = () => DbClient | null;

/** Loads and mutates survey data through the Supabase browser client. */
export class SupabaseSurveyRepository {
  private readonly getClient: ClientGetter;

  /**
   * Stores the client getter used for each repository call.
   * @param getClient - Lazy accessor for the shared Supabase client.
   */
  public constructor(getClient: ClientGetter) {
    this.getClient = getClient;
  }

  /**
   * Lists published surveys for the home screen.
   * @returns Published surveys as list-level polls without question detail.
   */
  public async fetchPublishedSurveys(): Promise<ReadonlyArray<Poll>> {
    return this.fetchSurveysByStatus('published');
  }

  /**
   * Loads option ids the current voter chose on one survey.
   * @param surveyId - Survey id to query responses for.
   * @returns Question id to selected option id lists for the current voter token.
   */
  public async fetchVoterResponses(surveyId: string): Promise<VoterChoicesByQuestion> {
    const client = this.requireClient();
    const { data, error } = await client
      .from('survey_responses')
      .select('question_id, option_id')
      .eq('survey_id', surveyId)
      .eq('voter_token', getVoterToken());
    throwOnSupabaseError(error);
    return groupResponsesByQuestion(data ?? []);
  }

  /**
   * Loads one survey with questions, options, and vote stats.
   * @param surveyId - Survey id to load.
   * @returns Full poll detail, or null when the survey row does not exist.
   */
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

  /**
   * Persists a full survey graph and returns the stored detail.
   * @param input - Survey metadata and question graph from the create form.
   * @returns Reloaded poll with nested questions and options.
   */
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

  /**
   * Records one vote through the cast_survey_vote RPC.
   * @param surveyId - Target survey id.
   * @param questionId - Question receiving the vote.
   * @param optionId - Selected option id.
   */
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
    throwOnSupabaseError(error);
  }

  /**
   * Removes one vote through the retract_survey_vote RPC.
   * @param questionId - Question losing the vote.
   * @param optionId - Option id to retract.
   */
  public async retractVote(questionId: string, optionId: string): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.rpc('retract_survey_vote', {
      p_question_id: questionId,
      p_option_id: optionId,
      p_voter_token: getVoterToken(),
    });
    throwOnSupabaseError(error);
  }

  /**
   * Subscribes to response changes for one survey.
   * @param surveyId - Survey id to watch via realtime.
   * @param onChange - Callback invoked on any `survey_responses` change.
   * @returns Unsubscribe function that removes the realtime channel.
   * @remarks Returns a no-op unsubscribe when the Supabase client is unavailable.
   */
  public subscribeToSurveyResponses(
    surveyId: string,
    onChange: () => void,
  ): () => void {
    const client = this.getClient();
    if (client === null) {
      return () => undefined;
    }
    const channel = subscribeSurveyResponseChannel(client, surveyId, onChange);
    return () => {
      void client.removeChannel(channel);
    };
  }

  /**
   * True when a Supabase client is available.
   * @returns True when `getClient()` returns a non-null client.
   */
  public isAvailable(): boolean {
    return this.getClient() !== null;
  }

  /**
   * Returns the client or throws when Supabase is not configured.
   * @returns Active Supabase browser client.
   */
  private requireClient(): DbClient {
    const client = this.getClient();
    if (client === null) {
      throw new Error('Supabase client is not configured.');
    }
    return client;
  }

  /**
   * Lists surveys filtered by publication status.
   * @param status - Survey status to filter on (currently `published` only).
   * @returns Matching surveys as list-level polls, newest first.
   */
  private async fetchSurveysByStatus(status: 'published'): Promise<ReadonlyArray<Poll>> {
    const client = this.requireClient();
    const { data, error } = await client
      .from('surveys')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    throwOnSupabaseError(error);
    return (data ?? []).map(mapSurveyRowToListPoll);
  }

  /**
   * Loads one survey row by id.
   * @param client - Supabase client for the query.
   * @param surveyId - Survey id to fetch.
   * @returns Survey row, or null when no row matches.
   */
  private async fetchSurveyRow(
    client: DbClient,
    surveyId: string,
  ): Promise<Database['public']['Tables']['surveys']['Row'] | null> {
    const { data, error } = await client
      .from('surveys')
      .select('*')
      .eq('id', surveyId)
      .maybeSingle();
    throwOnSupabaseError(error);
    return data;
  }

  /**
   * Loads all questions for one survey.
   * @param client - Supabase client for the query.
   * @param surveyId - Parent survey id.
   * @returns Question rows sorted by `sort_order` ascending.
   */
  private async fetchQuestionRows(
    client: DbClient,
    surveyId: string,
  ): Promise<ReadonlyArray<Database['public']['Tables']['questions']['Row']>> {
    const { data, error } = await client
      .from('questions')
      .select('*')
      .eq('survey_id', surveyId)
      .order('sort_order', { ascending: true });
    throwOnSupabaseError(error);
    return data ?? [];
  }

  /**
   * Loads options for the given question ids.
   * @param client - Supabase client for the query.
   * @param questions - Question rows whose options to load.
   * @returns Option rows sorted by `sort_order`; empty when there are no questions.
   */
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
    throwOnSupabaseError(error);
    return data ?? [];
  }

  /**
   * Loads aggregated vote stats for one survey.
   * @param client - Supabase client for the query.
   * @param surveyId - Survey id to load stats for.
   * @returns Rows from the `question_result_stats` view.
   */
  private async fetchResultStats(
    client: DbClient,
    surveyId: string,
  ): Promise<ReadonlyArray<Database['public']['Views']['question_result_stats']['Row']>> {
    const { data, error } = await client
      .from('question_result_stats')
      .select('*')
      .eq('survey_id', surveyId);
    throwOnSupabaseError(error);
    return data ?? [];
  }

  /**
   * Inserts the survey header row and returns its id.
   * @param client - Supabase client for the insert.
   * @param input - Survey metadata from the create form.
   * @returns Id of the newly inserted survey row.
   */
  private async insertSurveyRow(
    client: DbClient,
    input: CreateSurveyInput,
  ): Promise<string> {
    const { data, error } = await client
      .from('surveys')
      .insert(buildSurveyInsertRow(input))
      .select('id')
      .single();
    throwOnSupabaseError(error);
    if (data === null) {
      throw new Error('Survey insert returned no row.');
    }
    return data.id;
  }

  /**
   * Inserts all questions and options for one survey.
   * @param client - Supabase client for the inserts.
   * @param surveyId - Parent survey id.
   * @param questions - Question graph from the create form.
   */
  private async insertQuestionGraph(
    client: DbClient,
    surveyId: string,
    questions: CreateSurveyInput['questions'],
  ): Promise<void> {
    for (const [index, question] of questions.entries()) {
      await this.insertQuestionWithOptions(client, surveyId, question, index + 1);
    }
  }

  /**
   * Inserts one question row and its answer options.
   * @param client - Supabase client for the inserts.
   * @param surveyId - Parent survey id.
   * @param question - One question from the create form.
   * @param sortOrder - One-based display order within the survey.
   */
  private async insertQuestionWithOptions(
    client: DbClient,
    surveyId: string,
    question: CreateSurveyInput['questions'][number],
    sortOrder: number,
  ): Promise<void> {
    const { data, error } = await client
      .from('questions')
      .insert(buildQuestionInsertRow(surveyId, question, sortOrder))
      .select('id')
      .single();
    throwOnSupabaseError(error);
    if (data === null) {
      throw new Error('Question insert returned no row.');
    }
    await this.insertOptionRows(client, data.id, question.answers);
  }

  /**
   * Inserts answer options for one question.
   * @param client - Supabase client for the insert.
   * @param questionId - Parent question id.
   * @param answers - Answer label strings from the create form.
   */
  private async insertOptionRows(
    client: DbClient,
    questionId: string,
    answers: ReadonlyArray<string>,
  ): Promise<void> {
    const rows = buildOptionInsertRows(questionId, answers);
    if (rows.length === 0) {
      return;
    }
    const { error } = await client.from('question_options').insert(rows);
    throwOnSupabaseError(error);
  }
}
