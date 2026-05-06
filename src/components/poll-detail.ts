import type { PollService } from '../services/poll-service';
import type { Poll, PollOption } from '../types/poll';

import { requireElementById } from '../utils/dom';
import { calculatePercentage, formatDateTime, formatRelative } from '../utils/format';

const VOTED_POLLS_STORAGE_KEY = 'poll-app:voted-polls';

export interface PollDetailControllerOptions {
  readonly pollService: PollService;
}

/** Controls the poll detail dialog with voting and live results. */
export class PollDetailController {
  private readonly pollService: PollService;
  private readonly dialog: HTMLDialogElement;
  private readonly content: HTMLElement;
  private currentPollId: string | null = null;

  public constructor(options: PollDetailControllerOptions) {
    this.pollService = options.pollService;
    this.dialog = requireElementById('poll-detail-dialog', HTMLDialogElement);
    this.content = requireElementById('poll-detail-content', HTMLElement);
    this.dialog.addEventListener('close', () => {
      this.currentPollId = null;
    });
  }

  /** Opens the detail dialog for the given poll, ignoring ended polls. */
  public open(pollId: string): void {
    const poll = this.pollService.findPollById(pollId);
    if (poll === undefined || this.pollService.isPollEnded(poll)) {
      return;
    }
    this.currentPollId = pollId;
    this.render(poll);
    this.dialog.showModal();
  }

  /** Re-renders the dialog content if a poll is currently shown. */
  public refresh(): void {
    if (this.currentPollId === null) {
      return;
    }
    const poll = this.pollService.findPollById(this.currentPollId);
    if (poll === undefined) {
      return;
    }
    this.render(poll);
  }

  /** Replaces the dialog content with freshly built sections. */
  private render(poll: Poll): void {
    const total = this.pollService.getTotalVotes(poll);
    const hasVoted = this.hasUserVoted(poll.id);
    this.content.replaceChildren(
      this.buildHeader(poll),
      this.buildVotingColumn(poll, hasVoted),
      this.buildResultColumn(poll, total),
      this.buildFooter(),
    );
  }

  /** Builds the header with title, deadline meta, and optional description. */
  private buildHeader(poll: Poll): HTMLElement {
    const header = document.createElement('header');
    header.className = 'poll-detail__header';
    header.append(buildHeaderTitle(poll.title), buildHeaderMeta(poll.deadline));
    if (poll.description.length > 0) {
      header.append(buildHeaderDescription(poll.description));
    }
    return header;
  }

  /** Builds the voting column on the left of the detail layout. */
  private buildVotingColumn(poll: Poll, hasVoted: boolean): HTMLElement {
    const section = document.createElement('section');
    section.className = 'poll-detail__voting';
    section.setAttribute('aria-labelledby', 'poll-detail-voting-heading');
    section.append(buildSectionHeading('poll-detail-voting-heading', 'Deine Stimme'));
    section.append(hasVoted ? buildVotedNotice() : this.buildOptionList(poll));
    return section;
  }

  /** Builds the list of clickable voting options. */
  private buildOptionList(poll: Poll): HTMLUListElement {
    const list = document.createElement('ul');
    list.className = 'poll-detail__options';
    for (const option of poll.options) {
      list.append(this.buildOptionItem(poll.id, option));
    }
    return list;
  }

  /** Builds a single voting option list item with a click handler. */
  private buildOptionItem(pollId: string, option: PollOption): HTMLLIElement {
    const item = document.createElement('li');
    item.className = 'poll-detail__option';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button button--option';
    button.textContent = option.label;
    button.addEventListener('click', () => this.handleVote(pollId, option.id));
    item.append(button);
    return item;
  }

  /** Builds the result column with total label and per-option bars. */
  private buildResultColumn(poll: Poll, total: number): HTMLElement {
    const section = document.createElement('section');
    section.className = 'poll-detail__results';
    section.setAttribute('aria-labelledby', 'poll-detail-results-heading');
    section.append(
      buildSectionHeading('poll-detail-results-heading', 'Aktuelle Auswertung'),
      buildTotalLabel(total),
      buildResultList(poll, total),
    );
    return section;
  }

  /** Builds the footer with the close button. */
  private buildFooter(): HTMLElement {
    const footer = document.createElement('footer');
    footer.className = 'poll-detail__footer';
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'button button--secondary';
    closeButton.textContent = 'Schließen';
    closeButton.addEventListener('click', () => this.dialog.close());
    footer.append(closeButton);
    return footer;
  }

  /** Submits a vote when the user has not voted on this poll yet. */
  private handleVote(pollId: string, optionId: string): void {
    if (this.hasUserVoted(pollId)) {
      return;
    }
    const updated = this.pollService.vote(pollId, optionId);
    if (updated === undefined) {
      return;
    }
    this.markUserVoted(pollId);
    this.refresh();
  }

