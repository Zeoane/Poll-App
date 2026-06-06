import type { NewPollInput, Poll, PollOption } from '../types/poll';

const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;
const ENDING_SOON_THRESHOLD_MS = 3 * DAY_IN_MS;
const ID_RADIX = 36;
const RANDOM_ID_LENGTH = 8;

type PollListener = (polls: ReadonlyArray<Poll>) => void;

export class PollService {
  private polls: Poll[];
  private readonly listeners: Set<PollListener> = new Set();
  private activeCategory: string | null = null;

  /** Seeds the service with an initial poll snapshot. */
  public constructor(initialPolls: ReadonlyArray<Poll>) {
    this.polls = [...initialPolls];
    this.sortPollsByDeadline();
  }

  /** Subscribes to poll list changes and returns an unsubscribe function. */
  public subscribe(listener: PollListener): () => void {
    this.listeners.add(listener);
    listener(this.polls);
    return this.createUnsubscribe(listener);
  }

  /** Builds a callback that removes one listener from the notification set. */
  private createUnsubscribe(listener: PollListener): () => void {
    return () => {
      this.listeners.delete(listener);
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

  /** Lists soon-ending active polls ignoring the category filter (sorted by deadline). */
  public getEndingSoonPolls(): ReadonlyArray<Poll> {
    const now = Date.now();
    const threshold = now + ENDING_SOON_THRESHOLD_MS;
    return this.polls
      .filter((poll) => !this.isPollEnded(poll, now))
      .filter((poll) => this.isWithinWindow(poll, now, threshold));
  }

  /** True when the poll category matches the active filter (or filter is off). */
  private matchesActiveCategory(poll: Poll): boolean {
    if (this.activeCategory === null) {
      return true;
    }
    return poll.category === this.activeCategory;
  }

  /** Looks up a poll by id. */
  public findPollById(pollId: string): Poll | undefined {
    return this.polls.find((poll) => poll.id === pollId);
  }

  /** True when the poll deadline has passed relative to reference time. */
  public isPollEnded(poll: Poll, referenceTimeMs: number = Date.now()): boolean {
    if (poll.deadline === null) {
      return false;
    }
    return poll.deadline.getTime() <= referenceTimeMs;
  }

  /** Adds a poll at the front of the list and notifies subscribers. */
  public createPoll(input: NewPollInput): Poll {
    const newPoll: Poll = {
      id: this.generateId('poll'),
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      options: input.options.map((label, index) => this.buildOption(label, index)),
      createdAt: new Date(),
      deadline: input.deadline,
    };
    this.polls.push(newPoll);
    this.sortPollsByDeadline();
    this.notify();
    return newPoll;
  }

  /** Records one vote on an option when the poll is still open. */
  public vote(pollId: string, optionId: string): Poll | undefined {
    const poll = this.findPollById(pollId);
    if (poll === undefined || this.isPollEnded(poll)) {
      return undefined;
    }
    const updatedPoll: Poll = { ...poll, options: this.adjustVote(poll, optionId, 1) };
    this.replacePoll(updatedPoll);
    return updatedPoll;
  }

  /** Removes one vote from an option when the poll is still open. */
  public retractVote(pollId: string, optionId: string): Poll | undefined {
    const poll = this.findPollById(pollId);
    if (poll === undefined || this.isPollEnded(poll)) {
      return undefined;
    }
    const option = poll.options.find((entry) => entry.id === optionId);
    if (option === undefined || option.votes <= 0) {
      return undefined;
    }
    const updatedPoll: Poll = { ...poll, options: this.adjustVote(poll, optionId, -1) };
    this.replacePoll(updatedPoll);
    return updatedPoll;
  }

  /** Moves one vote from a previous option to a new one when the poll is still open. */
  public changeVote(
    pollId: string,
    fromOptionId: string,
    toOptionId: string,
  ): Poll | undefined {
    const poll = this.findPollById(pollId);
    if (poll === undefined || this.isPollEnded(poll)) {
      return undefined;
    }
    const updatedPoll = this.buildPollWithTransferredVote(
      poll,
      fromOptionId,
      toOptionId,
    );
    if (updatedPoll === undefined) {
      return undefined;
    }
    this.replacePoll(updatedPoll);
    return updatedPoll;
  }

  /** Builds a poll copy with one vote moved between two options. */
  private buildPollWithTransferredVote(
    poll: Poll,
    fromOptionId: string,
    toOptionId: string,
  ): Poll | undefined {
    if (fromOptionId === toOptionId) {
      return poll;
    }
    const fromOption = poll.options.find((entry) => entry.id === fromOptionId);
    if (fromOption === undefined || fromOption.votes <= 0) {
      return undefined;
    }
    const retracted = this.adjustVote(poll, fromOptionId, -1);
    return {
      ...poll,
      options: retracted.map((option) =>
        option.id === toOptionId ? { ...option, votes: option.votes + 1 } : option,
      ),
    };
  }

  /** Sums votes across all options of a poll. */
  public getTotalVotes(poll: Poll): number {
    return poll.options.reduce((sum, option) => sum + option.votes, 0);
  }

  /** Creates a poll option node with zero votes. */
  private buildOption(label: string, index: number): PollOption {
    return {
      id: this.generateId(`opt-${index}`),
      label: label.trim(),
      votes: 0,
    };
  }

  /** Clones options, adjusting votes for the matching option id (not below zero). */
  private adjustVote(
    poll: Poll,
    optionId: string,
    delta: number,
  ): ReadonlyArray<PollOption> {
    return poll.options.map((option) =>
      option.id === optionId
        ? { ...option, votes: Math.max(0, option.votes + delta) }
        : option,
    );
  }

  /** True when deadline lies strictly between now and threshold. */
  private isWithinWindow(poll: Poll, nowMs: number, thresholdMs: number): boolean {
    if (poll.deadline === null) {
      return false;
    }
    const deadlineMs = poll.deadline.getTime();
    return deadlineMs > nowMs && deadlineMs <= thresholdMs;
  }

  /** Replaces one poll and keeps the list sorted by deadline. */
  private replacePoll(updatedPoll: Poll): void {
    this.polls = this.polls.map((existing) =>
      existing.id === updatedPoll.id ? updatedPoll : existing,
    );
    this.sortPollsByDeadline();
    this.notify();
  }

  /** Sorts all polls: nearest end date first; no deadline last; ties by createdAt. */
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

  /** Notifies all subscribers with the latest polls array. */
  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.polls);
    }
  }

  /** Generates a prefixed id with time and random parts. */
  private generateId(prefix: string): string {
    const random = Math.random().toString(ID_RADIX).slice(2, 2 + RANDOM_ID_LENGTH);
    return `${prefix}-${Date.now().toString(ID_RADIX)}-${random}`;
  }
}
