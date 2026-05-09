export const POLL_CATEGORIES = [
  'Team activities',
  'Gaming',
  'Healthy Lifestyle',
  'Education',
  'Science',
  'Social',
] as const;

export type PollCategory = (typeof POLL_CATEGORIES)[number];

export const POLL_TITLE_MAX_WORDS = 11;
export const POLL_TITLE_MAX_CHARS = 63;

export interface PollOption {
  readonly id: string;
  readonly label: string;
  votes: number;
}

export interface Poll {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: string | null;
  readonly options: ReadonlyArray<PollOption>;
  readonly createdAt: Date;
  readonly deadline: Date | null;
}

export type PollTab = 'active' | 'past';

export interface NewPollInput {
  readonly title: string;
  readonly description: string;
  readonly category: string | null;
  readonly options: ReadonlyArray<string>;
  readonly deadline: Date | null;
}

export type ValidationErrors = Partial<Record<'title' | 'options', string>>;
