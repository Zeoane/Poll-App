import { ActivePanelScrollbarController } from '../components/active-panel-scrollbar';
import { EndingSoonDragScrollController } from '../components/ending-soon-drag-scroll';
import { PollDetailController } from '../components/poll-detail';
import { PollFormController } from '../components/poll-form';
import { PollListController } from '../components/poll-list';
import { SortDropdownController } from '../components/sort-dropdown';
import { MOCK_POLLS } from '../data/mock-polls';
import { PollService } from '../services/poll-service';

interface WiredControllers {
  readonly list: PollListController;
  readonly detail: PollDetailController;
  readonly scrollbar: ActivePanelScrollbarController;
  readonly endingSoonDragScroll: EndingSoonDragScrollController;
}

let sharedPollService: PollService | null = null;

/** Returns the shared poll service singleton used across routes. */
export function getSharedPollService(): PollService {
  if (sharedPollService === null) {
    sharedPollService = new PollService(MOCK_POLLS);
  }
  return sharedPollService;
}

/** Instantiates list, detail, form, sort, and scrollbar controllers for the home screen. */
function wireControllers(
  pollService: PollService,
  onPollSelect?: (pollId: string) => void,
): WiredControllers {
  const detailController = new PollDetailController({ pollService });
  const listController = new PollListController({
    pollService,
    onPollSelect: onPollSelect ?? ((pollId) => detailController.open(pollId)),
  });
  new PollFormController({ pollService });
  new SortDropdownController({ pollService });
  const scrollbar = new ActivePanelScrollbarController();
  const endingSoonDragScroll = new EndingSoonDragScrollController();
  return {
    list: listController,
    detail: detailController,
    scrollbar,
    endingSoonDragScroll,
  };
}

/** Refreshes lists, the detail dialog, and the custom scrollbar layout. */
function runListSync(
  pollService: PollService,
  list: PollListController,
  detail: PollDetailController,
  scrollbar: ActivePanelScrollbarController,
): void {
  list.render();
  detail.refresh();
  requestAnimationFrame(() => scrollbar.sync());
}

/** Wires legacy DOM controllers for the home route; returns a cleanup callback. */
export function bootstrapPollAppHome(
  onPollSelect?: (pollId: string) => void,
): () => void {
  const pollService = getSharedPollService();
  const { list, detail, scrollbar, endingSoonDragScroll } = wireControllers(
    pollService,
    onPollSelect,
  );
  const unsubscribe = pollService.subscribe(() => {
    runListSync(pollService, list, detail, scrollbar);
  });
  runListSync(pollService, list, detail, scrollbar);
  return () => {
    unsubscribe();
    endingSoonDragScroll.destroy();
  };
}