  /** Returns whether the current user has already voted on the poll. */
  private hasUserVoted(pollId: string): boolean {
    return readVotedPolls().has(pollId);
  }

  /** Persists that the current user has voted on the given poll. */
  private markUserVoted(pollId: string): void {
    const voted = readVotedPolls();
    voted.add(pollId);
    writeVotedPolls(voted);
  }
}

/** Builds the dialog title heading. */
function buildHeaderTitle(text: string): HTMLHeadingElement {
  const title = document.createElement('h2');
  title.className = 'poll-detail__title';
  title.id = 'poll-detail-title';
  title.textContent = text;
  return title;
}

/** Builds the meta paragraph describing the deadline state. */
function buildHeaderMeta(deadline: Date | null): HTMLParagraphElement {
  const meta = document.createElement('p');
  meta.className = 'poll-detail__meta';
  if (deadline === null) {
    meta.textContent = 'Diese Umfrage hat keine Deadline.';
    return meta;
  }
  meta.textContent = `Endet ${formatRelative(deadline)} (${formatDateTime(deadline)})`;
  return meta;
}

/** Builds the optional description paragraph. */
function buildHeaderDescription(text: string): HTMLParagraphElement {
  const description = document.createElement('p');
  description.className = 'poll-detail__description';
  description.textContent = text;
  return description;
}

/** Builds a section heading with the given ID and label. */
function buildSectionHeading(id: string, text: string): HTMLHeadingElement {
  const heading = document.createElement('h3');
  heading.className = 'poll-detail__section-title';
  heading.id = id;
  heading.textContent = text;
  return heading;
}

/** Builds the notice shown after the user has already voted. */
function buildVotedNotice(): HTMLParagraphElement {
  const info = document.createElement('p');
  info.className = 'poll-detail__info';
  info.textContent = 'Danke! Du hast bereits abgestimmt.';
  return info;
}

/** Builds the total-votes label of the result column. */
function buildTotalLabel(total: number): HTMLParagraphElement {
  const label = document.createElement('p');
  label.className = 'poll-detail__total';
  const noun = total === 1 ? 'Stimme' : 'Stimmen';
  label.textContent = `${total} ${noun} insgesamt`;
  return label;
}

/** Builds the result list with one bar per option. */
function buildResultList(poll: Poll, total: number): HTMLUListElement {
  const list = document.createElement('ul');
  list.className = 'poll-results';
  for (const option of poll.options) {
    list.append(buildResultRow(option.label, option.votes, total));
  }
  return list;
}

/** Builds a single result row with header meta and progress bar. */
function buildResultRow(label: string, votes: number, total: number): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'poll-results__item';
  const percentage = calculatePercentage(votes, total);
  item.append(buildResultMeta(label, votes, percentage), buildResultBar(label, percentage));
  return item;
}

/** Builds the meta header showing label and numeric value of the row. */
function buildResultMeta(label: string, votes: number, percentage: number): HTMLElement {
  const meta = document.createElement('header');
  meta.className = 'poll-results__meta';
  const labelElement = document.createElement('span');
  labelElement.className = 'poll-results__label';
  labelElement.textContent = label;
  const value = document.createElement('span');
  value.className = 'poll-results__value';
  value.textContent = `${votes} (${percentage}%)`;
  meta.append(labelElement, value);
  return meta;
}

/** Builds the progress-bar element of a result row. */
function buildResultBar(label: string, percentage: number): HTMLDivElement {
  const bar = document.createElement('div');
  bar.className = 'poll-results__bar';
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  bar.setAttribute('aria-valuenow', String(percentage));
  bar.setAttribute('aria-label', `${label}: ${percentage} percent`);
  const fill = document.createElement('div');
  fill.className = 'poll-results__bar-fill';
  fill.style.width = `${percentage}%`;
  bar.append(fill);
  return bar;
}

/** Parses stored JSON into poll IDs; invalid shapes yield an empty set. */
function parseVotedPollIds(raw: string): Set<string> {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    return new Set();
  }
  return new Set(parsed.filter((value): value is string => typeof value === 'string'));
}

/** Reads voted poll IDs from localStorage; failures yield an empty set. */
function readVotedPolls(): Set<string> {
  try {
    const raw = window.localStorage.getItem(VOTED_POLLS_STORAGE_KEY);
    if (raw === null) {
      return new Set();
    }
    return parseVotedPollIds(raw);
  } catch {
    return new Set();
  }
}

/** Writes the set of voted poll IDs to localStorage, ignoring storage errors. */
function writeVotedPolls(voted: Set<string>): void {
  try {
    window.localStorage.setItem(
      VOTED_POLLS_STORAGE_KEY,
      JSON.stringify(Array.from(voted)),
    );
  } catch {
  }
}
