import { DOCUMENT } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { getSharedPollService } from '../app-legacy-bootstrap';
import {
  POLL_TITLE_MAX_CHARS,
  POLL_TITLE_MAX_WORDS,
  POLL_CATEGORIES,
} from '../../types/poll';

let idSeq = 0;
function nextId(prefix: string): string {
  idSeq += 1;
  return `${prefix}-${Date.now()}-${idSeq}`;
}

interface AnswerRow {
  id: string;
  text: string;
}

interface QuestionBlock {
  id: string;
  prompt: string;
  allowMultiple: boolean;
  answers: AnswerRow[];
}

@Component({
  selector: 'app-create-survey',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './create-survey.component.html',
  styleUrl: './create-survey.component.css',
})
export class CreateSurveyComponent {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  protected readonly categoryOptions = POLL_CATEGORIES;

  protected surveyName = '';
  protected describingText = '';
  protected endDate = '';
  protected category = '';

  protected questions: QuestionBlock[] = [
    {
      id: nextId('q'),
      prompt: '',
      allowMultiple: false,
      answers: [
        { id: nextId('a'), text: '' },
        { id: nextId('a'), text: '' },
      ],
    },
  ];

  protected publishError = signal<string | null>(null);
  protected toastVisible = signal(false);
  protected publishOverlayOpen = signal(false);

  /** Shown in invalid fields (Figma copy). */
  protected readonly fieldFillErrorMessage = 'Please fill out form';

  protected fieldErrors = signal<Record<string, boolean>>({});

  protected clearSurveyName(): void {
    this.surveyName = '';
    this.clearFieldErrorKey('surveyName');
  }

  protected clearDescribingText(): void {
    this.describingText = '';
  }

  protected clearEndDate(): void {
    this.endDate = '';
  }

  protected clearQuestionPrompt(index: number): void {
    const q = this.questions[index];
    if (q) {
      q.prompt = '';
    }
    this.clearFieldErrorKey(`q-prompt-${index}`);
  }

  protected clearAnswer(qIndex: number, aIndex: number): void {
    const row = this.questions[qIndex]?.answers[aIndex];
    if (row) {
      row.text = '';
    }
  }

  protected addAnswer(qIndex: number): void {
    const q = this.questions[qIndex];
    if (!q) {
      return;
    }
    q.answers.push({ id: nextId('a'), text: '' });
  }

  protected addQuestion(): void {
    this.questions.push({
      id: nextId('q'),
      prompt: '',
      allowMultiple: false,
      answers: [
        { id: nextId('a'), text: '' },
        { id: nextId('a'), text: '' },
      ],
    });
    const idx = this.questions.length - 1;
    queueMicrotask(() => {
      const doc = this.document;
      doc.getElementById(`create-q-block-${idx}`)?.scrollIntoView({
        block: 'nearest',
        behavior: 'auto',
      });
      doc.getElementById(`create-q-prompt-${idx}`)?.focus();
    });
  }

  protected cancel(): void {
    void this.router.navigateByUrl('/');
  }

  protected dismissToast(): void {
    this.toastVisible.set(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscapeClosePublishOverlay(): void {
    if (this.publishOverlayOpen()) {
      this.closePublishOverlay();
    }
  }

  protected closePublishOverlay(): void {
    this.publishOverlayOpen.set(false);
  }

  protected onPublishOverlayBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closePublishOverlay();
    }
  }

  protected hasFieldError(key: string): boolean {
    return this.fieldErrors()[key] === true;
  }

  protected clearFieldErrorKey(key: string): void {
    this.fieldErrors.update((m) => {
      if (m[key] !== true) {
        return m;
      }
      const next = { ...m };
      delete next[key];
      return next;
    });
  }

  protected tryPublish(): void {
    this.publishError.set(null);
    const errors = this.computeFieldErrors();
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    this.publish();
  }

  private computeFieldErrors(): Record<string, boolean> {
    const e: Record<string, boolean> = {};
    const title = this.surveyName.trim();
    if (title.length < 3 || title.length > POLL_TITLE_MAX_CHARS) {
      e['surveyName'] = true;
    } else {
      const wordCount = title.split(/\s+/).filter(Boolean).length;
      if (wordCount > POLL_TITLE_MAX_WORDS) {
        e['surveyName'] = true;
      }
    }
    this.questions.forEach((q, qi) => {
      if (q.prompt.trim().length === 0) {
        e[`q-prompt-${qi}`] = true;
      }
    });
    return e;
  }

  protected optionLetter(index: number): string {
    return `${String.fromCharCode(65 + index)}.`;
  }

  protected publish(): void {
    this.publishError.set(null);

    const title = this.surveyName.trim();
    const first = this.questions[0];
    if (!first) {
      this.publishError.set('Keine Frage vorhanden.');
      return;
    }
    const filledOpts = first.answers.map((a) => a.text.trim()).filter(Boolean);
    const opts: string[] =
      filledOpts.length >= 2
        ? [...filledOpts]
        : filledOpts.length === 1
          ? [...filledOpts, 'Option B']
          : ['Option A', 'Option B'];

    let description = this.describingText.trim();
    const extraQs = this.questions.slice(1);
    if (extraQs.length > 0) {
      const lines = extraQs
        .map((q, i) => {
          const p = q.prompt.trim();
          return p.length > 0 ? `${i + 2}. ${p}` : null;
        })
        .filter((x): x is string => x !== null);
      if (lines.length > 0) {
        description =
          (description.length > 0 ? `${description}\n\n` : '') +
          lines.join('\n');
      }
    }
    if (description.length === 0) {
      description =
        first.prompt.trim().length > 0
          ? first.prompt.trim()
          : 'Umfrage ohne Beschreibung.';
    }

    const deadline = this.parseEndDate(this.endDate.trim());
    const cat = this.category.trim();

    getSharedPollService().createPoll({
      title,
      description,
      category: cat.length > 0 ? cat : null,
      options: opts,
      deadline,
    });

    this.publishOverlayOpen.set(true);
    this.toastVisible.set(true);
    window.setTimeout(() => {
      this.toastVisible.set(false);
      this.publishOverlayOpen.set(false);
      void this.router.navigateByUrl('/');
    }, 2800);
  }

  private parseEndDate(raw: string): Date | null {
    const s = raw.trim();
    if (s.length === 0) {
      return null;
    }

    let y: number;
    let m: number;
    let d: number;

    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    const de = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);

    if (iso !== null) {
      y = Number(iso[1]);
      m = Number(iso[2]);
      d = Number(iso[3]);
    } else if (de !== null) {
      d = Number(de[1]);
      m = Number(de[2]);
      y = Number(de[3]);
    } else {
      return null;
    }

    if (
      Number.isNaN(y) ||
      Number.isNaN(m) ||
      Number.isNaN(d) ||
      !this.isValidCalendarDay(y, m, d)
    ) {
      return null;
    }

    return new Date(y, m - 1, d, 23, 59, 59, 999);
  }

  private isValidCalendarDay(y: number, m: number, d: number): boolean {
    if (y < 1000 || y > 9999 || m < 1 || m > 12 || d < 1 || d > 31) {
      return false;
    }
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  }
}
