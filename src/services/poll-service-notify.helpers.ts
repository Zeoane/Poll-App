import type { Poll } from '../types/poll';

type PollListener = (polls: ReadonlyArray<Poll>) => void;
type SurveyListener = () => void;

/**
 * Notifies all poll list subscribers with the latest polls array.
 * @param listeners - Registered list change listeners.
 * @param polls - Current in-memory poll list snapshot.
 */
export function notifyPollListeners(
  listeners: Set<PollListener>,
  polls: ReadonlyArray<Poll>,
): void {
  for (const listener of listeners) {
    listener(polls);
  }
}

/**
 * Notifies listeners bound to one survey route.
 * @param surveyListeners - Per-survey listener registry.
 * @param surveyId - Survey id whose detail listeners to invoke.
 */
export function notifySurveyListeners(
  surveyListeners: Map<string, Set<SurveyListener>>,
  surveyId: string,
): void {
  const listeners = surveyListeners.get(surveyId);
  if (listeners === undefined) {
    return;
  }
  for (const listener of listeners) {
    listener();
  }
}
