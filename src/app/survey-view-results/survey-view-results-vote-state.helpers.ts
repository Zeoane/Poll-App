import type { WritableSignal } from '@angular/core';

import type { PollService } from '../../services/poll-service';
import type { Poll, VoterChoicesByQuestion } from '../../types/poll';
import {
  clearUserVoteOnPoll,
  markUserVotedOnPoll,
} from '../../utils/poll-vote-storage';
import {
  resolvePollVoteContext,
  toggleVoteForQuestion,
  type PollVoteContext,
  type VoteToggleResult,
} from './survey-view-results-vote.helpers';
import { resolveDisplayQuestions } from './survey-view-results-questions.helpers';

export interface SurveyVoteViewState {
  readonly viewMode: 'template' | 'poll';
  readonly currentPoll: Poll | null;
  readonly pollChosenByQuestion: WritableSignal<VoterChoicesByQuestion>;
  readonly setCurrentPoll: (poll: Poll) => void;
}

/**
 * Resolves poll view state needed before toggling a vote.
 * @param state - Current survey view bindings.
 * @param questionId - Id of the question receiving the vote.
 * @returns Vote context when voting is allowed, otherwise `undefined`.
 */
export function resolveSurveyVoteContext(
  state: SurveyVoteViewState,
  questionId: string,
): PollVoteContext | undefined {
  const poll = state.currentPoll;
  const choices = state.pollChosenByQuestion()[questionId] ?? [];
  return resolvePollVoteContext(
    poll,
    state.viewMode,
    questionId,
    choices,
    poll === null ? [] : resolveDisplayQuestions(poll),
  );
}

/**
 * Delegates one option toggle to the poll service.
 * @param context - Resolved poll, question, and current choices.
 * @param optionId - Id of the option to toggle.
 * @param service - Shared poll service instance.
 * @returns Updated poll and choices, or `undefined` when the toggle fails.
 */
export function toggleSurveyQuestionVote(
  context: PollVoteContext,
  optionId: string,
  service: PollService,
): Promise<VoteToggleResult | undefined> {
  return toggleVoteForQuestion(
    context.poll,
    context.question,
    optionId,
    context.currentChoices,
    service,
  );
}

/**
 * Writes vote results into component state and example storage.
 * @param state - Mutable survey view bindings updated by the vote.
 * @param questionId - Id of the question whose choices were updated.
 * @param result - Poll and choices returned from the service toggle.
 * @param poll - Poll instance used to detect example surveys for local storage sync.
 * @remarks Only the first choice is persisted for example polls.
 */
export function commitSurveyVoteResult(
  state: SurveyVoteViewState,
  questionId: string,
  result: VoteToggleResult,
  poll: Poll,
): void {
  state.setCurrentPoll(result.poll);
  state.pollChosenByQuestion.update((choices) => ({
    ...choices,
    [questionId]: [...result.choices],
  }));
  if (poll.isExample === true) {
    syncExampleVoteStorage(poll.id, result.choices);
  }
}

/**
 * Persists example survey choices for reload in local storage.
 * @param pollId - Example poll id used as the storage key.
 * @param choices - Selected option ids after the vote toggle.
 */
function syncExampleVoteStorage(
  pollId: string,
  choices: ReadonlyArray<string>,
): void {
  if (choices.length === 0) {
    clearUserVoteOnPoll(pollId);
    return;
  }
  markUserVotedOnPoll(pollId, choices[0]);
}
