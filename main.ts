import { ActivePanelScrollbarController } from './src/components/active-panel-scrollbar.js';
import { PollDetailController } from './src/components/poll-detail.js';
import { PollFormController } from './src/components/poll-form.js';
import { PollListController } from './src/components/poll-list.js';
import { SortDropdownController } from './src/components/sort-dropdown.js';
import { MOCK_POLLS } from './src/data/mock-polls.js';
import { PollService } from './src/services/poll-service.js';

interface WiredControllers {
  readonly list: PollListController;
  readonly detail: PollDetailController;
  readonly scrollbar: ActivePanelScrollbarController;
}

/** Wires list, detail, form, sort, and custom scrollbar to a shared service. */
function wireControllers(pollService: PollService): WiredControllers {
  const detailController = new PollDetailController({ pollService });
  const listController = new PollListController({
    pollService,
    onPollSelect: (pollId) => detailController.open(pollId),
  });
  new PollFormController({ pollService });
  new SortDropdownController({ pollService });
  const scrollbar = new ActivePanelScrollbarController();
  return { list: listController, detail: detailController, scrollbar };
}

/** Subscribes to poll updates to refresh lists, detail, and scrollbar position. */
function subscribeToPollChanges(
  pollService: PollService,
  list: PollListController,
  detail: PollDetailController,
  scrollbar: ActivePanelScrollbarController,
): void {
  pollService.subscribe(() => {
    list.render();
    detail.refresh();
    requestAnimationFrame(() => scrollbar.sync());
  });
}

/** Bootstraps the application by wiring services and controllers together. */
function bootstrap(): void {
  const pollService = new PollService(MOCK_POLLS);
  const { list, detail, scrollbar } = wireControllers(pollService);
  subscribeToPollChanges(pollService, list, detail, scrollbar);
  list.render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
