import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { getSharedPollService } from '../app-legacy-bootstrap';
import {
  POLL_TITLE_MAX_CHARS,
  POLL_TITLE_MAX_WORDS,
} from '../../types/poll';

const PREVIEW_DESCRIPTION =
  'We want to create team activities that everyone will enjoy – share your preferences and ideas in our survey to help us plan better experiences together.';

/** Erste Frage (Termine) als Optionen – passt zum aktuellen Ein-Fragen-Poll-Modell. */
const COMPLETE_POLL_OPTIONS: readonly string[] = [
  '19.09.2025, Friday',
  '10.10.2025, Saturday',
  '11.10.2025, Saturday',
  '31.10.2025, Friday',
];

function countTitleWords(title: string): number {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

@Component({
  selector: 'app-create-survey',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './create-survey.component.html',
  styleUrl: './create-survey.component.css',
})
export class CreateSurveyComponent {
  private readonly router = inject(Router);

  public surveyName = "Let's Plan the Next Team Event Together";

  public category = 'Team activities';

  public endsOn = '2025-09-01';

  /** Preview-Badge: auf der Create-Seite typischerweise Entwurf. */
  public surveyStatus: 'draft' | 'published' = 'draft';

  public completeError: string | null = null;

  public get endsDisplay(): string {
    const raw = this.endsOn?.trim() ?? '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return '—';
    }
    const [y, m, d] = raw.split('-');
    return `${d}.${m}.${y}`;
  }

  public completeSurvey(): void {
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
      description: PREVIEW_DESCRIPTION,
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
}
