import type { PollService } from '../services/poll-service.js';
import type { Poll, PollTab } from '../types/poll.js';

import { requireElementById } from '../utils/dom.js';
import { createPollCard } from './poll-card.js';

export interface PollListControllerOptions {
  readonly pollService: PollService;
  readonly onPollSelect: (pollId: string) => void;
}

interface ListElements {
  readonly endingSoonSection: HTMLElement;
  readonly endingSoonList: HTMLUListElement;
  readonly activeList: HTMLUListElement;
  readonly activeEmpty: HTMLElement;
  readonly pastList: HTMLUListElement;
  readonly pastEmpty: HTMLElement;
}

/** Controls the homescreen lists: ending-soon, active, and past polls. */
export class PollListController {
  private readonly pollService: PollService;
  private readonly onPollSelect: (pollId: string) => void;
  private readonly elements: ListElements;
  private readonly tabButtons: ReadonlyArray<HTMLButtonElement>;
  private readonly tabPanels: Readonly<Record<PollTab, HTMLElement>>;
  private currentTab: PollTab = 'active';

  public constructor(options: PollListControllerOptions) {
    this.pollService = options.pollService;
    this.onPollSelect = options.onPollSelect;
    this.elements = this.queryListElements();
    this.tabButtons = this.queryTabButtons();
    this.tabPanels = this.queryTabPanels();
    this.attachTabEvents();
  }

  /** Re-renders all three poll lists from the current service state. */
  public render(): void {
    this.renderEndingSoon();
    this.renderActive();
    this.renderPast();
  }

  /** Looks up all DOM elements that hold the poll lists. */
  private queryListElements(): ListElements {
    return {
      endingSoonSection: requireElementById('ending-soon-section', HTMLElement),
      endingSoonList: requireElementById('ending-soon-list', HTMLUListElement),
      activeList: requireElementById('active-polls-list', HTMLUListElement),
      activeEmpty: requireElementById('active-polls-empty', HTMLElement),
      pastList: requireElementById('past-polls-list', HTMLUListElement),
      pastEmpty: requireElementById('past-polls-empty', HTMLElement),
    };
  }

  /** Looks up the two tab buttons. */
  private queryTabButtons(): ReadonlyArray<HTMLButtonElement> {
    return [
      requireElementById('tab-active', HTMLButtonElement),
      requireElementById('tab-past', HTMLButtonElement),
    ];
  }

  /** Looks up the two tab panels keyed by tab name. */
  private queryTabPanels(): Readonly<Record<PollTab, HTMLElement>> {
    return {
      active: requireElementById('tab-panel-active', HTMLElement),
      past: requireElementById('tab-panel-past', HTMLElement),
    };
  }

  /** Renders the optional ending-soon section above the main list. */
  private renderEndingSoon(): void {
    const polls = this.pollService.getEndingSoonPolls();
    this.elements.endingSoonList.replaceChildren();
    if (polls.length === 0) {
      this.elements.endingSoonSection.hidden = true;
      return;
    }
    this.elements.endingSoonSection.hidden = false;
    this.appendCards(this.elements.endingSoonList, polls, true, true);
  }

  /** Renders the active polls list and toggles the empty state. */
  private renderActive(): void {
    const polls = this.pollService.getActivePolls();
    this.elements.activeList.replaceChildren();
    this.elements.activeEmpty.hidden = polls.length > 0;
    this.appendCards(this.elements.activeList, polls, true, false);
  }

  /** Renders the past polls list and toggles the empty state. */
  private renderPast(): void {
    const polls = this.pollService.getPastPolls();
    this.elements.pastList.replaceChildren();
    this.elements.pastEmpty.hidden = polls.length > 0;
    this.appendCards(this.elements.pastList, polls, false, false);
  }

  /** Appends a card per poll to the target list. */
  private appendCards(
    list: HTMLUListElement,
    polls: ReadonlyArray<Poll>,
    isInteractive: boolean,
    highlight: boolean,
  ): void {
    for (const poll of polls) {
      list.append(createPollCard({
        poll,
        isInteractive,
        highlight,
        onSelect: this.onPollSelect,
      }));
    }
  }

  /** Wires click and keyboard events on the tab buttons. */
  private attachTabEvents(): void {
    for (const button of this.tabButtons) {
      button.addEventListener('click', () => this.handleTabClick(button));
      button.addEventListener('keydown', (event) => this.handleTabKey(event));
    }
  }

  /** Handles a click on a tab button. */
  private handleTabClick(button: HTMLButtonElement): void {
    const tabValue = button.dataset['tab'];
    if (tabValue === 'active' || tabValue === 'past') {
      this.activateTab(tabValue);
    }
  }

  /** Switches tabs on left/right arrow keys. */
  private handleTabKey(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }
    event.preventDefault();
    const nextTab: PollTab = this.currentTab === 'active' ? 'past' : 'active';
    this.activateTab(nextTab);
  }

  /** Activates the given tab and updates ARIA, focus, and visibility. */
  private activateTab(tab: PollTab): void {
    if (tab === this.currentTab) {
      return;
    }
    this.currentTab = tab;
    this.updateTabButtonStates(tab);
    this.tabPanels.active.hidden = tab !== 'active';
    this.tabPanels.past.hidden = tab !== 'past';
  }

  /** Updates active/inactive state on every tab button. */
  private updateTabButtonStates(activeTab: PollTab): void {
    for (const button of this.tabButtons) {
      const isActive = button.dataset['tab'] === activeTab;
      button.classList.toggle('tabs__tab--active', isActive);
      button.setAttribute('aria-selected', String(isActive));
      button.tabIndex = isActive ? 0 : -1;
      if (isActive) {
        button.focus();
      }
    }
  }
}
