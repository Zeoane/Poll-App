import {
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CreatePublishOverlayComponent } from '../create-survey/create-publish-overlay.component';
import { getSharedPollService } from '../app-legacy-bootstrap';
import {
  isDemoSurveyView,
  shouldShowDemoInteractionGuard,
} from './survey-view-results-demo-overlay.helpers';
import { SurveyViewResultsDemoQuestionsComponent } from './survey-view-results-demo-questions.component';
import { SurveyViewResultsLivePanelComponent } from './survey-view-results-live-panel.component';
import {
  attachSurveyPollView,
  loadSurveyRoutePoll,
  type SurveyRouteBindTarget,
} from './survey-view-results-bind.helpers';
import {
  parseEndsOnDate,
  validateCompleteSurveyForm,
} from './survey-view-results-form.helpers';
import { resolveDisplayQuestions } from './survey-view-results-questions.helpers';
import {
  COMPLETE_POLL_OPTIONS,
  PREVIEW_DESCRIPTION,
  TEMPLATE_SURVEY_NAME,
} from './survey-view-results-template.constants';
import {
  commitSurveyVoteResult,
  resolveSurveyVoteContext,
  toggleSurveyQuestionVote,
  type SurveyVoteViewState,
} from './survey-view-results-vote-state.helpers';
import { type Poll, type SurveyQuestion, type VoterChoicesByQuestion } from '../../types/poll';

