import { PollService } from '../services/poll-service';
import { SupabaseSurveyRepository } from '../services/supabase-survey.repository';
import type { SupabaseService } from '../services/supabase.service';
import {
  createHomeCleanup,
  runListSync,
  subscribeHomeListSync,
  wireControllers,
} from './app-legacy-bootstrap.helpers';

let sharedPollService: PollService | null = null;
let sharedSupabaseService: SupabaseService | null = null;

/**
 * Registers the shared Supabase service for legacy and Angular routes.
 * @param service - Supabase client wrapper injected at app startup.
 * @beta
 */
export function setSharedSupabaseService(service: SupabaseService): void {
  sharedSupabaseService = service;
}

/**
 * Returns the shared Supabase service when the app initializer ran.
 * @returns The registered service, or `null` before initialization.
 * @beta
 */
export function getSharedSupabaseService(): SupabaseService | null {
  return sharedSupabaseService;
}

/**
 * Returns the shared poll service singleton used across routes.
 * @returns Lazily constructed poll service backed by the shared Supabase client.
 * @beta
 */
export function getSharedPollService(): PollService {
  if (sharedPollService === null) {
    const repo = new SupabaseSurveyRepository(
      () => sharedSupabaseService?.getClient() ?? null,
    );
    sharedPollService = new PollService(repo);
  }
  return sharedPollService;
}

/**
 * Wires legacy DOM controllers for the home route; returns a cleanup callback.
 * @param onPollSelect - Optional handler invoked when a poll row is selected; defaults to opening the detail dialog.
 * @returns Teardown function that unsubscribes poll updates and destroys drag-scroll.
 * @remarks Instantiates imperative DOM controllers outside Angular change detection.
 * @beta
 */
export function bootstrapPollAppHome(
  onPollSelect?: (pollId: string) => void,
): () => void {
  const pollService = getSharedPollService();
  const controllers = wireControllers(pollService, onPollSelect);
  const unsubscribe = subscribeHomeListSync(pollService, controllers);
  runListSync(pollService, controllers.list, controllers.detail, controllers.scrollbar);
  return createHomeCleanup(unsubscribe, controllers.endingSoonDragScroll);
}
