import type {
  CreateSurveyInput,
  NewPollInput,
  Poll,
  SurveyQuestion,
  VoterChoicesByQuestion,
} from '../types/poll';
import { findCachedPollById, upsertPollInList } from './poll-service-cache.helpers';
import {
  createSurveyInRepo,
  mapLegacyPollToSurveyInput,
} from './poll-service-create.helpers';
import {
  resolvePollDetail,
  resolveVoterChoices,
} from './poll-service-detail.helpers';
import { commitExamplePollToCache } from './poll-service-example-cache.helpers';
import { runChangeVoteOnQuestion } from './poll-service-change-vote.helpers';
import {
  runRetractVoteOnQuestion,
  runVoteOnQuestion,
} from './poll-service-vote.helpers';
import { loadPublishedPollList } from './poll-service-load.helpers';
import { reloadPollDetailFromRepo } from './poll-service-refresh.helpers';
import { subscribeToSurveyUpdates } from './poll-service-subscribe.helpers';
import {
  notifyPollListeners,
  notifySurveyListeners,
} from './poll-service-notify.helpers';
import {
  ensureRealtimeSubscription,
  teardownRealtimeSubscription,
} from './poll-service-realtime.helpers';
import {
  comparePollsByDeadline,
  getFirstSurveyQuestion,
  getQuestionVoteTotal as sumQuestionVotes,
  getTotalVotes as sumPollVotes,
  isPollEnded as pollHasEnded,
  listActivePolls,
  listEndingSoonPolls,
  listPastPolls,
} from './poll-service-poll.helpers';
import { SupabaseSurveyRepository } from './supabase-survey.repository';

type PollListener = (polls: ReadonlyArray<Poll>) => void;
type SurveyListener = () => void;

/** Facade over Supabase survey data for home, create, and vote flows. */
export class PollService {
  private polls: Poll[] = [];
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private readonly listeners: Set<PollListener> = new Set();
  private readonly surveyListeners = new Map<string, Set<SurveyListener>>();
  private readonly realtimeUnsubs = new Map<string, () => void>();
  private activeCategory: string | null = null;
  private readonly repo: SupabaseSurveyRepository;

  /**
   * Wires the repository used for all Supabase access.
   * @param repo - Repository that performs Supabase reads and writes.
   */
  public constructor(repo: SupabaseSurveyRepository) {
    this.repo = repo;
  }

  /**
   * Loads published surveys once before the home screen renders.
   * @remarks No-op when already initialized; concurrent callers await the same load promise.
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    if (this.initPromise === null) {
      this.initPromise = this.loadPublishedSurveys();
    }
    await this.initPromise;
  }

  /** Reloads the published survey list from Supabase. */
  public async refresh(): Promise<void> {
    await this.loadPublishedSurveys();
  }

