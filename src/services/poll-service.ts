import type { NewPollInput, Poll, PollOption } from '../types/poll';

const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;
/** Look-ahead window (ms) for polls in the “ending soon” highlight row. */
const ENDING_SOON_THRESHOLD_MS = 3 * DAY_IN_MS;
const ID_RADIX = 36;
const RANDOM_ID_LENGTH = 8;

type PollListener = (polls: ReadonlyArray<Poll>) => void;

/** Manages poll state and exposes filtering, sorting, creation, and voting. */
export class PollService {
  private polls: Poll[];
  private readonly listeners: Set<PollListener> = new Set();
  /** Current category filter applied to active and past poll lists. */
  private activeCategory: string | null = null;

  public constructor(initialPolls: ReadonlyArray<Poll>) {
    this.polls = [...initialPolls];
  }

  /** Registers a listener and returns its unsubscribe function. */
  public subscribe(listener: PollListener): () => void {
    this.listeners.add(listener);
    listener(this.polls);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Sets the active/past list filter; `null` clears. Ending-soon row ignores this. */
  public setActiveCategory(category: string | null): void {
    if (this.activeCategory === category) {
      return;
    }
    this.activeCategory = category;
    this.notify();
  }

  /** Returns the currently selected category filter, or `null` when none. */
  public getActiveCategory(): string | null {
    return this.activeCategory;
  }

  /** Returns active polls sorted by deadline, polls without deadline last. */
  public getActivePolls(): ReadonlyArray<Poll> {
    const now = Date.now();
    return [...this.polls]
      .filter((poll) => !this.isPollEnded(poll, now))
      .filter((poll) => this.matchesActiveCategory(poll))
      .sort(this.compareByDeadline);
  }

  /** Returns ended polls, most recently ended first. */
  public getPastPolls(): ReadonlyArray<Poll> {
    const now = Date.now();
    return [...this.polls]
      .filter((poll) => this.isPollEnded(poll, now))
      .filter((poll) => this.matchesActiveCategory(poll))
      .sort(this.compareByDeadlineDescending);
  }

  /** Active polls in the configured ending-soon window; ignores category filter. */
  public getEndingSoonPolls(): ReadonlyArray<Poll> {
    const now = Date.now();
    const threshold = now + ENDING_SOON_THRESHOLD_MS;
    return [...this.polls]
      .filter((poll) => !this.isPollEnded(poll, now))
      .filter((poll) => this.isWithinWindow(poll, now, threshold))
      .sort(this.compareByDeadline);
  }

  /** Returns whether the poll matches the current category filter. */
  private matchesActiveCategory(poll: Poll): boolean {
    if (this.activeCategory === null) {
      return true;
    }
    return poll.category === this.activeCategory;
  }

  /** Finds a poll by its ID, or returns undefined when no match exists. */
  public findPollById(pollId: string): Poll | undefined {
    return this.polls.find((poll) => poll.id === pollId);
  }

  /** Returns whether the poll has reached its deadline. */
  public isPollEnded(poll: Poll, referenceTimeMs: number = Date.now()): boolean {
    if (poll.deadline === null) {
      return false;
    }
    return poll.deadline.getTime() <= referenceTimeMs;
  }

  /** Creates a new poll, prepends it to the state, and notifies listeners. */
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

  /** Increases an option's vote count by one and returns the updated poll. */
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

  /** Returns the total number of votes across all options of the poll. */
  public getTotalVotes(poll: Poll): number {
    return poll.options.reduce((sum, option) => sum + option.votes, 0);
  }

  /** Builds a fresh poll option with zero votes from a label. */
  private buildOption(label: string, index: number): PollOption {
    return {
      id: this.generateId(`opt-${index}`),
      label: label.trim(),
      votes: 0,
    };
  }

  /** Returns a copy of the poll's options with the matching option's votes incremented. */
  private incrementVote(poll: Poll, optionId: string): ReadonlyArray<PollOption> {
    return poll.options.map((option) =>
      option.id === optionId ? { ...option, votes: option.votes + 1 } : option,
    );
  }

  /** Returns whether the poll's deadline lies within the [now, threshold] window. */
  private isWithinWindow(poll: Poll, nowMs: number, thresholdMs: number): boolean {
    if (poll.deadline === null) {
      return false;
    }
    const deadlineMs = poll.deadline.getTime();
    return deadlineMs > nowMs && deadlineMs <= thresholdMs;
  }

  private compareByDeadline = (a: Poll, b: Poll): number => {
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
  };

  private compareByDeadlineDescending = (a: Poll, b: Poll): number => {
    const aTime = a.deadline?.getTime() ?? 0;
    const bTime = b.deadline?.getTime() ?? 0;
    return bTime - aTime;
  };

  /** Calls every registered listener with the current poll snapshot. */
  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.polls);
    }
  }

  /** Generates a unique ID composed of a prefix, timestamp, and random suffix. */
  private generateId(prefix: string): string {
    const random = Math.random().toString(ID_RADIX).slice(2, 2 + RANDOM_ID_LENGTH);
    return `${prefix}-${Date.now().toString(ID_RADIX)}-${random}`;
  }
}
