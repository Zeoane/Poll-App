import type { Poll, PollOption, SurveyQuestion } from '../types/poll';

import { MOCK_POLLS } from './mock-polls';

/**
 * Returns demo surveys for the home lists and preview routes.
 * @returns Published example polls derived from {@link MOCK_POLLS}.
 */
export function buildExamplePolls(): ReadonlyArray<Poll> {
  return MOCK_POLLS.map((poll) => toExamplePoll(poll));
}

/**
 * True when a poll is one of the built-in visual examples.
 * @param poll - Poll to inspect, or `undefined`.
 * @returns `true` when {@link poll} is flagged as an example survey.
 */
export function isExamplePoll(poll: Poll | undefined): boolean {
  return poll?.isExample === true;
}

const EXAMPLE_POLL_IDS = new Set(MOCK_POLLS.map((poll) => poll.id));

/**
 * True when a route id belongs to a built-in demo survey.
 * @param pollId - Route poll id, if any.
 * @returns Whether {@link pollId} matches a mock example survey id.
 */
export function isKnownExamplePollId(pollId: string | null | undefined): boolean {
  return pollId !== null && pollId !== undefined && EXAMPLE_POLL_IDS.has(pollId);
}

/**
 * Clones a mock poll into a published example with one votable question.
 * @param poll - Source mock poll to transform.
 * @returns Example poll with cloned options and a single question.
 */
function toExamplePoll(poll: Poll): Poll {
  const options = cloneOptions(poll.options);
  const question = buildExampleQuestion(poll.id, options, exampleQuestionPrompt(poll));
  return {
    ...poll,
    options,
    questions: [question],
    status: 'published',
    isExample: true,
  };
}

/**
 * Returns the Q1 prompt shown on example survey cards.
 * @param poll - Example poll whose card copy is needed.
 * @returns Question prompt tailored to known example ids.
 */
function exampleQuestionPrompt(poll: Poll): string {
  if (poll.id === 'poll-1') {
    return 'Which date would work best for you?';
  }
  return 'Choose one option';
}

/**
 * Builds the single votable question used by home-screen example surveys.
 * @param pollId - Parent poll id used to derive the question id.
 * @param options - Cloned answer options for the question.
 * @param prompt - Display text shown above the options.
 * @returns One single-choice survey question.
 */
function buildExampleQuestion(
  pollId: string,
  options: ReadonlyArray<PollOption>,
  prompt: string,
): SurveyQuestion {
  return {
    id: `${pollId}-q1`,
    sortOrder: 1,
    prompt,
    allowMultiple: false,
    options,
  };
}

/**
 * Deep-clones option rows so example votes do not mutate module state.
 * @param options - Source option rows from a mock poll.
 * @returns Shallow copies of each option object.
 */
function cloneOptions(options: ReadonlyArray<PollOption>): PollOption[] {
  return options.map((option) => ({ ...option }));
}
