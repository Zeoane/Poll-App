import type { Poll, PollOption, SurveyQuestion } from '../types/poll';

import { MOCK_POLLS } from './mock-polls';

/** Returns demo surveys for the home lists and preview routes. */
export function buildExamplePolls(): ReadonlyArray<Poll> {
  return MOCK_POLLS.map((poll) => toExamplePoll(poll));
}

/** True when a poll is one of the built-in visual examples. */
export function isExamplePoll(poll: Poll | undefined): boolean {
  return poll?.isExample === true;
}

/** Clones a mock poll into a published example with one question block. */
function toExamplePoll(poll: Poll): Poll {
  const options = cloneOptions(poll.options);
  const question = buildExampleQuestion(poll.id, options);
  return {
    ...poll,
    options,
    questions: [question],
    status: 'published',
    isExample: true,
  };
}

/** Builds the single question used by legacy example surveys. */
function buildExampleQuestion(
  pollId: string,
  options: ReadonlyArray<PollOption>,
): SurveyQuestion {
  return {
    id: `${pollId}-q1`,
    sortOrder: 1,
    prompt: 'Choose one option',
    allowMultiple: false,
    options,
  };
}

/** Deep-clones option rows so example votes do not mutate module state. */
function cloneOptions(options: ReadonlyArray<PollOption>): PollOption[] {
  return options.map((option) => ({ ...option }));
}
