import type { PollService } from '../services/poll-service.js';

import { POLL_CATEGORIES } from '../types/poll.js';
import { requireElementById } from '../utils/dom.js';

const DEFAULT_LABEL = 'Sort by categories';

export interface SortDropdownControllerOptions {
  readonly pollService: PollService;
}

/**
 * Custom dropdown that filters the Active/Past poll lists by category.
 *
 * Behaviour:
 * - Click trigger: toggles the menu.
 * - Click an option: applies the filter and closes the menu. Picking the
 *   currently selected option again clears the filter (toggle-off).
 * - Click outside / press ESC: closes the menu.
 *
 * Categories come from the {@link POLL_CATEGORIES} constant, so adding or
 * renaming a category is a single-source-of-truth change.
 */
export class SortDropdownController {
  private readonly pollService: PollService;
  private readonly trigger: HTMLButtonElement;
  private readonly label: HTMLElement;
  private readonly menu: HTMLUListElement;
  private isOpen = false;
  private selectedCategory: string | null = null;

  public constructor(options: SortDropdownControllerOptions) {
    this.pollService = options.pollService;
    this.trigger = requireElementById('sort-button', HTMLButtonElement);
    this.label = requireElementById('sort-label', HTMLElement);
    this.menu = requireElementById('sort-menu', HTMLUListElement);
    this.renderOptions();
    this.attachEvents();
  }

  /** Builds the menu items from the canonical category list. */
  private renderOptions(): void {
    this.menu.replaceChildren();
    for (const category of POLL_CATEGORIES) {
      this.menu.append(this.createOption(category));
    }
  }

  /** Creates a single option element with proper a11y attributes. */
  private createOption(category: string): HTMLLIElement {
    const item = document.createElement('li');
    item.className = 'sort__option';
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', 'false');
    item.dataset['category'] = category;
    item.textContent = category;
    return item;
  }

  /** Wires up click and keyboard handlers. */
  private attachEvents(): void {
    this.trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      this.toggle();
    });
    this.menu.addEventListener('click', (event) => this.handleOptionClick(event));
    document.addEventListener('click', (event) => this.handleDocumentClick(event));
    document.addEventListener('keydown', (event) => this.handleKeydown(event));
  }

  /** Toggles the menu's open state. */
  private toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /** Opens the menu and sets ARIA state. */
  private open(): void {
    this.isOpen = true;
    this.menu.hidden = false;
    this.trigger.setAttribute('aria-expanded', 'true');
  }

  /** Closes the menu and resets ARIA state. */
  private close(): void {
    this.isOpen = false;
    this.menu.hidden = true;
    this.trigger.setAttribute('aria-expanded', 'false');
  }

  /** Applies the picked category, or clears the filter when toggled off. */
  private handleOptionClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const option = target.closest<HTMLElement>('.sort__option');
    if (option === null) {
      return;
    }
    const category = option.dataset['category'] ?? null;
    const next = category === this.selectedCategory ? null : category;
    this.applySelection(next);
    this.close();
  }

  /** Updates internal state, the trigger label, ARIA flags, and the service. */
  private applySelection(category: string | null): void {
    this.selectedCategory = category;
    this.label.textContent = category ?? DEFAULT_LABEL;
    this.trigger.classList.toggle('sort--active', category !== null);
    for (const option of this.menu.querySelectorAll<HTMLElement>('.sort__option')) {
      const isSelected = option.dataset['category'] === category;
      option.setAttribute('aria-selected', String(isSelected));
      option.classList.toggle('sort__option--selected', isSelected);
    }
    this.pollService.setActiveCategory(category);
  }

  /** Closes the menu when the user clicks anywhere outside it. */
  private handleDocumentClick(event: Event): void {
    if (!this.isOpen) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    if (this.trigger.contains(target) || this.menu.contains(target)) {
      return;
    }
    this.close();
  }

  /** Closes the menu on Escape. */
  private handleKeydown(event: KeyboardEvent): void {
    if (this.isOpen && event.key === 'Escape') {
      this.close();
      this.trigger.focus();
    }
  }
}
