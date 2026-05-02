import { ActivePanelScrollbarController } from './src/components/active-panel-scrollbar.js';
import { PollDetailController } from './src/components/poll-detail.js';
import { PollFormController } from './src/components/poll-form.js';
import { PollListController } from './src/components/poll-list.js';
import { SortDropdownController } from './src/components/sort-dropdown.js';
import { MOCK_POLLS } from './src/data/mock-polls.js';
import { PollService } from './src/services/poll-service.js';

/** Bootstraps the application by wiring services and controllers together. */
function bootstrap(): void {
  const pollService = new PollService(MOCK_POLLS);
  const detailController = new PollDetailController({ pollService });
  const listController = new PollListController({
    pollService,
    onPollSelect: (pollId) => detailController.open(pollId),
  });
  new PollFormController({ pollService });
  new SortDropdownController({ pollService });
  const activePanelScrollbar = new ActivePanelScrollbarController();
  pollService.subscribe(() => {
    listController.render();
    detailController.refresh();
    requestAnimationFrame(() => activePanelScrollbar.sync());
  });
  listController.render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
