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

export class CategoryListDropdown {
  private readonly opts: CategoryListDropdownOptions;
  private isOpen = false;
  private readonly onTriggerClick = (event: MouseEvent): void => {
    if (!this.isToggleClickTarget(event)) {
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

  /**
   * Binds trigger/menu listeners and renders category options.
   * @param options - Dropdown DOM nodes, category list, and selection callbacks.
   */
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

  /**
   * Removes document listeners (call from Angular OnDestroy or route teardown).
   */
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

  /** Rebuilds listbox options from the configured category list. */
  private renderOptions(): void {
    this.opts.menu.replaceChildren();
    for (const category of this.opts.categories) {
      this.opts.menu.append(this.createOption(category));
    }
  }

  /**
   * Creates one selectable listbox option element.
   * @param category - Category label and dataset id for the option.
   * @returns List item configured as a listbox option.
   */
  private createOption(category: string): HTMLLIElement {
    const item = document.createElement('li');
    item.className = 'category-dropdown__option';
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', 'false');
    item.dataset['category'] = category;
    item.textContent = category;
    return item;
  }

  /**
   * True when a trigger click landed on the label text or the chevron icon.
   * @param event - Click event from the trigger button.
   * @returns Whether the click may toggle the menu; empty button areas are ignored.
   */
  private isToggleClickTarget(event: MouseEvent): boolean {
    const target = event.target;
    if (!(target instanceof Node)) {
      return false;
    }
    if (this.opts.label.contains(target)) {
      return true;
    }
    const chevronWrap = this.opts.trigger.querySelector(
      '.category-dropdown__chevron-wrap',
    );
    return chevronWrap?.contains(target) ?? false;
  }

  /** Opens or closes the dropdown menu. */
  private toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /** Shows the menu and marks the trigger expanded. */
  private open(): void {
    this.isOpen = true;
    this.opts.menu.hidden = false;
    this.opts.trigger.setAttribute('aria-expanded', 'true');
  }

  /** Hides the menu and marks the trigger collapsed. */
  private close(): void {
    this.isOpen = false;
    this.opts.menu.hidden = true;
    this.opts.trigger.setAttribute('aria-expanded', 'false');
  }

  /**
   * Applies a category selection from a listbox option click.
   * @param event - Click event from the options menu.
   */
  private handleOptionClick(event: Event): void {
    const category = this.readClickedCategory(event);
    if (category === null) {
      return;
    }
    this.applyCategorySelection(category);
  }

  /**
   * Reads the category id from a listbox option click target.
   * @param event - Click event from the options menu.
   * @returns Category id from the nearest option, or `null` when not on an option.
   */
  private readClickedCategory(event: Event): string | null {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return null;
    }
    const option = target.closest<HTMLElement>('.category-dropdown__option');
    return option?.dataset['category'] ?? null;
  }

  /**
   * Stores the next category value and refreshes dropdown UI.
   * @param category - Category chosen from the listbox.
   * @remarks Retoggling the current category clears the selection when
   * {@link CategoryListDropdownOptions.allowClearByRetoggle} is enabled.
   */
  private applyCategorySelection(category: string): void {
    const current = this.opts.getSelection();
    const next =
      this.opts.allowClearByRetoggle && category === current ? null : category;
    this.opts.setSelection(next);
    this.syncUi();
    this.close();
  }

  /** Syncs label, caption, trigger classes, and option aria state. */
  private syncUi(): void {
    const selected = this.opts.getSelection();
    this.syncTriggerLabel(selected);
    this.syncSelectionCaption(selected);
    this.syncTriggerActiveClass(selected);
    this.syncOptionStates(selected);
  }

  /**
   * Resets the trigger label to the placeholder text.
   * @param selected - Currently selected category, if any.
   */
  private syncTriggerLabel(selected: string | null): void {
    this.opts.label.textContent = this.opts.placeholder;
    this.opts.trigger.classList.toggle(
      'category-dropdown__trigger--has-selection',
      selected !== null,
    );
  }

  /**
   * Updates the optional second-line selection caption.
   * @param selected - Currently selected category, if any.
   */
  private syncSelectionCaption(selected: string | null): void {
    const caption = this.opts.selectionCaption;
    if (caption === undefined || caption === null) {
      return;
    }
    if (selected === null) {
      caption.textContent = '';
      caption.hidden = true;
      return;
    }
    caption.textContent = selected;
    caption.hidden = false;
  }

  /**
   * Toggles the optional active class on the trigger button.
   * @param selected - Currently selected category, if any.
   */
  private syncTriggerActiveClass(selected: string | null): void {
    const activeClass = this.opts.triggerActiveClass;
    if (activeClass === undefined || activeClass.length === 0) {
      return;
    }
    this.opts.trigger.classList.toggle(activeClass, selected !== null);
  }

  /**
   * Marks the matching listbox option as selected.
   * @param selected - Currently selected category, if any.
   */
  private syncOptionStates(selected: string | null): void {
    for (const node of this.opts.menu.querySelectorAll<HTMLElement>(
      '.category-dropdown__option',
    )) {
      const isSelected = node.dataset['category'] === selected;
      node.setAttribute('aria-selected', String(isSelected));
      node.classList.toggle('category-dropdown__option--selected', isSelected);
    }
  }

  /**
   * Closes the menu when the user clicks outside the dropdown.
   * @param event - Document-level pointer down used for outside-click detection.
   * @remarks Uses capture phase and ignores non-primary buttons.
   */
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

  /**
   * Closes the menu on Escape and returns focus to the trigger.
   * @param event - Document-level keydown handler.
   */
  private handleKeydown(event: KeyboardEvent): void {
    if (this.isOpen && event.key === 'Escape') {
      this.close();
      this.opts.trigger.focus();
    }
  }
}
