import type { PollService } from '../../services/poll-service';
import type { Poll } from '../../types/poll';

/**
 * Initializes the service and loads one poll for a route id.
 * @param pollId - Route parameter identifying the poll.
 * @param service - Shared poll service instance.
 * @returns Loaded poll detail, or `undefined` when not found.
 */
export async function loadRoutedPoll(
  pollId: string,
  service: PollService,
): Promise<Poll | undefined> {
  await service.initialize();
  return service.ensurePollDetail(pollId);
}
