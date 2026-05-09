import {
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { getSharedPollService } from '../app-legacy-bootstrap';
import { SurveyViewResultsDemoQuestionsComponent } from './survey-view-results-demo-questions.component';
import { SurveyViewResultsLivePanelComponent } from './survey-view-results-live-panel.component';
import type { PollService } from '../../services/poll-service';
import {
  type Poll,
  type PollOption,
  POLL_TITLE_MAX_CHARS,
  POLL_TITLE_MAX_WORDS,
} from '../../types/poll';
import { calculatePercentage } from '../../utils/format';
import { hasUserVotedOnPoll, markUserVotedOnPoll } from '../../utils/poll-vote-storage';

const PREVIEW_DESCRIPTION =
  'We want to create team activities that everyone will enjoy – share your preferences and ideas in our survey to help us plan better experiences together.';

const COMPLETE_POLL_OPTIONS: readonly string[] = [
  '19.09.2025, Friday',
  '10.10.2025, Saturday',
  '11.10.2025, Saturday',
  '31.10.2025, Friday',
];

const TEMPLATE_SURVEY_NAME =
  "Let's Plan the Next Team Event Together";

/** Counts words in a trimmed survey title string. */
function countTitleWords(title: string): number {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

/** Formats a deadline as yyyy-mm-dd for display bindings. */
function deadlineToEndsOnInput(deadline: Date | null): string {
  if (deadline === null) {
    return '';
  }
  const y = deadline.getFullYear();
  const m = String(deadline.getMonth() + 1).padStart(2, '0');
  const d = String(deadline.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Builds an end-of-day Date from numeric y/m/d parts or returns null. */
function dateFromYmdParts(parts: number[]): Date | null {
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (
    y === undefined ||
    m === undefined ||
    d === undefined ||
    Number.isNaN(y) ||
    Number.isNaN(m) ||
    Number.isNaN(d)
  ) {
    return null;
  }
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

@Component({
  selector: 'app-survey-view-results',
  standalone: true,
  imports: [
    RouterLink,
    SurveyViewResultsDemoQuestionsComponent,
    SurveyViewResultsLivePanelComponent,
  ],
  templateUrl: './survey-view-results.component.html',
  styleUrl: './survey-view-results.component.css',
})
export class SurveyViewResultsComponent {
  private readonly router = inject(Router);
  private readonly pollListenerUnsubHolder: {
    unsubscribe: (() => void) | null;
  } = { unsubscribe: null };

  public viewMode: 'template' | 'poll' = 'template';

  public currentPoll: Poll | null = null;

  public surveyName = TEMPLATE_SURVEY_NAME;

  public surveyDescription = PREVIEW_DESCRIPTION;

  public category = 'Team activities';

  public endsOn = '2025-09-01';

  public surveyStatus: 'draft' | 'published' = 'draft';

  public completeError: string | null = null;

  /** Subscribes to the route poll id and clears listeners on destroy. */
  public constructor() {
    const route = inject(ActivatedRoute);
    inject(DestroyRef).onDestroy(() => {
      this.detachPollListener();
    });

    route.paramMap.pipe(takeUntilDestroyed()).subscribe((pm) => {
      const pollId = pm.get('pollId');
      this.applyRoutePollId(pollId !== '' ? pollId : null);
    });
  }

  /** Hint shown under the voting question based on poll state. */
  public pollVoteHint(): string {
    if (this.viewMode !== 'poll' || this.currentPoll === null) {
      return '';
    }
    const svc = getSharedPollService();
    if (svc.isPollEnded(this.currentPoll)) {
      return 'This survey has closed; totals are shown on the right.';
    }
    if (hasUserVotedOnPoll(this.currentPoll.id)) {
      return 'Thanks — your vote has been counted.';
    }
    return 'Choose one option to vote. Results update immediately.';
  }

  /** Disables voting after close or after the user has voted. */
  public pollInteractionLocked(): boolean {
    if (this.viewMode !== 'poll' || this.currentPoll === null) {
      return true;
    }
    const svc = getSharedPollService();
    if (svc.isPollEnded(this.currentPoll)) {
      return true;
    }
    return hasUserVotedOnPoll(this.currentPoll.id);
  }

  /** Casts a vote when the poll is open and the user has not voted. */
  public voteForOption(optionId: string): void {
    const poll = this.currentPoll;
    if (poll === null || this.pollInteractionLocked()) {
      return;
    }
    if (hasUserVotedOnPoll(poll.id)) {
      return;
    }
    const updated = getSharedPollService().vote(poll.id, optionId);
    if (updated === undefined) {
      return;
    }
    markUserVotedOnPoll(poll.id);
  }

  /** Prefix for option index in the voting list (e.g. "A."). */
  public optionLetter(idx: number): string {
    return `${String.fromCharCode(65 + idx)}.`;
  }

  /** Bare letter label for live result bars. */
  public optionLetterBare(idx: number): string {
    return String.fromCharCode(65 + idx);
  }

  /** Percent width for one option in the live chart. */
  public optionVotePercent(option: PollOption): number {
    const poll = this.currentPoll;
    if (!poll) {
      return 0;
    }
    const svc = getSharedPollService();
    const total = svc.getTotalVotes(poll);
    return calculatePercentage(option.votes, total);
  }

  /** Sidebar uses instant bar widths when showing a real poll. */
  public get instantResultsClass(): boolean {
    return this.viewMode === 'poll' && this.currentPoll !== null;
  }

  /** True when the routed poll has zero total votes. */
  public get liveResultsAreEmpty(): boolean {
    if (this.viewMode !== 'poll' || this.currentPoll === null) {
      return false;
    }
    return getSharedPollService().getTotalVotes(this.currentPoll) === 0;
  }

  /** True when viewing an ended poll on its public page. */
  public get pollViewClosed(): boolean {
    if (this.viewMode !== 'poll' || this.currentPoll === null) {
      return false;
    }
    return getSharedPollService().isPollEnded(this.currentPoll);
  }

  /** Status chip label for template vs live poll views. */
  public statusLabel(): string {
    if (this.viewMode === 'poll' && this.currentPoll !== null) {
      return this.pollViewClosed ? 'Closed' : 'Published';
    }
    return this.surveyStatus === 'published' ? 'Published' : 'Draft';
  }

  /** Draft-style chip when template is draft or poll ended. */
  public statusIsDraftStyle(): boolean {
    return (
      (this.viewMode === 'template' && this.surveyStatus === 'draft') ||
      this.pollViewClosed
    );
  }

  /** Published-style chip when not in draft styling. */
  public statusIsPublishedStyle(): boolean {
    return !this.statusIsDraftStyle();
  }

  /** Human-readable end date from the yyyy-mm-dd model field. */
  public get endsDisplay(): string {
    const raw = this.endsOn?.trim() ?? '';
    if (raw.length === 0) {
      return '—';
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return '—';
    }
    const [y, m, d] = raw.split('-');
    return `${d}.${m}.${y}`;
  }

  /** Validates the template preview then creates the poll and navigates home. */
  public completeSurvey(): void {
    if (this.viewMode === 'poll') {
      return;
    }
    const err = this.validateCompleteForm();
    if (err !== null) {
      this.completeError = err;
      return;
    }
    this.completeError = null;
    this.submitCompletedTemplatePoll();
    void this.router.navigateByUrl('/');
  }

  /** Returns the first validation error for the complete action. */
  private validateCompleteForm(): string | null {
    const title = this.surveyName.trim();
    if (title.length < 3) {
      return 'Please enter a survey name with at least 3 characters.';
    }
    if (title.length > POLL_TITLE_MAX_CHARS) {
      return `Survey name must be at most ${POLL_TITLE_MAX_CHARS} characters.`;
    }
    if (countTitleWords(title) > POLL_TITLE_MAX_WORDS) {
      return `Survey name must be at most ${POLL_TITLE_MAX_WORDS} words.`;
    }
    if (this.parseEndDate() === null) {
      return 'Please choose a valid end date.';
    }
    return null;
  }

  /** Persists the preview survey as a new poll in the shared service. */
  private submitCompletedTemplatePoll(): void {
    const title = this.surveyName.trim();
    const deadline = this.parseEndDate()!;
    const catTrim = this.category.trim();
    getSharedPollService().createPoll({
      title,
      description: this.surveyDescription.trim() || PREVIEW_DESCRIPTION,
      category: catTrim.length > 0 ? catTrim : null,
      options: [...COMPLETE_POLL_OPTIONS],
      deadline,
    });
  }

  /** Parses endsOn yyyy-mm-dd into an end-of-day Date. */
  private parseEndDate(): Date | null {
    const raw = this.endsOn?.trim() ?? '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return null;
    }
    return dateFromYmdParts(raw.split('-').map((x) => Number(x)));
  }

  /** Switches between template mode and a concrete poll route subscription. */
  private applyRoutePollId(pollId: string | null): void {
    this.detachPollListener();
    if (pollId === null) {
      this.switchToTemplateMode();
      return;
    }
    this.bindPollRoute(pollId);
  }

  /** Clears any poll-listen unsubscribe handle. */
  private detachPollListener(): void {
    this.pollListenerUnsubHolder.unsubscribe?.();
    this.pollListenerUnsubHolder.unsubscribe = null;
  }

  /** Resets the page to the interactive template preview. */
  private switchToTemplateMode(): void {
    this.viewMode = 'template';
    this.currentPoll = null;
    this.resetTemplateDefaults();
  }

  /** Loads a poll by route id and subscribes to live updates. */
  private bindPollRoute(pollId: string): void {
    const svc = getSharedPollService();
    this.attachCurrentPoll(pollId, svc);
    this.pollListenerUnsubHolder.unsubscribe = svc.subscribe(() => {
      this.syncPollFromService(pollId, svc);
    });
  }

  /** Sets current poll from the service or redirects home if missing. */
  private attachCurrentPoll(pollId: string, svc: PollService): void {
    const poll = svc.findPollById(pollId);
    if (!poll) {
      void this.router.navigateByUrl('/');
      return;
    }
    this.viewMode = 'poll';
    this.currentPoll = poll;
    this.applyPollToView(poll);
  }

  /** Refreshes bound poll data after service notifications. */
  private syncPollFromService(pollId: string, svc: PollService): void {
    const poll = svc.findPollById(pollId);
    if (poll !== undefined) {
      this.currentPoll = poll;
      this.applyPollToView(poll);
    }
  }

  /** Copies poll fields into the preview model. */
  private applyPollToView(poll: Poll): void {
    this.surveyName = poll.title;
    const desc = poll.description.trim();
    this.surveyDescription = desc.length > 0 ? desc : PREVIEW_DESCRIPTION;
    this.category = poll.category?.trim() ?? '—';
    this.endsOn = deadlineToEndsOnInput(poll.deadline);
    this.completeError = null;
  }

  /** Restores default demo copy for the template route. */
  private resetTemplateDefaults(): void {
    this.surveyName = TEMPLATE_SURVEY_NAME;
    this.surveyDescription = PREVIEW_DESCRIPTION;
    this.category = 'Team activities';
    this.endsOn = '2025-09-01';
    this.surveyStatus = 'draft';
    this.completeError = null;
  }
}
