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

  /** Lists non-ended polls matching the category filter, sorted by deadline. */
  public getActivePolls(): ReadonlyArray<Poll> {
    const now = Date.now();
    return [...this.polls]
      .filter((poll) => !this.isPollEnded(poll, now))
      .filter((poll) => this.matchesActiveCategory(poll))
      .sort((a, b) => this.compareByDeadline(a, b));
  }

  /** Lists ended polls matching the category filter, newest deadline first. */
  public getPastPolls(): ReadonlyArray<Poll> {
    const now = Date.now();
    return [...this.polls]
      .filter((poll) => this.isPollEnded(poll, now))
      .filter((poll) => this.matchesActiveCategory(poll))
      .sort((a, b) => this.compareByDeadlineDescending(a, b));
  }

  /** Lists soon-ending active polls ignoring the category filter. */
  public getEndingSoonPolls(): ReadonlyArray<Poll> {
    const now = Date.now();
    const threshold = now + ENDING_SOON_THRESHOLD_MS;
    return [...this.polls]
      .filter((poll) => !this.isPollEnded(poll, now))
      .filter((poll) => this.isWithinWindow(poll, now, threshold))
      .sort((a, b) => this.compareByDeadline(a, b));
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
    this.polls = [newPoll, ...this.polls];
    this.notify();
    return newPoll;
  }

  /** Records one vote on an option when the poll is still open. */
  public vote(pollId: string, optionId: string): Poll | undefined {
    const poll = this.findPollById(pollId);
    if (poll === undefined || this.isPollEnded(poll)) {
      return undefined;
    }
    const updatedPoll: Poll = { ...poll, options: this.incrementVote(poll, optionId) };
    this.polls = this.polls.map((existing) =>
      existing.id === pollId ? updatedPoll : existing,
    );
    this.notify();
    return updatedPoll;
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

  /** Clones options, bumping votes for the matching option id. */
  private incrementVote(poll: Poll, optionId: string): ReadonlyArray<PollOption> {
    return poll.options.map((option) =>
      option.id === optionId ? { ...option, votes: option.votes + 1 } : option,
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

  /** Sorts by ascending deadline; missing deadlines go last. */
  private compareByDeadline(a: Poll, b: Poll): number {
    if (a.deadline === null && b.deadline === null) {
      return 0;
    }
    if (a.deadline === null) {
      return 1;
    }
    if (b.deadline === null) {
      return -1;
    }
    return a.deadline.getTime() - b.deadline.getTime();
  }

  /** Sorts by descending deadline timestamp. */
  private compareByDeadlineDescending(a: Poll, b: Poll): number {
    const aTime = a.deadline?.getTime() ?? 0;
    const bTime = b.deadline?.getTime() ?? 0;
    return bTime - aTime;
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
