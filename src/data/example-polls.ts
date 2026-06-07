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

/** Clones a mock poll into a published example with one votable question. */
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

/** Returns the Q1 prompt shown on example survey cards. */
function exampleQuestionPrompt(poll: Poll): string {
  if (poll.id === 'poll-1') {
    return 'Which date would work best for you?';
  }
  return 'Choose one option';
}

/** Builds the single votable question used by home-screen example surveys. */
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

/** Deep-clones option rows so example votes do not mutate module state. */
function cloneOptions(options: ReadonlyArray<PollOption>): PollOption[] {
  return options.map((option) => ({ ...option }));
}
