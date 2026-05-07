import {
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { getSharedPollService } from '../app-legacy-bootstrap';
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

/** Erste Frage (Termine) als Optionen – passt zum aktuellen Ein-Fragen-Poll-Modell. */
const COMPLETE_POLL_OPTIONS: readonly string[] = [
  '19.09.2025, Friday',
  '10.10.2025, Saturday',
  '11.10.2025, Saturday',
  '31.10.2025, Friday',
];

const TEMPLATE_SURVEY_NAME =
  "Let's Plan the Next Team Event Together";

function countTitleWords(title: string): number {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

function deadlineToEndsOnInput(deadline: Date | null): string {
  if (deadline === null) {
    return '';
  }
  const y = deadline.getFullYear();
  const m = String(deadline.getMonth() + 1).padStart(2, '0');
  const d = String(deadline.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

@Component({
  selector: 'app-survey-view-results',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './survey-view-results.component.html',
  styleUrl: './survey-view-results.component.css',
})
export class SurveyViewResultsComponent {
  private readonly router = inject(Router);
  private readonly pollListenerUnsubHolder: {
    unsubscribe: (() => void) | null;
  } = { unsubscribe: null };

  /** Ohne Routen-`pollId`: interaktiver Entwurf wie zuvor. */
  public viewMode: 'template' | 'poll' = 'template';

  public currentPoll: Poll | null = null;

  public surveyName = TEMPLATE_SURVEY_NAME;

  public surveyDescription = PREVIEW_DESCRIPTION;

  public category = 'Team activities';

  public endsOn = '2025-09-01';

  /** Nur bei viewMode === 'template`. */
  public surveyStatus: 'draft' | 'published' = 'draft';

  public completeError: string | null = null;
  public constructor() {
    const route = inject(ActivatedRoute);
    inject(DestroyRef).onDestroy(() => {
      this.pollListenerUnsubHolder.unsubscribe?.();
      this.pollListenerUnsubHolder.unsubscribe = null;
    });

    route.paramMap.pipe(takeUntilDestroyed()).subscribe((pm) => {
      const pollId = pm.get('pollId');
      this.applyRoutePollId(pollId !== '' ? pollId : null);
    });
  }

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

  public optionLetter(idx: number): string {
    return `${String.fromCharCode(65 + idx)}.`;
  }

  public optionLetterBare(idx: number): string {
    return String.fromCharCode(65 + idx);
  }

  public optionVotePercent(option: PollOption): number {
    const poll = this.currentPoll;
    if (!poll) {
      return 0;
    }
    const svc = getSharedPollService();
    const total = svc.getTotalVotes(poll);
    return calculatePercentage(option.votes, total);
  }

  /** Für Sidebar: Balken ohne Easing beim Aufbau (sofortige Breite). */
  public get instantResultsClass(): boolean {
    return this.viewMode === 'poll' && this.currentPoll !== null;
  }

  public get pollViewClosed(): boolean {
    if (this.viewMode !== 'poll' || this.currentPoll === null) {
      return false;
    }
    return getSharedPollService().isPollEnded(this.currentPoll);
  }

  public statusLabel(): string {
    if (this.viewMode === 'poll' && this.currentPoll !== null) {
      return this.pollViewClosed ? 'Closed' : 'Published';
    }
    return this.surveyStatus === 'published' ? 'Published' : 'Draft';
  }

  public statusIsDraftStyle(): boolean {
    return (
      (this.viewMode === 'template' && this.surveyStatus === 'draft') ||
      this.pollViewClosed
    );
  }

  public statusIsPublishedStyle(): boolean {
    return !this.statusIsDraftStyle();
  }

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

  public completeSurvey(): void {
    if (this.viewMode === 'poll') {
      return;
    }
    this.completeError = null;
    const title = this.surveyName.trim();
    if (title.length < 3) {
      this.completeError =
        'Please enter a survey name with at least 3 characters.';
      return;
    }
    if (title.length > POLL_TITLE_MAX_CHARS) {
      this.completeError = `Survey name must be at most ${POLL_TITLE_MAX_CHARS} characters.`;
      return;
    }
    if (countTitleWords(title) > POLL_TITLE_MAX_WORDS) {
      this.completeError = `Survey name must be at most ${POLL_TITLE_MAX_WORDS} words.`;
      return;
    }
    const deadline = this.parseEndDate();
    if (deadline === null) {
      this.completeError = 'Please choose a valid end date.';
      return;
    }
    const catTrim = this.category.trim();
    getSharedPollService().createPoll({
      title,
      description: this.surveyDescription.trim() || PREVIEW_DESCRIPTION,
      category: catTrim.length > 0 ? catTrim : null,
      options: [...COMPLETE_POLL_OPTIONS],
      deadline,
    });
    void this.router.navigateByUrl('/');
  }

  private parseEndDate(): Date | null {
    const raw = this.endsOn?.trim() ?? '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return null;
    }
    const parts = raw.split('-').map((x) => Number(x));
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

  private applyRoutePollId(pollId: string | null): void {
    this.pollListenerUnsubHolder.unsubscribe?.();
    this.pollListenerUnsubHolder.unsubscribe = null;

    if (pollId === null) {
      this.viewMode = 'template';
      this.currentPoll = null;
      this.resetTemplateDefaults();
      return;
    }

    const svc = getSharedPollService();
    const attach = (): void => {
      const poll = svc.findPollById(pollId);
      if (!poll) {
        void this.router.navigateByUrl('/');
        return;
      }
      this.viewMode = 'poll';
      this.currentPoll = poll;
      this.applyPollToView(poll);
    };

    attach();
    this.pollListenerUnsubHolder.unsubscribe = svc.subscribe(() => {
      const poll = svc.findPollById(pollId);
      if (poll !== undefined) {
        this.currentPoll = poll;
        this.applyPollToView(poll);
      }
    });
  }

  private applyPollToView(poll: Poll): void {
    this.surveyName = poll.title;
    const desc = poll.description.trim();
    this.surveyDescription = desc.length > 0 ? desc : PREVIEW_DESCRIPTION;
    this.category = poll.category?.trim() ?? '—';
    this.endsOn = deadlineToEndsOnInput(poll.deadline);
    this.completeError = null;
  }

  private resetTemplateDefaults(): void {
    this.surveyName = TEMPLATE_SURVEY_NAME;
    this.surveyDescription = PREVIEW_DESCRIPTION;
    this.category = 'Team activities';
    this.endsOn = '2025-09-01';
    this.surveyStatus = 'draft';
    this.completeError = null;
  }
}
