import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  Component,
  HostListener,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { CategoryListDropdown } from '../../components/category-list-dropdown';
import { getSharedPollService } from '../app-legacy-bootstrap';
import { POLL_TITLE_MAX_CHARS, POLL_TITLE_MAX_WORDS } from '../../types/poll';

import { attachCreateSurveyCategoryDropdown } from './create-survey-category-bridge';
import { parseSurveyEndDate } from './create-survey-end-date';
import {
  createEmptyQuestionBlock,
  nextSurveyRowId,
  type QuestionBlock,
} from './create-survey.models';
import {
  buildPublishedDescription,
  resolveFirstQuestionOptions,
} from './create-survey-publish.helpers';

@Component({
  selector: 'app-create-survey',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './create-survey.component.html',
  styleUrl: './create-survey.component.css',
})
export class CreateSurveyComponent implements AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  private categoryDropdown: CategoryListDropdown | null = null;

  protected surveyName = '';
  protected describingText = '';
  protected endDate = '';
  protected category = '';

  public ngAfterViewInit(): void {
    this.categoryDropdown = attachCreateSurveyCategoryDropdown(
      this.document,
      {
        getSelection: () =>
          this.category.trim() === '' ? null : this.category.trim(),
        setSelection: (c) => {
          this.category = c ?? '';
        },
      },
    );
  }

  public ngOnDestroy(): void {
    this.categoryDropdown?.destroy();
    this.categoryDropdown = null;
  }

  protected questions: QuestionBlock[] = [createEmptyQuestionBlock()];

  protected publishError = signal<string | null>(null);
  protected toastVisible = signal(false);
  protected publishOverlayOpen = signal(false);

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

  protected removeQuestion(index: number): void {
    if (this.questions.length > 1) {
      this.questions.splice(index, 1);
      this.stripQuestionPromptErrors();
      return;
    }
    this.resetSingleQuestion(index);
  }

  private resetSingleQuestion(index: number): void {
    const q = this.questions[index];
    if (!q) {
      return;
    }
    q.prompt = '';
    q.allowMultiple = false;
    q.answers = [
      { id: nextSurveyRowId('a'), text: '' },
      { id: nextSurveyRowId('a'), text: '' },
    ];
    this.clearFieldErrorKey(`q-prompt-${index}`);
  }

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
    q.answers.push({ id: nextSurveyRowId('a'), text: '' });
  }

  protected addQuestion(): void {
    this.questions.push(createEmptyQuestionBlock());
    const idx = this.questions.length - 1;
    queueMicrotask(() => this.scrollAndFocusQuestion(idx));
  }

  private scrollAndFocusQuestion(idx: number): void {
    const doc = this.document;
    doc.getElementById(`create-q-block-${idx}`)?.scrollIntoView({
      block: 'nearest',
      behavior: 'auto',
    });
    doc.getElementById(`create-q-prompt-${idx}`)?.focus();
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
    this.addSurveyNameErrors(e);
    this.addQuestionPromptErrors(e);
    return e;
  }

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

  private addQuestionPromptErrors(e: Record<string, boolean>): void {
    this.questions.forEach((q, qi) => {
      if (q.prompt.trim().length === 0) {
        e[`q-prompt-${qi}`] = true;
      }
    });
  }

  protected optionLetter(index: number): string {
    return `${String.fromCharCode(65 + index)}.`;
  }

  protected publish(): void {
    this.publishError.set(null);
    const first = this.questions[0];
    if (!first) {
      this.publishError.set('Keine Frage vorhanden.');
      return;
    }
    this.completePublish(first);
  }

  private completePublish(first: QuestionBlock): void {
    const title = this.surveyName.trim();
    const opts = resolveFirstQuestionOptions(first);
    const description = buildPublishedDescription(
      this.describingText,
      this.questions,
    );
    this.persistNewPoll(title, opts, description);
    this.beginPostPublishUi();
  }

  private persistNewPoll(title: string, opts: string[], description: string): void {
    const deadline = parseSurveyEndDate(this.endDate.trim());
    const cat = this.category.trim();
    getSharedPollService().createPoll({
      title,
      description,
      category: cat.length > 0 ? cat : null,
      options: opts,
      deadline,
    });
  }

  private beginPostPublishUi(): void {
    this.publishOverlayOpen.set(true);
    this.toastVisible.set(true);
    window.setTimeout(() => {
      this.toastVisible.set(false);
      this.publishOverlayOpen.set(false);
      void this.router.navigateByUrl('/');
    }, 2800);
  }
}
