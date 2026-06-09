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

  /**
   * Caches service and dialog DOM for later renders.
   * @param options - Controller dependencies, including the poll service.
   */
  public constructor(options: PollDetailControllerOptions) {
    this.pollService = options.pollService;
    this.dialog = requireElementById('poll-detail-dialog', HTMLDialogElement);
    this.content = requireElementById('poll-detail-content', HTMLElement);
    this.dialog.addEventListener('close', () => {
      this.currentPollId = null;
    });
  }

  /**
   * Opens the modal for an active poll and renders its body.
   * @param pollId - Poll to load and display in the detail dialog.
   */
  public open(pollId: string): void {
    void this.openPoll(pollId);
  }

  /**
   * Loads survey detail before showing the modal.
   * @param pollId - Poll to fetch and render.
   * @remarks Aborts when the poll is missing or already ended.
   */
  private async openPoll(pollId: string): Promise<void> {
    const poll = await this.pollService.ensurePollDetail(pollId);
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

  /**
   * Replaces dialog children with header, columns, and footer.
   * @param poll - Poll whose detail layout should be rendered.
   */
  private render(poll: Poll): void {
    const total = this.pollService.getTotalVotes(poll);
    const hasVoted = hasUserVotedOnPoll(poll.id);
    this.content.replaceChildren(
      this.buildHeader(poll),
      this.buildVotingColumn(poll, hasVoted),
      this.buildResultColumn(poll, total),
      this.buildFooter(poll),
    );
  }

  /**
   * Builds title, meta, and optional description in the header.
   * @param poll - Poll whose title, deadline, and description are shown.
   * @returns Header element for the detail dialog.
   */
  private buildHeader(poll: Poll): HTMLElement {
    const header = document.createElement('header');
    header.className = 'poll-detail__header';
    header.append(buildHeaderTitle(poll.title), buildHeaderMeta(poll.deadline));
    if (poll.description.length > 0) {
      header.append(buildHeaderDescription(poll.description));
    }
    return header;
  }

  /**
   * Builds the vote or “already voted” column.
   * @param poll - Poll whose options or voted notice are shown.
   * @param hasVoted - Whether the visitor has already voted on this poll.
   * @returns Voting section element for the detail dialog.
   */
  private buildVotingColumn(poll: Poll, hasVoted: boolean): HTMLElement {
    const section = document.createElement('section');
    section.className = 'poll-detail__voting';
    section.setAttribute('aria-labelledby', 'poll-detail-voting-heading');
    section.append(buildSectionHeading('poll-detail-voting-heading', 'Your vote'));
    section.append(hasVoted ? buildVotedNotice() : this.buildOptionList(poll));
    return section;
  }

  /**
   * Builds a ul of clickable option buttons.
   * @param poll - Poll whose answer options are rendered.
   * @returns Unordered list of vote option buttons.
   */
  private buildOptionList(poll: Poll): HTMLUListElement {
    const list = document.createElement('ul');
    list.className = 'poll-detail__options';
    for (const option of poll.options) {
      list.append(this.buildOptionItem(poll.id, option));
    }
    return list;
  }

  /**
   * Builds one li with a label button wired to handleVote.
   * @param pollId - Poll receiving the vote.
   * @param option - Answer option rendered as a vote button.
   * @returns List item containing one vote option button.
   */
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

  /**
   * Builds heading, total, and bar list for results.
   * @param poll - Poll whose result bars are rendered.
   * @param total - Total votes across all options.
   * @returns Results section element for the detail dialog.
   */
  private buildResultColumn(poll: Poll, total: number): HTMLElement {
    const section = document.createElement('section');
    section.className = 'poll-detail__results';
    section.setAttribute('aria-labelledby', 'poll-detail-results-heading');
    section.append(
      buildSectionHeading('poll-detail-results-heading', 'Current results'),
      buildTotalLabel(total),
      buildResultList(poll, total),
    );
    return section;
  }

  /**
   * Builds footer with optional full-survey link and close control.
   * @param poll - Poll used to decide whether the full-survey link appears.
   * @returns Footer element for the detail dialog.
   */
  private buildFooter(poll: Poll): HTMLElement {
    const footer = document.createElement('footer');
    footer.className = 'poll-detail__footer';
    if (this.shouldShowFullSurveyLink(poll)) {
      footer.append(buildFullSurveyLink(poll.id));
    }
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'button button--secondary';
    closeButton.textContent = 'Close';
    closeButton.addEventListener('click', () => this.dialog.close());
    footer.append(closeButton);
    return footer;
  }

  /**
   * True when the modal should link to the full multi-question view.
   * @param poll - Poll whose question count is inspected.
   * @returns `true` when the poll has more than one question.
   */
  private shouldShowFullSurveyLink(poll: Poll): boolean {
    const questionCount = poll.questions?.length ?? 0;
    return questionCount > 1;
  }

  /**
   * Applies a vote once per poll and refreshes the dialog.
   * @param pollId - Poll receiving the vote.
   * @param optionId - Selected answer option id.
   */
  private handleVote(pollId: string, optionId: string): void {
    void this.castDetailVote(pollId, optionId);
  }

  /**
   * Casts one vote on the first question through Supabase.
   * @param pollId - Poll receiving the vote.
   * @param optionId - Selected answer option id.
   * @remarks No-ops when the visitor already voted or required question data is missing.
   */
  private async castDetailVote(pollId: string, optionId: string): Promise<void> {
    if (hasUserVotedOnPoll(pollId)) {
      return;
    }
    const poll = await this.pollService.ensurePollDetail(pollId);
    if (poll === undefined) {
      return;
    }
    const questionId = this.pollService.getFirstQuestion(poll)?.id;
    if (questionId === undefined) {
      return;
    }
    const updated = await this.pollService.voteOnQuestion(pollId, questionId, optionId);
    if (updated === undefined) {
      return;
    }
    markUserVotedOnPoll(pollId, optionId);
    this.refresh();
  }
}

