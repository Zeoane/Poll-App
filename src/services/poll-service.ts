import type {
  CreateSurveyInput,
  NewPollInput,
  Poll,
  SurveyQuestion,
  VoterChoicesByQuestion,
} from '../types/poll';
import { buildExampleVoterChoices } from '../utils/voter-choices.helpers';

import { buildExamplePolls, isExamplePoll } from '../data/example-polls';

import {
  castExampleVote,
  changeExampleVote,
  retractExampleVote,
} from './poll-service-example-vote';
import { SupabaseSurveyRepository } from './supabase-survey.repository';

const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;
const ENDING_SOON_THRESHOLD_MS = 3 * DAY_IN_MS;

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
    const now = Date.now();
    return this.polls
      .filter((poll) => !this.isPollEnded(poll, now))
      .filter((poll) => this.matchesActiveCategory(poll));
  }

  /** Lists ended polls matching the category filter (sorted by deadline). */
  public getPastPolls(): ReadonlyArray<Poll> {
    const now = Date.now();
    return this.polls
      .filter((poll) => this.isPollEnded(poll, now))
      .filter((poll) => this.matchesActiveCategory(poll));
  }

  /** Lists soon-ending active polls ignoring the category filter. */
  public getEndingSoonPolls(): ReadonlyArray<Poll> {
    const now = Date.now();
    const threshold = now + ENDING_SOON_THRESHOLD_MS;
    return this.polls
      .filter((poll) => !this.isPollEnded(poll, now))
      .filter((poll) => this.isWithinWindow(poll, now, threshold));
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
    if (cached !== undefined && this.hasQuestionDetail(cached)) {
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
    if (poll.deadline === null) {
      return false;
    }
    return poll.deadline.getTime() <= referenceTimeMs;
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
    if (poll.questions !== undefined && poll.questions.length > 0) {
      return poll.questions.reduce(
        (sum, question) => sum + this.getQuestionVoteTotal(question),
        0,
      );
    }
    return poll.options.reduce((sum, option) => sum + option.votes, 0);
  }

  /** Sums votes for one question's options. */
  public getQuestionVoteTotal(question: SurveyQuestion): number {
    return question.options.reduce((sum, option) => sum + option.votes, 0);
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

  /** True when the poll category matches the active filter. */
  private matchesActiveCategory(poll: Poll): boolean {
    if (this.activeCategory === null) {
      return true;
    }
    return poll.category === this.activeCategory;
  }

  /** True when a poll already has nested question detail. */
  private hasQuestionDetail(poll: Poll): boolean {
    return poll.questions !== undefined && poll.questions.length > 0;
  }

  /** Inserts or replaces one poll in the cache. */
  private upsertPoll(poll: Poll): void {
    const index = this.polls.findIndex((entry) => entry.id === poll.id);
    if (index < 0) {
      this.polls.push(poll);
      return;
    }
    if (isExamplePoll(this.polls[index]) && !isExamplePoll(poll)) {
      return;
    }
    this.polls[index] = poll;
  }

  /** True when deadline lies strictly between now and threshold. */
  private isWithinWindow(poll: Poll, nowMs: number, thresholdMs: number): boolean {
    if (poll.deadline === null) {
      return false;
    }
    const deadlineMs = poll.deadline.getTime();
    return deadlineMs > nowMs && deadlineMs <= thresholdMs;
  }

  /** Sorts all polls: nearest end date first; no deadline last. */
  private sortPollsByDeadline(): void {
    this.polls.sort((a, b) => this.compareByDeadline(a, b));
  }

  /** Sorts by ascending deadline; missing deadlines go last. */
  private compareByDeadline(a: Poll, b: Poll): number {
    if (a.deadline === null && b.deadline === null) {
      return a.createdAt.getTime() - b.createdAt.getTime();
    }
    if (a.deadline === null) {
      return 1;
    }
    if (b.deadline === null) {
      return -1;
    }
    const byDeadline = a.deadline.getTime() - b.deadline.getTime();
    if (byDeadline !== 0) {
      return byDeadline;
    }
    return a.createdAt.getTime() - b.createdAt.getTime();
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
