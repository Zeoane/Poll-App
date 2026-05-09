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

/** Builds a short unique id string for question/answer rows. */
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

  protected readonly fieldFillErrorMessage = 'Please fill out form';

  protected fieldErrors = signal<Record<string, boolean>>({});

  /** Clears the survey name field and its error flag. */
  protected clearSurveyName(): void {
    this.surveyName = '';
    this.clearFieldErrorKey('surveyName');
  }

  /** Clears the describing text textarea. */
  protected clearDescribingText(): void {
    this.describingText = '';
  }

  /** Clears the optional end date field. */
  protected clearEndDate(): void {
    this.endDate = '';
  }

  /** Removes a question or resets the only question block. */
  protected removeQuestion(index: number): void {
    if (this.questions.length > 1) {
      this.questions.splice(index, 1);
      this.stripQuestionPromptErrors();
      return;
    }
    this.resetSingleQuestion(index);
  }

  /** Clears one question to defaults when it cannot be removed. */
  private resetSingleQuestion(index: number): void {
    const q = this.questions[index];
    if (!q) {
      return;
    }
    q.prompt = '';
    q.allowMultiple = false;
    q.answers = [
      { id: nextId('a'), text: '' },
      { id: nextId('a'), text: '' },
    ];
    this.clearFieldErrorKey(`q-prompt-${index}`);
  }

  /** Drops all q-prompt-* keys after question indices shift. */
  private stripQuestionPromptErrors(): void {
    this.fieldErrors.update((m) => {
      const next = { ...m };
      for (const key of Object.keys(next)) {
        if (key.startsWith('q-prompt-')) {
          delete next[key];
        }
      }
      return next;
    });
  }

  /** Clears one answer row text. */
  protected clearAnswer(qIndex: number, aIndex: number): void {
    const row = this.questions[qIndex]?.answers[aIndex];
    if (row) {
      row.text = '';
    }
  }

  /** Pushes another empty answer row onto a question. */
  protected addAnswer(qIndex: number): void {
    const q = this.questions[qIndex];
    if (!q) {
      return;
    }
    q.answers.push({ id: nextId('a'), text: '' });
  }

  /** Adds a new question and focuses its prompt after layout. */
  protected addQuestion(): void {
    this.questions.push(this.createEmptyQuestionBlock());
    const idx = this.questions.length - 1;
    queueMicrotask(() => this.scrollAndFocusQuestion(idx));
  }

  /** Returns a fresh question block with two blank answers. */
  private createEmptyQuestionBlock(): QuestionBlock {
    return {
      id: nextId('q'),
      prompt: '',
      allowMultiple: false,
      answers: [
        { id: nextId('a'), text: '' },
        { id: nextId('a'), text: '' },
      ],
    };
  }

  /** Scrolls the block into view and moves focus to its prompt input. */
  private scrollAndFocusQuestion(idx: number): void {
    const doc = this.document;
    doc.getElementById(`create-q-block-${idx}`)?.scrollIntoView({
      block: 'nearest',
      behavior: 'auto',
    });
    doc.getElementById(`create-q-prompt-${idx}`)?.focus();
  }

  /** Navigates back to the home route. */
  protected cancel(): void {
    void this.router.navigateByUrl('/');
  }

  /** Hides the success toast. */
  protected dismissToast(): void {
    this.toastVisible.set(false);
  }

  /** Closes the publish overlay when Escape is pressed. */
  @HostListener('document:keydown.escape')
  protected onEscapeClosePublishOverlay(): void {
    if (this.publishOverlayOpen()) {
      this.closePublishOverlay();
    }
  }

  /** Hides the publish success overlay. */
  protected closePublishOverlay(): void {
    this.publishOverlayOpen.set(false);
  }

  /** Closes the overlay when the dimmed backdrop is clicked. */
  protected onPublishOverlayBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closePublishOverlay();
    }
  }

  /** True when a keyed field error exists. */
  protected hasFieldError(key: string): boolean {
    return this.fieldErrors()[key] === true;
  }

  /** Drops one key from the client-side field error map. */
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

  /** Validates visible fields before starting publish. */
  protected tryPublish(): void {
    this.publishError.set(null);
    const errors = this.computeFieldErrors();
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    this.publish();
  }

  /** Builds a boolean map of invalid field keys. */
  private computeFieldErrors(): Record<string, boolean> {
    const e: Record<string, boolean> = {};
    this.addSurveyNameErrors(e);
    this.addQuestionPromptErrors(e);
    return e;
  }

  /** Marks the title invalid when length or word rules fail. */
  private addSurveyNameErrors(e: Record<string, boolean>): void {
    const title = this.surveyName.trim();
    if (title.length < 3 || title.length > POLL_TITLE_MAX_CHARS) {
      e['surveyName'] = true;
      return;
    }
    const wordCount = title.split(/\s+/).filter(Boolean).length;
    if (wordCount > POLL_TITLE_MAX_WORDS) {
      e['surveyName'] = true;
    }
  }

  /** Marks each blank question prompt in the error map. */
  private addQuestionPromptErrors(e: Record<string, boolean>): void {
    this.questions.forEach((q, qi) => {
      if (q.prompt.trim().length === 0) {
        e[`q-prompt-${qi}`] = true;
      }
    });
  }

  /** Formats option index as an A., B., … letter prefix. */
  protected optionLetter(index: number): string {
    return `${String.fromCharCode(65 + index)}.`;
  }

  /** Creates the poll from the form and shows post-submit UI. */
  protected publish(): void {
    this.publishError.set(null);
    const title = this.surveyName.trim();
    const first = this.questions[0];
    if (!first) {
      this.publishError.set('Keine Frage vorhanden.');
      return;
    }
    const opts = this.resolveFirstQuestionOptions(first);
    const description = this.buildPublishedDescription(first);
    this.persistNewPoll(title, opts, description);
    this.beginPostPublishUi();
  }

  /** Derives at least two option strings from the first question block. */
  private resolveFirstQuestionOptions(first: QuestionBlock): string[] {
    const filledOpts = first.answers.map((a) => a.text.trim()).filter(Boolean);
    if (filledOpts.length >= 2) {
      return [...filledOpts];
    }
    if (filledOpts.length === 1) {
      return [...filledOpts, 'Option B'];
    }
    return ['Option A', 'Option B'];
  }

  /** Joins describing text with serialized extra question prompts. */
  private buildPublishedDescription(first: QuestionBlock): string {
    let description = this.describingText.trim();
    const extra = this.formatExtraQuestionLines();
    if (extra.length > 0) {
      description =
        (description.length > 0 ? `${description}\n\n` : '') + extra;
    }
    if (description.length > 0) {
      return description;
    }
    return this.defaultDescriptionFallback(first);
  }

  /** Builds newline-separated extra question lines for the description. */
  private formatExtraQuestionLines(): string {
    const lines = this.questions
      .slice(1)
      .map((q, i) => {
        const p = q.prompt.trim();
        return p.length > 0 ? `${i + 2}. ${p}` : null;
      })
      .filter((x): x is string => x !== null);
    return lines.join('\n');
  }

  /** Uses the first prompt or a generic fallback when description is empty. */
  private defaultDescriptionFallback(first: QuestionBlock): string {
    const p = first.prompt.trim();
    return p.length > 0 ? p : 'Umfrage ohne Beschreibung.';
  }

  /** Persists a new poll through the shared poll service. */
  private persistNewPoll(title: string, opts: string[], description: string): void {
    const deadline = this.parseEndDate(this.endDate.trim());
    const cat = this.category.trim();
    getSharedPollService().createPoll({
      title,
      description,
      category: cat.length > 0 ? cat : null,
      options: opts,
      deadline,
    });
  }

  /** Shows overlay and toast, then navigates home after a short delay. */
  private beginPostPublishUi(): void {
    this.publishOverlayOpen.set(true);
    this.toastVisible.set(true);
    window.setTimeout(() => {
      this.toastVisible.set(false);
      this.publishOverlayOpen.set(false);
      void this.router.navigateByUrl('/');
    }, 2800);
  }

  /** Parses ISO or German date strings into an end-of-day deadline. */
  private parseEndDate(raw: string): Date | null {
    const s = raw.trim();
    if (s.length === 0) {
      return null;
    }
    const parsed = this.tryParseDateSegments(s);
    if (parsed === null) {
      return null;
    }
    const { y, m, d } = parsed;
    if (!this.isValidCalendarDay(y, m, d)) {
      return null;
    }
    return new Date(y, m - 1, d, 23, 59, 59, 999);
  }

  /** Reads y/m/d from yyyy-mm-dd or dd.mm.yyyy input. */
  private tryParseDateSegments(s: string): { y: number; m: number; d: number } | null {
    const fromIso = this.tryParseIsoYmd(s);
    if (fromIso !== null) {
      return fromIso;
    }
    return this.tryParseDeDmy(s);
  }

  /** Parses yyyy-mm-dd segments when the pattern matches. */
  private tryParseIsoYmd(s: string): { y: number; m: number; d: number } | null {
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (iso === null) {
      return null;
    }
    return { y: Number(iso[1]), m: Number(iso[2]), d: Number(iso[3]) };
  }

  /** Parses dd.mm.yyyy segments when the pattern matches. */
  private tryParseDeDmy(s: string): { y: number; m: number; d: number } | null {
    const de = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
    if (de === null) {
      return null;
    }
    return { y: Number(de[3]), m: Number(de[2]), d: Number(de[1]) };
  }

  /** True when y/m/d form a real calendar date in the supported ranges. */
  private isValidCalendarDay(y: number, m: number, d: number): boolean {
    if (y < 1000 || y > 9999 || m < 1 || m > 12 || d < 1 || d > 31) {
      return false;
    }
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  }
}
