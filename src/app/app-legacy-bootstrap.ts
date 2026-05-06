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

function bootstrap(): void {
  const pollService = new PollService(MOCK_POLLS);
  const { list, detail, scrollbar } = wireControllers(pollService);
  subscribeToPollChanges(pollService, list, detail, scrollbar);
  list.render();
}

/** Nach Angular-View; DOM der Poll-App liegt innerhalb von `app-root`. */
export function bootstrapPollApp(): void {
  bootstrap();
}
