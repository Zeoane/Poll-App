import { isExamplePoll } from '../data/example-polls';
import type { Poll } from '../types/poll';

type SurveyListener = () => void;

export interface SurveySubscribeDeps {
  readonly surveyListeners: Map<string, Set<SurveyListener>>;
  readonly findPollById: (pollId: string) => Poll | undefined;
  readonly ensureRealtimeSubscription: (surveyId: string) => void;
  readonly teardownRealtimeSubscription: (surveyId: string) => void;
}

/**
 * Subscribes to live updates for one survey detail view.
 * @param surveyId - Survey id to watch.
 * @param listener - Callback invoked when that survey's data changes.
 * @param deps - Listener registry and realtime subscription hooks.
 * @returns Function that removes the listener and tears down realtime when unused.
 * @remarks Skips realtime for in-memory example polls.
 */
export function subscribeToSurveyUpdates(
  surveyId: string,
  listener: SurveyListener,
  deps: SurveySubscribeDeps,
): () => void {
  const listeners = deps.surveyListeners.get(surveyId) ?? new Set<SurveyListener>();
  listeners.add(listener);
  deps.surveyListeners.set(surveyId, listeners);
  if (!isExamplePoll(deps.findPollById(surveyId))) {
    deps.ensureRealtimeSubscription(surveyId);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      deps.surveyListeners.delete(surveyId);
      deps.teardownRealtimeSubscription(surveyId);
    }
  };
}
