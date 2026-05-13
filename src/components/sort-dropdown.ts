import type { PollService } from '../services/poll-service';

import { CategoryListDropdown } from './category-list-dropdown';
import { POLL_CATEGORIES } from '../types/poll';
import { requireElementById } from '../utils/dom';

const DEFAULT_LABEL = 'Sort by categories';

export interface SortDropdownControllerOptions {
  readonly pollService: PollService;
}

/** Home screen category filter; delegates UI + events to {@link CategoryListDropdown}. */
export class SortDropdownController {
  private readonly dropdown: CategoryListDropdown;

  public constructor(options: SortDropdownControllerOptions) {
    this.dropdown = new CategoryListDropdown({
      trigger: requireElementById('sort-button', HTMLButtonElement),
      label: requireElementById('sort-label', HTMLElement),
      menu: requireElementById('sort-menu', HTMLUListElement),
      selectionCaption: requireElementById(
        'sort-selection-caption',
        HTMLElement,
      ),
      placeholder: DEFAULT_LABEL,
      categories: POLL_CATEGORIES,
      allowClearByRetoggle: true,
      getSelection: () => options.pollService.getActiveCategory(),
      setSelection: (category) => {
        options.pollService.setActiveCategory(category);
      },
      triggerActiveClass: 'sort--active',
    });
  }
}
