import { Component, input, signal } from '@angular/core';

import { getSharedPollService } from '../app-legacy-bootstrap';
import { resolveDisplayQuestions } from './survey-view-results-questions.helpers';
import type { Poll, PollOption, SurveyQuestion } from '../../types/poll';
import { calculatePercentage } from '../../utils/format';

@Component({
  selector: 'app-survey-view-results-live-panel',
  standalone: true,
  templateUrl: './survey-view-results-live-panel.component.html',
})
export class SurveyViewResultsLivePanelComponent {
  readonly liveResultsAreEmpty = input(false);
  readonly instantResultsClass = input(false);
  readonly viewMode = input.required<'template' | 'poll'>();
  readonly currentPoll = input<Poll | null>(null);

  readonly mobileResultsExpanded = signal(false);

  /** Expands or collapses live results on mobile (≤900px). */
  public toggleMobileResults(): void {
    this.mobileResultsExpanded.update((open) => !open);
  }

  /**
   * Maps option index to a single result-bar letter.
   * @param idx - Zero-based option index.
   * @returns Single uppercase letter without trailing punctuation.
   */
  public optionLetterBare(idx: number): string {
    return String.fromCharCode(65 + idx);
  }

  /**
   * Returns questions for the live panel in poll mode.
   * @param poll - Poll whose questions are normalized for display.
   * @returns Questions to render in the results sidebar.
   */
  public displayQuestions(poll: Poll): ReadonlyArray<SurveyQuestion> {
    return resolveDisplayQuestions(poll);
  }

  /**
   * First votable question for example polls.
   * @param poll - Poll whose primary question is resolved.
   * @returns First display question, if any.
   */
  public primaryQuestion(poll: Poll): SurveyQuestion | undefined {
    return this.displayQuestions(poll)[0];
  }

  /**
   * Template and home example polls show static demo blocks for questions 2–4.
   * @returns Whether demo follow-up result blocks should render.
   */
  public showDemoFollowUpBlocks(): boolean {
    if (this.viewMode() === 'template') {
      return true;
    }
    return this.viewMode() === 'poll' && this.currentPoll()?.isExample === true;
  }

  /**
   * Computes vote share percent for one option within one question.
   * @param question - Question containing the option.
   * @param option - Option whose vote share is calculated.
   * @returns Integer percentage of votes for the option within the question total.
   */
  public questionOptionPercent(question: SurveyQuestion, option: PollOption): number {
    const total = getSharedPollService().getQuestionVoteTotal(question);
    return calculatePercentage(option.votes, total);
  }
}
