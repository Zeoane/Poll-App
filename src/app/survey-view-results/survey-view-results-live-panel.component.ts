import { Component, input } from '@angular/core';

import { getSharedPollService } from '../app-legacy-bootstrap';
import type { Poll, PollOption } from '../../types/poll';
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

  /** Maps option index to a single result-bar letter. */
  public optionLetterBare(idx: number): string {
    return String.fromCharCode(65 + idx);
  }

  /** Computes vote share percent for one option in the current poll. */
  public optionVotePercent(option: PollOption): number {
    const poll = this.currentPoll();
    if (poll === null) {
      return 0;
    }
    const svc = getSharedPollService();
    const total = svc.getTotalVotes(poll);
    return calculatePercentage(option.votes, total);
  }
}
