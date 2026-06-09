import { deadlineToEndsOnInput } from './survey-view-results-form.helpers';
import { loadRoutedPoll } from './survey-view-results-route.helpers';
import { PREVIEW_DESCRIPTION } from './survey-view-results-template.constants';
import type { PollService } from '../../services/poll-service';
import type { Poll, VoterChoicesByQuestion } from '../../types/poll';

export interface SurveyRouteBindTarget {
  viewMode: 'template' | 'poll';
  currentPoll: Poll | null;
  surveyName: string;
  surveyDescription: string;
  category: string;
  endsOn: string;
  completeError: string | null;
  pollChosenByQuestion: { set: (choices: VoterChoicesByQuestion) => void };
  pollListenerUnsubHolder: { unsubscribe: (() => void) | null };
  setViewMode: (mode: 'template' | 'poll') => void;
  setCurrentPoll: (poll: Poll | null) => void;
  setSurveyName: (value: string) => void;
  setSurveyDescription: (value: string) => void;
  setCategory: (value: string) => void;
  setEndsOn: (value: string) => void;
  setCompleteError: (value: string | null) => void;
}

/**
 * Binds loaded poll data and restores voter choices.
 * @param target - Survey view fields updated by the bind flow.
 * @param poll - Loaded poll detail.
 * @param pollId - Route poll id for subscriptions and storage.
 * @param service - Shared poll service instance.
 */
export async function attachSurveyPollView(
  target: SurveyRouteBindTarget,
  poll: Poll,
  pollId: string,
  service: PollService,
): Promise<void> {
  target.setViewMode('poll');
  target.setCurrentPoll(poll);
  applySurveyPollFields(target, poll);
  await restoreSurveyVoterChoices(target, pollId, service);
  subscribeSurveyPollUpdates(target, pollId, service);
}

/**
 * Copies poll fields into the preview model.
 * @param target - Survey view fields receiving poll metadata.
 * @param poll - Poll whose metadata populates the form bindings.
 */
export function applySurveyPollFields(target: SurveyRouteBindTarget, poll: Poll): void {
  target.setSurveyName(poll.title);
  const description = poll.description.trim();
  target.setSurveyDescription(
    description.length > 0 ? description : PREVIEW_DESCRIPTION,
  );
  target.setCategory(poll.category?.trim() ?? '—');
  target.setEndsOn(deadlineToEndsOnInput(poll.deadline));
  target.setCompleteError(null);
}

/**
 * Loads a poll by route id or signals navigation when missing.
 * @param pollId - Route parameter identifying the poll.
 * @param service - Shared poll service instance.
 * @returns Loaded poll, or `undefined` when the route should redirect home.
 */
export async function loadSurveyRoutePoll(
  pollId: string,
  service: PollService,
): Promise<Poll | undefined> {
  return loadRoutedPoll(pollId, service);
}

/**
 * Refreshes bound poll data after service notifications.
 * @param target - Survey view fields updated on sync.
 * @param pollId - Route poll id to reload.
 * @param service - Shared poll service instance.
 */
export async function syncSurveyPollFromService(
  target: SurveyRouteBindTarget,
  pollId: string,
  service: PollService,
): Promise<void> {
  const poll = await service.ensurePollDetail(pollId);
  if (poll !== undefined) {
    target.setCurrentPoll(poll);
    applySurveyPollFields(target, poll);
    await restoreSurveyVoterChoices(target, pollId, service);
  }
}

/** Loads stored voter choices for the bound survey. */
async function restoreSurveyVoterChoices(
  target: SurveyRouteBindTarget,
  pollId: string,
  service: PollService,
): Promise<void> {
  const choices = await service.loadVoterChoices(pollId);
  target.pollChosenByQuestion.set({ ...choices });
}

/** Subscribes to live poll updates for the active route. */
function subscribeSurveyPollUpdates(
  target: SurveyRouteBindTarget,
  pollId: string,
  service: PollService,
): void {
  target.pollListenerUnsubHolder.unsubscribe = service.subscribeToSurvey(
    pollId,
    () => {
      void syncSurveyPollFromService(target, pollId, service);
    },
  );
}
