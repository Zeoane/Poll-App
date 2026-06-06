import {
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { getSharedPollService } from '../app-legacy-bootstrap';
import { SurveyViewResultsDemoQuestionsComponent } from './survey-view-results-demo-questions.component';
import { SurveyViewResultsLivePanelComponent } from './survey-view-results-live-panel.component';
import {
  deadlineToEndsOnInput,
  parseEndsOnDate,
  validateCompleteSurveyForm,
} from './survey-view-results-form.helpers';
import { applyVoteForOption } from './survey-view-results-vote.helpers';
import type { PollService } from '../../services/poll-service';
import { type Poll, type PollOption } from '../../types/poll';
import { calculatePercentage } from '../../utils/format';

const PREVIEW_DESCRIPTION =
  'We want to create team activities that everyone will enjoy - share your preferences and ideas in our survey to help us plan better experiences together.';

const COMPLETE_POLL_OPTIONS: readonly string[] = [
  '19.09.2025, Friday',
  '10.10.2025, Saturday',
  '11.10.2025, Saturday',
  '31.10.2025, Friday',
];

const TEMPLATE_SURVEY_NAME =
  "Let's Plan the Next Team Event Together";

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
  public category = 'Team Activities';
  public endsOn = '2025-09-01';
  public surveyStatus: 'draft' | 'published' = 'draft';
  public completeError: string | null = null;

  readonly pollChosenOptionId = signal<string | null>(null);

  /** Subscribes to the route poll id and clears listeners on destroy. */
  public constructor() {
    const route = inject(ActivatedRoute);
    inject(DestroyRef).onDestroy(() => {
      this.detachPollListener();
    });
    route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const pollId = params.get('pollId');
      this.applyRoutePollId(pollId !== '' ? pollId : null);
    });
  }

  /** Hint shown under the voting question based on poll state. */
  public pollVoteHint(): string {
    if (this.viewMode !== 'poll' || this.currentPoll === null) {
      return '';
    }
    const service = getSharedPollService();
    if (service.isPollEnded(this.currentPoll)) {
      return 'This survey has closed; totals are shown on the right.';
    }
    return 'Choose one option to vote. Click again to deselect.';
  }

  /** Toggles vote selection, switch, or deselect for one poll option. */
  public voteForOption(optionId: string): void {
    const poll = this.currentPoll;
    if (poll === null || this.viewMode !== 'poll') {
      return;
    }
    const result = applyVoteForOption(
      poll,
      optionId,
      this.pollChosenOptionId(),
      getSharedPollService(),
    );
    if (result === undefined) {
      return;
    }
    this.currentPoll = result.poll;
    this.pollChosenOptionId.set(result.chosenOptionId);
  }

  /** True only after deadline while the poll is still open. */
  public pollVoteButtonsDisabled(): boolean {
    if (this.viewMode !== 'poll' || this.currentPoll === null) {
      return false;
    }
    return getSharedPollService().isPollEnded(this.currentPoll);
  }

  /** Prefix for option index in the voting list (e.g. "A."). */
  public optionLetter(index: number): string {
    return `${String.fromCharCode(65 + index)}.`;
  }

  /** Bare letter label for live result bars. */
  public optionLetterBare(index: number): string {
    return String.fromCharCode(65 + index);
  }

  /** Percent width for one option in the live chart. */
  public optionVotePercent(option: PollOption): number {
    const poll = this.currentPoll;
    if (!poll) {
      return 0;
    }
    const total = getSharedPollService().getTotalVotes(poll);
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
    if (raw.length === 0 || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return '—';
    }
    const [year, month, day] = raw.split('-');
    return `${day}.${month}.${year}`;
  }

  /** Completes the template survey or returns home from poll view. */
  public completeSurvey(): void {
    if (this.viewMode === 'poll') {
      void this.router.navigateByUrl('/');
      return;
    }
    const error = validateCompleteSurveyForm(this.surveyName, this.endsOn);
    if (error !== null) {
      this.completeError = error;
      return;
    }
    this.completeError = null;
    this.submitCompletedTemplatePoll();
    void this.router.navigateByUrl('/');
  }

  /** Persists the preview survey as a new poll in the shared service. */
  private submitCompletedTemplatePoll(): void {
    const title = this.surveyName.trim();
    const deadline = parseEndsOnDate(this.endsOn)!;
    const category = this.category.trim();
    getSharedPollService().createPoll({
      title,
      description: this.surveyDescription.trim() || PREVIEW_DESCRIPTION,
      category: category.length > 0 ? category : null,
      options: [...COMPLETE_POLL_OPTIONS],
      deadline,
    });
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
    this.pollChosenOptionId.set(null);
    this.resetTemplateDefaults();
  }

  /** Loads a poll by route id and subscribes to live updates. */
  private bindPollRoute(pollId: string): void {
    const service = getSharedPollService();
    this.attachCurrentPoll(pollId, service);
    this.pollListenerUnsubHolder.unsubscribe = service.subscribe(() => {
      this.syncPollFromService(pollId, service);
    });
  }

  /** Sets current poll from the service or redirects home if missing. */
  private attachCurrentPoll(pollId: string, service: PollService): void {
    const poll = service.findPollById(pollId);
    if (!poll) {
      void this.router.navigateByUrl('/');
      return;
    }
    this.viewMode = 'poll';
    this.currentPoll = poll;
    this.pollChosenOptionId.set(null);
    this.applyPollFields(poll);
  }

  /** Refreshes bound poll data after service notifications. */
  private syncPollFromService(pollId: string, service: PollService): void {
    const poll = service.findPollById(pollId);
    if (poll !== undefined) {
      this.currentPoll = poll;
      this.applyPollFields(poll);
    }
  }

  /** Copies poll fields into the preview model. */
  private applyPollFields(poll: Poll): void {
    this.surveyName = poll.title;
    const description = poll.description.trim();
    this.surveyDescription =
      description.length > 0 ? description : PREVIEW_DESCRIPTION;
    this.category = poll.category?.trim() ?? '—';
    this.endsOn = deadlineToEndsOnInput(poll.deadline);
    this.completeError = null;
  }

  /** Restores default demo copy for the template route. */
  private resetTemplateDefaults(): void {
    this.surveyName = TEMPLATE_SURVEY_NAME;
    this.surveyDescription = PREVIEW_DESCRIPTION;
    this.category = 'Team Activities';
    this.endsOn = '2025-09-01';
    this.surveyStatus = 'draft';
    this.completeError = null;
  }
}
