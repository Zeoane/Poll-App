/** Shared behavior for category picker dropdowns (home sort filter & create survey). */

export interface CategoryListDropdownOptions {
  readonly trigger: HTMLButtonElement;
  readonly menu: HTMLUListElement;
  readonly label: HTMLElement;
  readonly placeholder: string;
  readonly categories: readonly string[];
  /** When true, choosing the already selected category clears the selection. */
  readonly allowClearByRetoggle: boolean;
  readonly getSelection: () => string | null;
  readonly setSelection: (category: string | null) => void;
  /** Optional class toggled on the trigger when a category is selected. */
  readonly triggerActiveClass?: string;
  /** Optional second line: shows selected category while {@link label} stays on {@link placeholder}. */
  readonly selectionCaption?: HTMLElement | null;
}

const CHEVRON_WRAP_SELECTOR = '.category-dropdown__chevron-wrap';

export class CategoryListDropdown {
  private readonly opts: CategoryListDropdownOptions;
  private isOpen = false;
  private readonly onTriggerClick = (event: MouseEvent): void => {
    if (!this.isChevronInteraction(event.target)) {
      return;
    }
    event.stopPropagation();
    this.toggle();
  };
  private readonly onTriggerKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    this.toggle();
  };
  private readonly onMenuClick = (event: Event): void => {
    this.handleOptionClick(event);
  };
  private readonly onDocumentPointerDown = (event: PointerEvent): void => {
    this.handleDocumentPointerDown(event);
  };
  private readonly onDocumentKeydown = (event: KeyboardEvent): void => {
    this.handleKeydown(event);
  };

  public constructor(options: CategoryListDropdownOptions) {
    this.opts = options;
    this.renderOptions();
    this.syncUi();
    this.close();
    this.opts.trigger.addEventListener('click', this.onTriggerClick);
    this.opts.trigger.addEventListener('keydown', this.onTriggerKeydown);
    this.opts.menu.addEventListener('click', this.onMenuClick);
    document.addEventListener('pointerdown', this.onDocumentPointerDown, true);
    document.addEventListener('keydown', this.onDocumentKeydown);
  }

  /** Removes document listeners (call from Angular OnDestroy or route teardown). */
  public destroy(): void {
    this.opts.trigger.removeEventListener('click', this.onTriggerClick);
    this.opts.trigger.removeEventListener('keydown', this.onTriggerKeydown);
    this.opts.menu.removeEventListener('click', this.onMenuClick);
    document.removeEventListener(
      'pointerdown',
      this.onDocumentPointerDown,
      true,
    );
    document.removeEventListener('keydown', this.onDocumentKeydown);
    this.close();
  }

  private renderOptions(): void {
    this.opts.menu.replaceChildren();
    for (const category of this.opts.categories) {
      this.opts.menu.append(this.createOption(category));
    }
  }

  private createOption(category: string): HTMLLIElement {
    const item = document.createElement('li');
    item.className = 'category-dropdown__option';
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', 'false');
    item.dataset['category'] = category;
    item.textContent = category;
    return item;
  }

  private isChevronInteraction(target: EventTarget | null): boolean {
    if (!(target instanceof Node)) {
      return false;
    }
    const wrap = this.opts.trigger.querySelector(CHEVRON_WRAP_SELECTOR);
    return wrap !== null && wrap.contains(target);
  }

  private toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  private open(): void {
    this.isOpen = true;
    this.opts.menu.hidden = false;
    this.opts.trigger.setAttribute('aria-expanded', 'true');
  }

  private close(): void {
    this.isOpen = false;
    this.opts.menu.hidden = true;
    this.opts.trigger.setAttribute('aria-expanded', 'false');
  }

  private handleOptionClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const option = target.closest<HTMLElement>('.category-dropdown__option');
    if (option === null) {
      return;
    }
    const category = option.dataset['category'] ?? null;
    if (category === null) {
      return;
    }
    const current = this.opts.getSelection();
    const next =
      this.opts.allowClearByRetoggle && category === current ? null : category;
    this.opts.setSelection(next);
    this.syncUi();
    this.close();
  }

  private syncUi(): void {
    const selected = this.opts.getSelection();
    this.opts.label.textContent = this.opts.placeholder;
    this.opts.trigger.classList.toggle(
      'category-dropdown__trigger--has-selection',
      selected !== null,
    );
    const caption = this.opts.selectionCaption;
    if (caption !== undefined && caption !== null) {
      if (selected === null) {
        caption.textContent = '';
        caption.hidden = true;
      } else {
        caption.textContent = selected;
        caption.hidden = false;
      }
    }
    const activeClass = this.opts.triggerActiveClass;
    if (activeClass !== undefined && activeClass.length > 0) {
      this.opts.trigger.classList.toggle(activeClass, selected !== null);
    }
    for (const node of this.opts.menu.querySelectorAll<HTMLElement>(
      '.category-dropdown__option',
    )) {
      const isSelected = node.dataset['category'] === selected;
      node.setAttribute('aria-selected', String(isSelected));
      node.classList.toggle('category-dropdown__option--selected', isSelected);
    }
  }

  private handleDocumentPointerDown(event: PointerEvent): void {
    if (!this.isOpen) {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    const path = event.composedPath();
    if (path.includes(this.opts.trigger) || path.includes(this.opts.menu)) {
      return;
    }
    this.close();
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (this.isOpen && event.key === 'Escape') {
      this.close();
      this.opts.trigger.focus();
    }
  }
}
