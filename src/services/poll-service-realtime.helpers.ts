import type { SupabaseSurveyRepository } from './supabase-survey.repository';

/**
 * Starts realtime listening when the first survey listener attaches.
 * @param surveyId - Survey id to subscribe to via the repository.
 * @param realtimeUnsubs - Active unsubscribe handles keyed by survey id.
 * @param repo - Supabase survey repository.
 * @param onChange - Callback invoked after a realtime response event.
 */
export function ensureRealtimeSubscription(
  surveyId: string,
  realtimeUnsubs: Map<string, () => void>,
  repo: SupabaseSurveyRepository,
  onChange: (surveyId: string) => void,
): void {
  if (realtimeUnsubs.has(surveyId)) {
    return;
  }
  const unsubscribe = repo.subscribeToSurveyResponses(surveyId, () => {
    onChange(surveyId);
  });
  realtimeUnsubs.set(surveyId, unsubscribe);
}

/**
 * Stops realtime listening when no survey listeners remain.
 * @param surveyId - Survey id whose realtime channel to remove.
 * @param realtimeUnsubs - Active unsubscribe handles keyed by survey id.
 */
export function teardownRealtimeSubscription(
  surveyId: string,
  realtimeUnsubs: Map<string, () => void>,
): void {
  const unsubscribe = realtimeUnsubs.get(surveyId);
  if (unsubscribe === undefined) {
    return;
  }
  unsubscribe();
  realtimeUnsubs.delete(surveyId);
}
