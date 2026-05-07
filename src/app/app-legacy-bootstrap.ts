import { ActivePanelScrollbarController } from '../components/active-panel-scrollbar';
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
}

let sharedPollService: PollService | null = null;

/** Gemeinsamer Zustand für Home, Modal und Details – bleibt beim Wechsel der Route erhalten. */
export function getSharedPollService(): PollService {
  if (sharedPollService === null) {
    sharedPollService = new PollService(MOCK_POLLS);
  }
  return sharedPollService;
}

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
  return { list: listController, detail: detailController, scrollbar };
}

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

/**
 * Startet die Legacy-Controller auf der Home-Seite.
 * @returns Aufräumen: Listener beim Verlassen der Home-Route entfernen.
 */
export function bootstrapPollAppHome(
  onPollSelect?: (pollId: string) => void,
): () => void {
  const pollService = getSharedPollService();
  const { list, detail, scrollbar } = wireControllers(pollService, onPollSelect);
  const unsubscribe = pollService.subscribe(() => {
    runListSync(pollService, list, detail, scrollbar);
  });
  runListSync(pollService, list, detail, scrollbar);
  return () => {
    unsubscribe();
  };
}
