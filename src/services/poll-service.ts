import type {
  CreateSurveyInput,
  NewPollInput,
  Poll,
  SurveyQuestion,
  VoterChoicesByQuestion,
} from '../types/poll';
import { buildExampleVoterChoices } from '../utils/voter-choices.helpers';

import { buildExamplePolls, isExamplePoll } from '../data/example-polls';

import { upsertPollInList, pollHasQuestionDetail } from './poll-service-cache.helpers';
import {
  castExampleVote,
  changeExampleVote,
  retractExampleVote,
} from './poll-service-example-vote';
import {
  comparePollsByDeadline,
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

  /** Wires the repository used for all Supabase access. */
  public constructor(repo: SupabaseSurveyRepository) {
    this.repo = repo;
  }

  /** Loads published surveys once before the home screen renders. */
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

  /** Subscribes to poll list changes and returns an unsubscribe function. */
  public subscribe(listener: PollListener): () => void {
    this.listeners.add(listener);
    listener(this.polls);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Subscribes to live updates for one survey detail view. */
  public subscribeToSurvey(surveyId: string, listener: SurveyListener): () => void {
    const listeners = this.surveyListeners.get(surveyId) ?? new Set<SurveyListener>();
    listeners.add(listener);
    this.surveyListeners.set(surveyId, listeners);
    if (!isExamplePoll(this.findPollById(surveyId))) {
      this.ensureRealtimeSubscription(surveyId);
    }
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.surveyListeners.delete(surveyId);
        this.teardownRealtimeSubscription(surveyId);
      }
    };
  }

  /** Sets the category filter for active/past lists; null clears the filter. */
  public setActiveCategory(category: string | null): void {
    if (this.activeCategory === category) {
      return;
    }
    this.activeCategory = category;
    this.notify();
  }

  /** Returns the current category filter, or null if none. */
  public getActiveCategory(): string | null {
    return this.activeCategory;
  }

  /** Lists non-ended polls matching the category filter (sorted by deadline). */
  public getActivePolls(): ReadonlyArray<Poll> {
    return listActivePolls(this.polls, this.activeCategory);
  }

  /** Lists ended polls matching the category filter (sorted by deadline). */
  public getPastPolls(): ReadonlyArray<Poll> {
    return listPastPolls(this.polls, this.activeCategory);
  }

  /** Lists soon-ending active polls ignoring the category filter. */
  public getEndingSoonPolls(): ReadonlyArray<Poll> {
    return listEndingSoonPolls(this.polls);
  }

  /** Looks up a poll by id from the in-memory cache. */
  public findPollById(pollId: string): Poll | undefined {
    return this.polls.find((poll) => poll.id === pollId);
  }

  /** Loads stored option choices for the current voter on one survey. */
  public async loadVoterChoices(pollId: string): Promise<VoterChoicesByQuestion> {
    const poll = await this.ensurePollDetail(pollId);
    if (poll === undefined) {
      return {};
    }
    if (isExamplePoll(poll)) {
      return buildExampleVoterChoices(poll);
    }
    if (!this.repo.isAvailable()) {
      return {};
    }
    return this.repo.fetchVoterResponses(pollId);
  }

  /** Loads full survey detail and merges it into the cache. */
  public async ensurePollDetail(pollId: string): Promise<Poll | undefined> {
    const cached = this.findPollById(pollId);
    if (isExamplePoll(cached)) {
      return cached;
    }
    if (cached !== undefined && pollHasQuestionDetail(cached)) {
      return cached;
    }
    if (!this.repo.isAvailable()) {
      return cached;
    }
    const detail = await this.repo.fetchSurveyDetail(pollId);
    if (detail === null) {
      return undefined;
    }
    this.upsertPoll(detail);
    this.notify();
    return detail;
  }

  /** True when the poll deadline has passed relative to reference time. */
  public isPollEnded(poll: Poll, referenceTimeMs: number = Date.now()): boolean {
    return pollHasEnded(poll, referenceTimeMs);
  }

  /** Creates a legacy single-question poll in Supabase. */
  public async createPoll(input: NewPollInput): Promise<Poll> {
    return this.createSurvey({
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
    });
  }

  /** Persists a multi-question survey and refreshes the cache. */
  public async createSurvey(input: CreateSurveyInput): Promise<Poll> {
    const created = await this.repo.createSurvey(input);
    this.upsertPoll(created);
    this.sortPollsByDeadline();
    this.notify();
    return created;
  }

  /** Records one vote on a question and reloads survey detail. */
  public async voteOnQuestion(
    pollId: string,
    questionId: string,
    optionId: string,
  ): Promise<Poll | undefined> {
    const poll = await this.ensurePollDetail(pollId);
    if (poll === undefined || this.isPollEnded(poll)) {
      return undefined;
    }
    if (isExamplePoll(poll)) {
      return this.commitExamplePoll(castExampleVote(poll, questionId, optionId));
    }
    await this.repo.castVote(pollId, questionId, optionId);
    return this.reloadPollDetail(pollId);
  }

  /** Removes one vote from a question and reloads survey detail. */
  public async retractVoteOnQuestion(
    pollId: string,
    questionId: string,
    optionId: string,
  ): Promise<Poll | undefined> {
    const poll = await this.ensurePollDetail(pollId);
    if (poll === undefined || this.isPollEnded(poll)) {
      return undefined;
    }
    if (isExamplePoll(poll)) {
      const updated = retractExampleVote(poll, questionId, optionId);
      return updated === undefined ? undefined : this.commitExamplePoll(updated);
    }
    await this.repo.retractVote(questionId, optionId);
    return this.reloadPollDetail(pollId);
  }

  /** Moves one vote between options on the same question. */
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
    if (isExamplePoll(poll)) {
      const updated = changeExampleVote(poll, questionId, fromOptionId, toOptionId);
      return updated === undefined ? undefined : this.commitExamplePoll(updated);
    }
    const retracted = await this.retractVoteOnQuestion(pollId, questionId, fromOptionId);
    if (retracted === undefined) {
      return undefined;
    }
    return this.voteOnQuestion(pollId, questionId, toOptionId);
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
    return poll.questions?.[0];
  }

  /** Pulls published surveys from Supabase into the cache. */
  private async loadPublishedSurveys(): Promise<void> {
    const examples = [...buildExamplePolls()];
    if (!this.repo.isAvailable()) {
      this.polls = examples;
      this.sortPollsByDeadline();
      this.initialized = true;
      this.notify();
      return;
    }
    const remote = await this.repo.fetchPublishedSurveys();
    this.polls = [...remote, ...examples];
    this.sortPollsByDeadline();
    this.initialized = true;
    this.notify();
  }

  /** Stores an updated example poll and notifies listeners. */
  private commitExamplePoll(poll: Poll): Poll {
    this.upsertPoll(poll);
    this.notify();
    this.notifySurvey(poll.id);
    return poll;
  }

  /** Reloads one survey and notifies detail listeners. */
  private async reloadPollDetail(pollId: string): Promise<Poll | undefined> {
    const detail = await this.repo.fetchSurveyDetail(pollId);
    if (detail === null) {
      return undefined;
    }
    this.upsertPoll(detail);
    this.notify();
    this.notifySurvey(pollId);
    return detail;
  }

  /** Inserts or replaces one poll in the cache. */
  private upsertPoll(poll: Poll): void {
    upsertPollInList(this.polls, poll);
  }

  /** Sorts all polls: nearest end date first; no deadline last. */
  private sortPollsByDeadline(): void {
    this.polls.sort(comparePollsByDeadline);
  }

  /** Starts realtime listening when the first survey listener attaches. */
  private ensureRealtimeSubscription(surveyId: string): void {
    if (this.realtimeUnsubs.has(surveyId)) {
      return;
    }
    const unsubscribe = this.repo.subscribeToSurveyResponses(surveyId, () => {
      void this.handleRealtimeChange(surveyId);
    });
    this.realtimeUnsubs.set(surveyId, unsubscribe);
  }

  /** Stops realtime listening when no survey listeners remain. */
  private teardownRealtimeSubscription(surveyId: string): void {
    const unsubscribe = this.realtimeUnsubs.get(surveyId);
    if (unsubscribe === undefined) {
      return;
    }
    unsubscribe();
    this.realtimeUnsubs.delete(surveyId);
  }

  /** Reloads survey detail after a realtime event. */
  private async handleRealtimeChange(surveyId: string): Promise<void> {
    await this.reloadPollDetail(surveyId);
    this.notifySurvey(surveyId);
  }

  /** Notifies all list subscribers with the latest polls array. */
  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.polls);
    }
  }

  /** Notifies listeners bound to one survey route. */
  private notifySurvey(surveyId: string): void {
    const listeners = this.surveyListeners.get(surveyId);
    if (listeners === undefined) {
      return;
    }
    for (const listener of listeners) {
      listener();
    }
  }
}
