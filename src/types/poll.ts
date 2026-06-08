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

/** One survey question with answer options and vote totals. */
export interface SurveyQuestion {
  readonly id: string;
  readonly sortOrder: number;
  readonly prompt: string;
  readonly allowMultiple: boolean;
  readonly options: ReadonlyArray<PollOption>;
}

/** A survey with metadata, options, and an optional deadline. */
export interface Poll {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: string | null;
  readonly options: ReadonlyArray<PollOption>;
  readonly questions?: ReadonlyArray<SurveyQuestion>;
  readonly createdAt: Date;
  readonly deadline: Date | null;
  readonly status?: 'published';
  /** True for built-in demo surveys shown alongside Supabase data. */
  readonly isExample?: boolean;
}

/** One question payload when creating a survey in Supabase. */
export interface CreateSurveyQuestionInput {
  readonly prompt: string;
  readonly allowMultiple: boolean;
  readonly answers: ReadonlyArray<string>;
}

/** Full survey payload for Supabase create operations. */
export interface CreateSurveyInput {
  readonly title: string;
  readonly description: string;
  readonly category: string | null;
  readonly deadline: Date | null;
  readonly questions: ReadonlyArray<CreateSurveyQuestionInput>;
}

/** Home list tab filter for active vs past surveys. */
export type PollTab = 'active' | 'past';

/** Maps question ids to the option ids chosen by the current voter. */
export type VoterChoicesByQuestion = Readonly<Record<string, ReadonlyArray<string>>>;

/** Payload for creating a new poll in the in-memory service. */
export interface NewPollInput {
  readonly title: string;
  readonly description: string;
  readonly category: string | null;
  readonly options: ReadonlyArray<string>;
  readonly deadline: Date | null;
}

/** Field-level validation messages for the legacy poll form. */
export type ValidationErrors = Partial<Record<'title' | 'options' | 'deadline', string>>;