@Component({
  selector: 'app-survey-view-results',
  standalone: true,
  imports: [
    RouterLink,
    CreatePublishOverlayComponent,
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
  public surveyStatus: 'published' = 'published';
  public completeError: string | null = null;

  readonly pollChosenByQuestion = signal<VoterChoicesByQuestion>({});
  readonly demoOverlayOpen = signal(false);
  private routePollId: string | null = null;

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

  public displayQuestions(poll: Poll): ReadonlyArray<SurveyQuestion> {
    return resolveDisplayQuestions(poll);
  }

  public primaryQuestion(poll: Poll): SurveyQuestion | undefined {
    return this.displayQuestions(poll)[0];
  }

  public showDemoFollowUpQuestions(): boolean {
    return isDemoSurveyView(this.viewMode, this.currentPoll, this.routePollId);
  }

  public showDemoInteractionGuard(): boolean {
    return shouldShowDemoInteractionGuard(
      isDemoSurveyView(this.viewMode, this.currentPoll, this.routePollId),
      this.demoOverlayOpen(),
    );
  }

  public openDemoOverlay(): void {
    this.demoOverlayOpen.set(true);
  }

  /**
   * Returns the chosen option ids for one question.
   * @param questionId - Id of the question.
   * @returns Selected option ids for the question, or an empty array.
   */
  public chosenOptionsForQuestion(questionId: string): ReadonlyArray<string> {
    return this.pollChosenByQuestion()[questionId] ?? [];
  }

  public isOptionChosen(questionId: string, optionId: string): boolean {
    return this.chosenOptionsForQuestion(questionId).includes(optionId);
  }

  /**
   * Hint shown under the voting question based on poll state.
   * @param question - Question metadata driving single- vs multi-select copy.
   * @returns Helper text for voters, or an empty string in template mode.
   */
  public pollVoteHint(question: SurveyQuestion): string {
    if (this.viewMode !== 'poll' || this.currentPoll === null) {
      return '';
    }
    const service = getSharedPollService();
    if (service.isPollEnded(this.currentPoll)) {
      return 'This survey has closed; totals are shown on the right.';
    }
    if (question.allowMultiple) {
      return 'Choose one or more options to vote.';
    }
    return 'Choose one option to vote. Click again to deselect.';
  }

  /**
   * Toggles vote selection, switch, or deselect for one question option.
   * @param questionId - Id of the question receiving the vote.
   * @param optionId - Id of the option to toggle.
   */
  public voteForQuestion(questionId: string, optionId: string): void {
    void this.castVoteForQuestion(questionId, optionId);
  }

  /**
   * True when voting must be blocked for closed polls.
   * @returns Whether vote controls should be disabled.
   */
  public pollVoteButtonsDisabled(): boolean {
    if (this.viewMode !== 'poll' || this.currentPoll === null) {
      return false;
    }
    return getSharedPollService().isPollEnded(this.currentPoll);
  }

  /**
   * Prefix for option index in the voting list (e.g. "A.").
   * @param index - Zero-based option index.
   * @returns Letter prefix such as `'A.'`.
   */
  public optionLetter(index: number): string {
    return `${String.fromCharCode(65 + index)}.`;
  }

  /**
   * Sidebar uses instant bar widths when showing a real poll.
   * @returns Whether result bars should animate instantly.
   */
  public get instantResultsClass(): boolean {
    return this.viewMode === 'poll' && this.currentPoll !== null;
  }

  /**
   * True when the routed poll has zero total votes.
   * @returns Whether the live results panel should show an empty state.
   */
  public get liveResultsAreEmpty(): boolean {
    if (this.viewMode !== 'poll' || this.currentPoll === null) {
      return false;
    }
    return getSharedPollService().getTotalVotes(this.currentPoll) === 0;
  }

  /**
   * True when viewing an ended poll on its public page.
   * @returns Whether the poll deadline has passed.
   */
  public get pollViewClosed(): boolean {
    if (this.viewMode !== 'poll' || this.currentPoll === null) {
      return false;
    }
    return getSharedPollService().isPollEnded(this.currentPoll);
  }

  /**
   * Status chip label for template vs live poll views.
   * @returns `'Closed'`, `'Published'`, or template default label.
   */
  public statusLabel(): string {
    if (this.viewMode === 'poll' && this.currentPoll !== null) {
      return this.pollViewClosed ? 'Closed' : 'Published';
    }
    return 'Published';
  }

  /**
   * Draft-style chip when the poll has ended.
   * @returns Whether the status chip uses draft styling.
   */
  public statusIsDraftStyle(): boolean {
    return this.pollViewClosed;
  }

  /**
   * Published-style chip when not in draft styling.
   * @returns Whether the status chip uses published styling.
   */
  public statusIsPublishedStyle(): boolean {
    return !this.statusIsDraftStyle();
  }

  /**
   * Human-readable end date from the yyyy-mm-dd model field.
   * @returns German `dd.mm.yyyy` display string, or `'—'` when invalid.
   */
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
    void this.submitCompletedTemplatePoll();
  }

  /**
   * Switches between template mode and a concrete poll route subscription.
   * @param pollId - Route poll id, or `null` for template mode.
   */
  private applyRoutePollId(pollId: string | null): void {
    this.detachPollListener();
    this.routePollId = pollId;
    this.demoOverlayOpen.set(false);
    if (pollId === null) {
      this.switchToTemplateMode();
      return;
    }
    void this.bindPollRoute(pollId);
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
    this.pollChosenByQuestion.set({});
    this.resetTemplateDefaults();
  }

  /**
   * Loads a poll by route id and subscribes to live updates.
   * @param pollId - Route parameter identifying the poll.
   */
  private async bindPollRoute(pollId: string): Promise<void> {
    const service = getSharedPollService();
    const poll = await loadSurveyRoutePoll(pollId, service);
    if (poll === undefined) {
      void this.router.navigateByUrl('/');
      return;
    }
    await attachSurveyPollView(this.routeBindTarget(), poll, pollId, service);
  }

  /**
   * Exposes mutable route-bind fields for helper functions.
   * @returns Current survey route bind target accessors.
   */
  private routeBindTarget(): SurveyRouteBindTarget {
    return {
      viewMode: this.viewMode,
      currentPoll: this.currentPoll,
      surveyName: this.surveyName,
      surveyDescription: this.surveyDescription,
      category: this.category,
      endsOn: this.endsOn,
      completeError: this.completeError,
      pollChosenByQuestion: this.pollChosenByQuestion,
      pollListenerUnsubHolder: this.pollListenerUnsubHolder,
      setViewMode: (mode) => {
        this.viewMode = mode;
      },
      setCurrentPoll: (poll) => {
        this.currentPoll = poll;
      },
      setSurveyName: (value) => {
        this.surveyName = value;
      },
      setSurveyDescription: (value) => {
        this.surveyDescription = value;
      },
      setCategory: (value) => {
        this.category = value;
      },
      setEndsOn: (value) => {
        this.endsOn = value;
      },
      setCompleteError: (value) => {
        this.completeError = value;
      },
    };
  }

  /** Persists the preview survey as a new poll in Supabase. */
  private async submitCompletedTemplatePoll(): Promise<void> {
    const title = this.surveyName.trim();
    const deadline = parseEndsOnDate(this.endsOn)!;
    const category = this.category.trim();
    await getSharedPollService().createPoll({
      title,
      description: this.surveyDescription.trim() || PREVIEW_DESCRIPTION,
      category: category.length > 0 ? category : null,
      options: [...COMPLETE_POLL_OPTIONS],
      deadline,
    });
    void this.router.navigateByUrl('/');
  }

  /**
   * Applies async vote logic for one question option.
   * @param questionId - Id of the question receiving the vote.
   * @param optionId - Id of the option to toggle.
   */
  private async castVoteForQuestion(
    questionId: string,
    optionId: string,
  ): Promise<void> {
    const context = resolveSurveyVoteContext(this.voteViewState(), questionId);
    if (context === undefined) {
      return;
    }
    const result = await toggleSurveyQuestionVote(
      context,
      optionId,
      getSharedPollService(),
    );
    if (result === undefined) {
      return;
    }
    commitSurveyVoteResult(this.voteViewState(), questionId, result, context.poll);
  }

  /**
   * Exposes mutable vote bindings for helper functions.
   * @returns Current survey vote view state accessors.
   */
  private voteViewState(): SurveyVoteViewState {
    return {
      viewMode: this.viewMode,
      currentPoll: this.currentPoll,
      pollChosenByQuestion: this.pollChosenByQuestion,
      setCurrentPoll: (poll) => {
        this.currentPoll = poll;
      },
    };
  }

  /** Restores default demo copy for the template route. */
  private resetTemplateDefaults(): void {
    this.surveyName = TEMPLATE_SURVEY_NAME;
    this.surveyDescription = PREVIEW_DESCRIPTION;
    this.category = 'Team Activities';
    this.endsOn = '2025-09-01';
    this.surveyStatus = 'published';
    this.completeError = null;
  }
}