  /**
   * Subscribes to poll list changes and returns an unsubscribe function.
   * @param listener - Callback invoked on subscribe and after each list update.
   * @returns Function that removes the listener.
   */
  public subscribe(listener: PollListener): () => void {
    this.listeners.add(listener);
    listener(this.polls);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Subscribes to live updates for one survey detail view.
   * @param surveyId - Survey id to watch.
   * @param listener - Callback invoked when that survey's data changes.
   * @returns Function that removes the listener and tears down realtime when unused.
   * @remarks Skips realtime for in-memory example polls.
   */
  public subscribeToSurvey(surveyId: string, listener: SurveyListener): () => void {
    return subscribeToSurveyUpdates(surveyId, listener, {
      surveyListeners: this.surveyListeners,
      findPollById: (pollId) => this.findPollById(pollId),
      ensureRealtimeSubscription: (id) => this.ensureRealtimeSubscription(id),
      teardownRealtimeSubscription: (id) => this.teardownRealtimeSubscription(id),
    });
  }

  /**
   * Sets the category filter for active/past lists; null clears the filter.
   * @param category - Category name to filter by, or null for all categories.
   */
  public setActiveCategory(category: string | null): void {
    if (this.activeCategory === category) {
      return;
    }
    this.activeCategory = category;
    this.notify();
  }

  /**
   * Returns the current category filter, or null if none.
   * @returns Active category filter, or null when showing all categories.
   */
  public getActiveCategory(): string | null {
    return this.activeCategory;
  }

  /**
   * Lists non-ended polls matching the category filter (sorted by deadline).
   * @returns Active polls sorted by nearest deadline first.
   */
  public getActivePolls(): ReadonlyArray<Poll> {
    return listActivePolls(this.polls, this.activeCategory);
  }

  /**
   * Lists ended polls matching the category filter (sorted by deadline).
   * @returns Past polls sorted by nearest deadline first.
   */
  public getPastPolls(): ReadonlyArray<Poll> {
    return listPastPolls(this.polls, this.activeCategory);
  }

  /**
   * Lists soon-ending active polls ignoring the category filter.
   * @returns Active polls whose deadline falls within the ending-soon window.
   */
  public getEndingSoonPolls(): ReadonlyArray<Poll> {
    return listEndingSoonPolls(this.polls);
  }

  /**
   * Looks up a poll by id from the in-memory cache.
   * @param pollId - Survey or example poll id.
   * @returns Cached poll, or undefined when not loaded.
   */
  public findPollById(pollId: string): Poll | undefined {
    return findCachedPollById(this.polls, pollId);
  }

  /**
   * Loads stored option choices for the current voter on one survey.
   * @param pollId - Survey or example poll id.
   * @returns Question id to selected option id lists; empty object when unavailable.
   * @remarks Example polls derive choices from local storage; returns `{}` when Supabase is offline.
   */
  public async loadVoterChoices(pollId: string): Promise<VoterChoicesByQuestion> {
    return resolveVoterChoices(pollId, this.detailLookupDeps());
  }

  /**
   * Loads full survey detail and merges it into the cache.
   * @param pollId - Survey or example poll id.
   * @returns Poll with question detail, or undefined when not found remotely.
   * @remarks Returns cached example polls as-is; fetches from Supabase only when detail is missing.
   */
  public async ensurePollDetail(pollId: string): Promise<Poll | undefined> {
    return resolvePollDetail(pollId, this.detailLookupDeps());
  }

  /**
   * True when the poll deadline has passed relative to reference time.
   * @param poll - Poll to check.
   * @param referenceTimeMs - Reference instant in milliseconds; defaults to now.
   * @returns True when the poll has a deadline on or before the reference time.
   */
  public isPollEnded(poll: Poll, referenceTimeMs: number = Date.now()): boolean {
    return pollHasEnded(poll, referenceTimeMs);
  }

  /**
   * Creates a legacy single-question poll in Supabase.
   * @param input - Legacy poll fields (title doubles as the single question prompt).
   * @returns The persisted survey as a full poll.
   * @beta Legacy bridge that wraps {@link createSurvey} with one question.
   */
  public async createPoll(input: NewPollInput): Promise<Poll> {
    return this.createSurvey(mapLegacyPollToSurveyInput(input));
  }

  /**
   * Persists a multi-question survey and refreshes the cache.
   * @param input - Survey metadata and question graph to store.
   * @returns The created survey with nested questions and options.
   */
  public async createSurvey(input: CreateSurveyInput): Promise<Poll> {
    const created = await createSurveyInRepo(input, this.polls, this.repo, () => this.notify());
    this.sortPollsByDeadline();
    return created;
  }

  /**
   * Records one vote on a question and reloads survey detail.
   * @param pollId - Target survey id.
   * @param questionId - Question receiving the vote.
   * @param optionId - Selected option id.
   * @returns Updated poll detail, or undefined when the poll is missing or ended.
   * @remarks Example polls update in-memory only; remote polls call Supabase RPC then reload.
   */
  public async voteOnQuestion(
    pollId: string,
    questionId: string,
    optionId: string,
  ): Promise<Poll | undefined> {
    return runVoteOnQuestion(pollId, questionId, optionId, this.voteMutationDeps());
  }

  /**
   * Removes one vote from a question and reloads survey detail.
   * @param pollId - Target survey id.
   * @param questionId - Question losing the vote.
   * @param optionId - Option id to retract.
   * @returns Updated poll detail, or undefined when the poll is missing, ended, or retraction fails.
   * @remarks Example polls update in-memory only; remote polls call Supabase RPC then reload.
   */
  public async retractVoteOnQuestion(
    pollId: string,
    questionId: string,
    optionId: string,
  ): Promise<Poll | undefined> {
    return runRetractVoteOnQuestion(pollId, questionId, optionId, this.voteMutationDeps());
  }

  /**
   * Moves one vote between options on the same question.
   * @param pollId - Target survey id.
   * @param questionId - Question whose vote is changing.
   * @param fromOptionId - Option id to retract.
   * @param toOptionId - Option id to cast.
   * @returns Updated poll detail, or undefined when the poll is missing or ended.
   * @remarks No-ops to cached detail when `fromOptionId` equals `toOptionId`.
   */
  public async changeVoteOnQuestion(
    pollId: string,
    questionId: string,
    fromOptionId: string,
    toOptionId: string,
  ): Promise<Poll | undefined> {
    if (fromOptionId === toOptionId) {
      return this.ensurePollDetail(pollId);
    }
    const poll = await this.ensurePollDetail(pollId);
    if (poll === undefined || this.isPollEnded(poll)) {
      return undefined;
    }
    return runChangeVoteOnQuestion(poll, pollId, questionId, fromOptionId, toOptionId, {
      retractVoteOnQuestion: (id, qId, opt) => this.retractVoteOnQuestion(id, qId, opt),
      voteOnQuestion: (id, qId, opt) => this.voteOnQuestion(id, qId, opt),
      commitExamplePoll: (updated) => this.commitExamplePoll(updated),
    });
  }

  /** Sums votes across all questions or legacy flat options. */
  public getTotalVotes(poll: Poll): number {
    return sumPollVotes(poll);
  }

  /** Sums votes for one question's options. */
  public getQuestionVoteTotal(question: SurveyQuestion): number {
    return sumQuestionVotes(question);
  }

  /** Returns the first question or undefined when detail is missing. */
  public getFirstQuestion(poll: Poll): SurveyQuestion | undefined {
    return getFirstSurveyQuestion(poll);
  }

  /** Supplies poll detail lookup helpers for cache and Supabase reads. */
  private detailLookupDeps() {
    return {
      findPollById: (pollId: string) => this.findPollById(pollId),
      repo: this.repo,
      upsertPoll: (poll: Poll) => this.upsertPoll(poll),
      notify: () => this.notify(),
    };
  }

  /** Supplies vote mutation helpers for cast, retract, and change flows. */
  private voteMutationDeps() {
    return {
      ensurePollDetail: (pollId: string) => this.ensurePollDetail(pollId),
      isPollEnded: (poll: Poll) => this.isPollEnded(poll),
      commitExamplePoll: (poll: Poll) => this.commitExamplePoll(poll),
      castRemoteVote: (pollId: string, questionId: string, optionId: string) =>
        this.repo.castVote(pollId, questionId, optionId),
      retractRemoteVote: (questionId: string, optionId: string) =>
        this.repo.retractVote(questionId, optionId),
      reloadPollDetail: (pollId: string) => this.reloadPollDetail(pollId),
    };
  }

  /** Pulls published surveys from Supabase into the cache. */
  private async loadPublishedSurveys(): Promise<void> {
    this.polls = [...(await loadPublishedPollList(this.repo))];
    this.sortPollsByDeadline();
    this.initialized = true;
    this.notify();
  }

  /** Stores an updated example poll and notifies listeners. */
  private commitExamplePoll(poll: Poll): Poll {
    return commitExamplePollToCache(
      poll,
      this.polls,
      () => this.notify(),
      (id) => this.notifySurvey(id),
    );
  }

  /** Reloads one survey and notifies detail listeners. */
  private async reloadPollDetail(pollId: string): Promise<Poll | undefined> {
    return reloadPollDetailFromRepo(
      pollId,
      this.repo,
      (poll) => this.upsertPoll(poll),
      () => this.notify(),
      (id) => this.notifySurvey(id),
    );
  }

  /** Inserts or replaces one poll in the cache. */
  private upsertPoll(poll: Poll): void {
    upsertPollInList(this.polls, poll);
  }

  /**
   * Sorts all polls: nearest end date first; no deadline last.
   */
  private sortPollsByDeadline(): void {
    this.polls.sort(comparePollsByDeadline);
  }

  /** Starts realtime listening when the first survey listener attaches. */
  private ensureRealtimeSubscription(surveyId: string): void {
    ensureRealtimeSubscription(
      surveyId,
      this.realtimeUnsubs,
      this.repo,
      (id) => {
        void this.handleRealtimeChange(id);
      },
    );
  }

  /** Stops realtime listening when no survey listeners remain. */
  private teardownRealtimeSubscription(surveyId: string): void {
    teardownRealtimeSubscription(surveyId, this.realtimeUnsubs);
  }

  /** Reloads survey detail after a realtime event. */
  private async handleRealtimeChange(surveyId: string): Promise<void> {
    await this.reloadPollDetail(surveyId);
    this.notifySurvey(surveyId);
  }

  /** Notifies all list subscribers with the latest polls array. */
  private notify(): void {
    notifyPollListeners(this.listeners, this.polls);
  }

  /** Notifies listeners bound to one survey route. */
  private notifySurvey(surveyId: string): void {
    notifySurveyListeners(this.surveyListeners, surveyId);
  }
}
