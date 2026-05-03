/** Ordered category labels used by the sort dropdown and mock data. */
export const POLL_CATEGORIES = [
  'Team activities',
  'Gaming',
  'Healthy Lifestyle',
  'Education',
  'Science',
  'Social',
] as const;

/** Categories the data layer recognises for filtering. */
export type PollCategory = (typeof POLL_CATEGORIES)[number];

/** Max word count allowed in a poll title. */
export const POLL_TITLE_MAX_WORDS = 11;
export const POLL_TITLE_MAX_CHARS = 63;

/** Single answer option within a poll. */
export interface PollOption {
  readonly id: string;
  readonly label: string;
  votes: number;
}

/** Poll consisting of a question, answer options, and an optional deadline. */
export interface Poll {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: string | null;
  readonly options: ReadonlyArray<PollOption>;
  readonly createdAt: Date;
  readonly deadline: Date | null;
}

/** Visible filter tabs on the homescreen. */
export type PollTab = 'active' | 'past';

/** User-supplied data when creating a new poll. */
export interface NewPollInput {
  readonly title: string;
  readonly description: string;
  readonly category: string | null;
  readonly options: ReadonlyArray<string>;
  readonly deadline: Date | null;
}

/** Validation errors keyed by form field name. */
export type ValidationErrors = Partial<Record<'title' | 'options', string>>;
