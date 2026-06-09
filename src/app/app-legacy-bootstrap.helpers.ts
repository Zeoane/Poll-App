import { ActivePanelScrollbarController } from '../components/active-panel-scrollbar';
import { EndingSoonDragScrollController } from '../components/ending-soon-drag-scroll';
import { PollDetailController } from '../components/poll-detail';
import { PollFormController } from '../components/poll-form';
import { PollListController } from '../components/poll-list';
import { SortDropdownController } from '../components/sort-dropdown';
import type { PollService } from '../services/poll-service';

export interface WiredControllers {
  readonly list: PollListController;
  readonly detail: PollDetailController;
  readonly scrollbar: ActivePanelScrollbarController;
  readonly endingSoonDragScroll: EndingSoonDragScrollController;
}

/**
 * Instantiates list, detail, form, sort, and scrollbar controllers for the home screen.
 * @param pollService - Shared poll data service.
 * @param onPollSelect - Optional callback when a poll is selected from the list.
 * @returns Wired list, detail, and scroll controllers for the home route.
 */
export function wireControllers(
  pollService: PollService,
  onPollSelect?: (pollId: string) => void,
): WiredControllers {
  const detail = createPollDetailController(pollService);
  const list = createPollListController(pollService, detail, onPollSelect);
  wireHomeFormControllers(pollService);
  const scrollControllers = createHomeScrollControllers();
  return { list, detail, ...scrollControllers };
}

/**
 * Creates the poll detail dialog controller.
 * @param pollService - Shared poll data service.
 * @returns Configured poll detail controller.
 */
function createPollDetailController(pollService: PollService): PollDetailController {
  return new PollDetailController({ pollService });
}

/**
 * Creates the home poll list and wires poll selection.
 * @param pollService - Shared poll data service.
 * @param detail - Detail controller opened when no custom select handler is provided.
 * @param onPollSelect - Optional callback overriding the default detail open behavior.
 * @returns Configured poll list controller.
 */
function createPollListController(
  pollService: PollService,
  detail: PollDetailController,
  onPollSelect?: (pollId: string) => void,
): PollListController {
  return new PollListController({
    pollService,
    onPollSelect: onPollSelect ?? ((pollId) => detail.open(pollId)),
  });
}

/**
 * Wires form and sort dropdown controllers on the home screen.
 * @param pollService - Shared poll data service.
 */
function wireHomeFormControllers(pollService: PollService): void {
  new PollFormController({ pollService });
  new SortDropdownController({ pollService });
}

/**
 * Creates scrollbar and ending-soon drag controllers.
 * @returns Scrollbar and ending-soon drag controllers for the home layout.
 */
function createHomeScrollControllers(): Pick<
  WiredControllers,
  'scrollbar' | 'endingSoonDragScroll'
> {
  return {
    scrollbar: new ActivePanelScrollbarController(),
    endingSoonDragScroll: new EndingSoonDragScrollController(),
  };
}

/**
 * Refreshes lists, the detail dialog, and the custom scrollbar layout.
 * @param pollService - Shared poll data service.
 * @param list - Poll list controller to re-render.
 * @param detail - Detail dialog controller to refresh.
 * @param scrollbar - Custom scrollbar controller to sync after layout.
 */
export function runListSync(
  pollService: PollService,
  list: PollListController,
  detail: PollDetailController,
  scrollbar: ActivePanelScrollbarController,
): void {
  list.render();
  detail.refresh();
  requestAnimationFrame(() => scrollbar.sync());
}

/**
 * Subscribes poll updates to home list and detail refresh.
 * @param pollService - Shared poll data service to subscribe to.
 * @param controllers - Wired home controllers refreshed on each update.
 * @returns Unsubscribe function for the poll service listener.
 */
export function subscribeHomeListSync(
  pollService: PollService,
  controllers: WiredControllers,
): () => void {
  return pollService.subscribe(() => {
    runListSync(pollService, controllers.list, controllers.detail, controllers.scrollbar);
  });
}

/**
 * Returns cleanup for poll subscription and drag-scroll teardown.
 * @param unsubscribe - Function returned from {@link subscribeHomeListSync}.
 * @param endingSoonDragScroll - Drag-scroll controller to destroy on cleanup.
 * @returns Combined teardown callback for the home bootstrap lifecycle.
 */
export function createHomeCleanup(
  unsubscribe: () => void,
  endingSoonDragScroll: EndingSoonDragScrollController,
): () => void {
  return () => {
    unsubscribe();
    endingSoonDragScroll.destroy();
  };
}