/**
 * Creates a router link to the full survey results page.
 * @param pollId - Poll id used in the results route.
 * @returns Anchor styled as a primary button.
 */
function buildFullSurveyLink(pollId: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.className = 'button button--primary';
  link.href = `/survey-view-results/${pollId}`;
  link.textContent = 'Open full survey';
  return link;
}

/**
 * Creates the h2 title for the poll detail modal.
 * @param text - Poll title text.
 * @returns Heading element for the detail title.
 */
function buildHeaderTitle(text: string): HTMLHeadingElement {
  const title = document.createElement('h2');
  title.className = 'poll-detail__title';
  title.id = 'poll-detail-title';
  title.textContent = text;
  return title;
}

/**
 * Creates deadline-relative meta line text.
 * @param deadline - Poll deadline, or `null` when open-ended.
 * @returns Paragraph describing the deadline state.
 */
function buildHeaderMeta(deadline: Date | null): HTMLParagraphElement {
  const meta = document.createElement('p');
  meta.className = 'poll-detail__meta';
  if (deadline === null) {
    meta.textContent = 'This survey has no deadline.';
    return meta;
  }
  meta.textContent = `Ends ${formatRelative(deadline)} (${formatDateTime(deadline)})`;
  return meta;
}

/**
 * Creates the optional body copy paragraph.
 * @param text - Poll description text.
 * @returns Paragraph element for the description block.
 */
function buildHeaderDescription(text: string): HTMLParagraphElement {
  const description = document.createElement('p');
  description.className = 'poll-detail__description';
  description.textContent = text;
  return description;
}

/**
 * Creates an h3 section title with id for aria-labelledby.
 * @param id - Element id referenced by `aria-labelledby`.
 * @param text - Visible section heading text.
 * @returns Heading element for a detail section.
 */
function buildSectionHeading(id: string, text: string): HTMLHeadingElement {
  const heading = document.createElement('h3');
  heading.className = 'poll-detail__section-title';
  heading.id = id;
  heading.textContent = text;
  return heading;
}

/**
 * Shows the short notice after voting.
 * @returns Paragraph informing the visitor they already voted.
 */
function buildVotedNotice(): HTMLParagraphElement {
  const info = document.createElement('p');
  info.className = 'poll-detail__info';
  info.textContent = 'Thanks! You have already voted.';
  return info;
}

/**
 * Renders total vote count with pluralised noun.
 * @param total - Total votes across all options.
 * @returns Paragraph showing the aggregate vote count.
 */
function buildTotalLabel(total: number): HTMLParagraphElement {
  const label = document.createElement('p');
  label.className = 'poll-detail__total';
  const noun = total === 1 ? 'vote' : 'votes';
  label.textContent = `${total} ${noun} total`;
  return label;
}

/**
 * Builds one li per option with bars derived from totals.
 * @param poll - Poll whose options contribute to the result list.
 * @param total - Total votes used to compute percentages.
 * @returns Unordered list of result rows.
 */
function buildResultList(poll: Poll, total: number): HTMLUListElement {
  const list = document.createElement('ul');
  list.className = 'poll-results';
  for (const option of poll.options) {
    list.append(buildResultRow(option.label, option.votes, total));
  }
  return list;
}

/**
 * Combines meta row and animated bar for one option.
 * @param label - Option label shown in the result row.
 * @param votes - Vote count for the option.
 * @param total - Total votes used to compute the percentage.
 * @returns List item containing result meta and progress bar.
 */
function buildResultRow(label: string, votes: number, total: number): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'poll-results__item';
  const percentage = calculatePercentage(votes, total);
  item.append(buildResultMeta(label, votes, percentage), buildResultBar(label, percentage));
  return item;
}

/**
 * Shows label and numeric vote share for one row.
 * @param label - Option label shown in the result row.
 * @param votes - Vote count for the option.
 * @param percentage - Rounded vote share from {@link calculatePercentage}.
 * @returns Header element with label and vote summary.
 */
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

/**
 * Creates an ARIA progressbar div with an inner fill width.
 * @param label - Option label used in the progressbar aria label.
 * @param percentage - Fill width percentage from 0 to 100.
 * @returns Progress bar container with sized inner fill.
 */
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
