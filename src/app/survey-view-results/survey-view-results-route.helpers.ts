import type { PollService } from '../../services/poll-service';
import type { Poll } from '../../types/poll';

/** Initializes the service and loads one poll for a route id. */
export async function loadRoutedPoll(
  pollId: string,
  service: PollService,
): Promise<Poll | undefined> {
  await service.initialize();
  return service.ensurePollDetail(pollId);
}
