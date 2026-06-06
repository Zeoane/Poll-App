/** Fixed category labels used in filters and create-survey pickers. */
export const POLL_CATEGORIES = [
  'Team Activities',
  'Health & Wellness',
  'Gaming & Entertainment',
  'Education & Learning',
  'Lifestyle & Preferences',
  'Technology & Innovation',
] as const;

/** One entry from {@link POLL_CATEGORIES}. */
export type PollCategory = (typeof POLL_CATEGORIES)[number];

/** Maximum number of words allowed in a poll title. */
export const POLL_TITLE_MAX_WORDS = 11;

/** Maximum number of characters allowed in a poll title. */
export const POLL_TITLE_MAX_CHARS = 63;

/** One answer choice with a running vote count. */
export interface PollOption {
  readonly id: string;
  readonly label: string;
  votes: number;
}

/** A survey with metadata, options, and an optional deadline. */
export interface Poll {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: string | null;
  readonly options: ReadonlyArray<PollOption>;
  readonly createdAt: Date;
  readonly deadline: Date | null;
}

/** Home list tab filter for active vs past surveys. */
export type PollTab = 'active' | 'past';

/** Payload for creating a new poll in the in-memory service. */
export interface NewPollInput {
  readonly title: string;
  readonly description: string;
  readonly category: string | null;
  readonly options: ReadonlyArray<string>;
  readonly deadline: Date | null;
}

/** Field-level validation messages for the legacy poll form. */
export type ValidationErrors = Partial<Record<'title' | 'options', string>>;
