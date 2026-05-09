import type { PollService } from '../services/poll-service';
import type { Poll, PollOption } from '../types/poll';

import { requireElementById } from '../utils/dom';
import { calculatePercentage, formatDateTime, formatRelative } from '../utils/format';
import { hasUserVotedOnPoll, markUserVotedOnPoll } from '../utils/poll-vote-storage';

export interface PollDetailControllerOptions {
  readonly pollService: PollService;
}

export class PollDetailController {
  private readonly pollService: PollService;
  private readonly dialog: HTMLDialogElement;
  private readonly content: HTMLElement;
  private currentPollId: string | null = null;

  /** Caches service and dialog DOM for later renders. */
  public constructor(options: PollDetailControllerOptions) {
    this.pollService = options.pollService;
    this.dialog = requireElementById('poll-detail-dialog', HTMLDialogElement);
    this.content = requireElementById('poll-detail-content', HTMLElement);
    this.dialog.addEventListener('close', () => {
      this.currentPollId = null;
    });
  }

  /** Opens the modal for an active poll and renders its body. */
  public open(pollId: string): void {
    const poll = this.pollService.findPollById(pollId);
    if (poll === undefined || this.pollService.isPollEnded(poll)) {
      return;
    }
    this.currentPollId = pollId;
    this.render(poll);
    this.dialog.showModal();
  }

  /** Rebuilds content when the poll still exists in the service. */
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

  /** Replaces dialog children with header, columns, and footer. */
  private render(poll: Poll): void {
    const total = this.pollService.getTotalVotes(poll);
    const hasVoted = hasUserVotedOnPoll(poll.id);
    this.content.replaceChildren(
      this.buildHeader(poll),
      this.buildVotingColumn(poll, hasVoted),
      this.buildResultColumn(poll, total),
      this.buildFooter(),
    );
  }

  /** Builds title, meta, and optional description in the header. */
  private buildHeader(poll: Poll): HTMLElement {
    const header = document.createElement('header');
    header.className = 'poll-detail__header';
    header.append(buildHeaderTitle(poll.title), buildHeaderMeta(poll.deadline));
    if (poll.description.length > 0) {
      header.append(buildHeaderDescription(poll.description));
    }
    return header;
  }

  /** Builds the vote or “already voted” column. */
  private buildVotingColumn(poll: Poll, hasVoted: boolean): HTMLElement {
    const section = document.createElement('section');
    section.className = 'poll-detail__voting';
    section.setAttribute('aria-labelledby', 'poll-detail-voting-heading');
    section.append(buildSectionHeading('poll-detail-voting-heading', 'Deine Stimme'));
    section.append(hasVoted ? buildVotedNotice() : this.buildOptionList(poll));
    return section;
  }

  /** Builds a ul of clickable option buttons. */
  private buildOptionList(poll: Poll): HTMLUListElement {
    const list = document.createElement('ul');
    list.className = 'poll-detail__options';
    for (const option of poll.options) {
      list.append(this.buildOptionItem(poll.id, option));
    }
    return list;
  }

  /** Builds one li with a label button wired to handleVote. */
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

  /** Builds heading, total, and bar list for results. */
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

  /** Builds footer with a single close control. */
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

  /** Applies a vote once per poll and refreshes the dialog. */
  private handleVote(pollId: string, optionId: string): void {
    if (hasUserVotedOnPoll(pollId)) {
      return;
    }
    const updated = this.pollService.vote(pollId, optionId);
    if (updated === undefined) {
      return;
    }
    markUserVotedOnPoll(pollId);
    this.refresh();
  }
}

/** Creates the h2 title for the poll detail modal. */
function buildHeaderTitle(text: string): HTMLHeadingElement {
  const title = document.createElement('h2');
  title.className = 'poll-detail__title';
  title.id = 'poll-detail-title';
  title.textContent = text;
  return title;
}

/** Creates deadline-relative meta line text. */
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

/** Creates the optional body copy paragraph. */
function buildHeaderDescription(text: string): HTMLParagraphElement {
  const description = document.createElement('p');
  description.className = 'poll-detail__description';
  description.textContent = text;
  return description;
}

/** Creates an h3 section title with id for aria-labelledby. */
function buildSectionHeading(id: string, text: string): HTMLHeadingElement {
  const heading = document.createElement('h3');
  heading.className = 'poll-detail__section-title';
  heading.id = id;
  heading.textContent = text;
  return heading;
}

/** Shows the short notice after voting. */
function buildVotedNotice(): HTMLParagraphElement {
  const info = document.createElement('p');
  info.className = 'poll-detail__info';
  info.textContent = 'Danke! Du hast bereits abgestimmt.';
  return info;
}

/** Renders total vote count with pluralised noun. */
function buildTotalLabel(total: number): HTMLParagraphElement {
  const label = document.createElement('p');
  label.className = 'poll-detail__total';
  const noun = total === 1 ? 'Stimme' : 'Stimmen';
  label.textContent = `${total} ${noun} insgesamt`;
  return label;
}

/** Builds one li per option with bars derived from totals. */
function buildResultList(poll: Poll, total: number): HTMLUListElement {
  const list = document.createElement('ul');
  list.className = 'poll-results';
  for (const option of poll.options) {
    list.append(buildResultRow(option.label, option.votes, total));
  }
  return list;
}

/** Combines meta row and animated bar for one option. */
function buildResultRow(label: string, votes: number, total: number): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'poll-results__item';
  const percentage = calculatePercentage(votes, total);
  item.append(buildResultMeta(label, votes, percentage), buildResultBar(label, percentage));
  return item;
}

/** Shows label and numeric vote share for one row. */
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

/** Creates an ARIA progressbar div with an inner fill width. */
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
