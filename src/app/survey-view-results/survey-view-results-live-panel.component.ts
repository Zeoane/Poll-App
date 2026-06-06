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

  /** Maps option index to a single result-bar letter. */
  public optionLetterBare(idx: number): string {
    return String.fromCharCode(65 + idx);
  }

  /** Returns questions for the live panel in poll mode. */
  public displayQuestions(poll: Poll): ReadonlyArray<SurveyQuestion> {
    return resolveDisplayQuestions(poll);
  }

  /** Computes vote share percent for one option within one question. */
  public questionOptionPercent(question: SurveyQuestion, option: PollOption): number {
    const total = getSharedPollService().getQuestionVoteTotal(question);
    return calculatePercentage(option.votes, total);
  }
}
