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
import { Router, RouterLink } from '@angular/router';

import { CategoryListDropdown } from '../../components/category-list-dropdown';
import { getSharedPollService } from '../app-legacy-bootstrap';

import { attachCreateSurveyCategoryDropdown } from './create-survey-category-bridge';
import {
  surveyEndDateErrorMessage,
  validateSurveyEndDateRaw,
} from './create-survey-end-date';
import {
  answerRowClearAriaLabel,
  appendEmptyQuestion,
  questionRemoveAriaLabel,
  resetQuestionBlock,
  resolveQuestionRemovalAction,
} from './create-survey-question.helpers';
import {
  createEmptyQuestionBlock,
  nextSurveyRowId,
  type QuestionBlock,
} from './create-survey.models';
import {
  persistPublishedSurvey,
  resolvePublishedDescription,
} from './create-survey-publish-run.helpers';
import {
  germanAnswerDateErrorMessage,
  validateGermanAnswerDateRaw,
} from './create-survey-answer-date.helpers';
import { CreateSurveyEndDateFieldComponent } from './create-survey-end-date-field.component';
import { scrollToFirstPublishError } from './create-survey-publish-focus.helpers';
import {
  answerFieldErrorKey,
  computeCreateSurveyFieldErrors,
  stripQuestionPromptErrorKeys,
} from './create-survey-validation.helpers';

@Component({
  selector: 'app-create-survey',
  standalone: true,
  imports: [FormsModule, RouterLink, CreateSurveyEndDateFieldComponent],
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

  protected questions: QuestionBlock[] = [createEmptyQuestionBlock(1)];
  protected readonly maxQuestionsPerSurvey = 4;
  protected readonly maxAnswersPerQuestion = 6;
  protected readonly minAnswersPerQuestion = 2;
  protected readonly answerRowFullRemoveFromIndex = 2;
  protected readonly fullDeleteQuestionOrdinalMin = 3;

  protected publishError = signal<string | null>(null);
  protected publishOverlayOpen = signal(false);
  protected readonly fieldFillErrorMessage = 'Please fill out form';
  protected fieldErrors = signal<Record<string, boolean>>({});

  /** Wires the shared category dropdown after the template renders. */
  public ngAfterViewInit(): void {
    this.categoryDropdown = attachCreateSurveyCategoryDropdown(this.document, {
      getSelection: () =>
        this.category.trim() === '' ? null : this.category.trim(),
      setSelection: (value) => {
        this.category = value ?? '';
      },
    });
  }

  /** Tears down the category dropdown listeners. */
  public ngOnDestroy(): void {
    this.categoryDropdown?.destroy();
    this.categoryDropdown = null;
  }

  /** Clears the survey name field and its validation flag. */
  protected clearSurveyName(): void {
    this.surveyName = '';
    this.clearFieldErrorKey('surveyName');
  }

  /** Clears the optional describing text field. */
  protected clearDescribingText(): void {
    this.describingText = '';
  }

  /**
   * Updates the optional end date from the date field component.
   * @param value - Sanitized dd.mm.yyyy text, or empty when cleared.
   */
  protected onEndDateChange(value: string): void {
    this.endDate = value;
    this.clearFieldErrorKey('endDate');
  }

  /**
   * Returns the end-date error copy when that field is invalid.
   * @returns User-facing message, or an empty string when valid.
   */
  protected endDateFieldErrorMessage(): string {
    const issue = validateSurveyEndDateRaw(this.endDate);
    if (issue === null) {
      return '';
    }
    if (issue === 'invalid') {
      return 'Please enter a valid end date (dd.mm.yyyy).';
    }
    return surveyEndDateErrorMessage(issue);
  }

  /**
   * Deletes, resets, or ignores a question based on list state.
   * @param index - Zero-based index of the question to remove.
   */
  protected removeQuestion(index: number): void {
    const action = resolveQuestionRemovalAction(
      this.questions,
      index,
      this.fullDeleteQuestionOrdinalMin,
    );
    if (action === 'noop') {
      return;
    }
    if (action === 'splice') {
      this.questions.splice(index, 1);
      this.stripQuestionPromptErrors();
      return;
    }
    const question = this.questions[index];
    if (question) {
      resetQuestionBlock(question);
      this.clearFieldErrorKey(`q-prompt-${index}`);
    }
  }

  /**
   * Returns the accessible label for a question remove button.
   * @param index - Zero-based index of the question.
   * @returns Aria label describing delete vs reset behavior.
   */
  protected questionRemoveAriaLabel(index: number): string {
    return questionRemoveAriaLabel(
      this.questions,
      index,
      this.fullDeleteQuestionOrdinalMin,
    );
  }

  /**
   * Clears or removes one answer row depending on list length.
   * @param qIndex - Zero-based question index.
   * @param aIndex - Zero-based answer index within the question.
   */
  protected clearAnswer(qIndex: number, aIndex: number): void {
    const question = this.questions[qIndex];
    if (!question) {
      return;
    }
    const canRemoveRow =
      aIndex >= this.answerRowFullRemoveFromIndex &&
      question.answers.length > this.minAnswersPerQuestion;
    if (canRemoveRow) {
      question.answers.splice(aIndex, 1);
      return;
    }
    const row = question.answers[aIndex];
    if (row) {
      row.text = '';
    }
    this.clearFieldErrorKey(answerFieldErrorKey(qIndex, aIndex));
  }

  /**
   * Returns the accessible label for an answer clear button.
   * @param aIndex - Zero-based answer index.
   * @returns Aria label for clear vs remove behavior.
   */
  protected answerRowClearAriaLabel(aIndex: number): string {
    return answerRowClearAriaLabel(aIndex, this.answerRowFullRemoveFromIndex);
  }

  /**
   * Appends one empty answer row when under the per-question limit.
   * @param qIndex - Zero-based question index.
   */
  protected addAnswer(qIndex: number): void {
    const question = this.questions[qIndex];
    if (!question || question.answers.length >= this.maxAnswersPerQuestion) {
      return;
    }
    question.answers.push({ id: nextSurveyRowId('a'), text: '' });
  }

  /** Appends a new question block and focuses its prompt field. */
  protected addQuestion(): void {
    if (this.questions.length >= this.maxQuestionsPerSurvey) {
      return;
    }
    const index = appendEmptyQuestion(this.questions);
    queueMicrotask(() => this.scrollAndFocusQuestion(index));
  }

  /** Navigates back to the home route. */
  protected cancel(): void {
    void this.router.navigateByUrl('/');
  }

  /** Closes the publish overlay when Escape is pressed. */
  @HostListener('document:keydown.escape')
  protected onEscapeClosePublishOverlay(): void {
    if (this.publishOverlayOpen()) {
      this.closePublishOverlay();
    }
  }

  /** Hides the post-publish confirmation overlay. */
  protected closePublishOverlay(): void {
    this.publishOverlayOpen.set(false);
  }

  /**
   * Closes the overlay when the backdrop is clicked.
   * @param event - Click event from the overlay backdrop.
   */
  protected onPublishOverlayBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closePublishOverlay();
    }
  }

  /**
   * Returns whether a field key is currently marked invalid.
   * @param key - Publish validation field key.
   * @returns Whether the key is flagged in {@link fieldErrors}.
   */
  protected hasFieldError(key: string): boolean {
    return this.fieldErrors()[key] === true;
  }

  /**
   * Clears one field error flag without cloning when unchanged.
   * @param key - Publish validation field key to clear.
   */
  protected clearFieldErrorKey(key: string): void {
    this.fieldErrors.update((map) => {
      if (map[key] !== true) {
        return map;
      }
      const next = { ...map };
      delete next[key];
      return next;
    });
  }

  /** Validates the form and starts publishing when valid. */
  protected tryPublish(): void {
    this.publishError.set(null);
    const errors = computeCreateSurveyFieldErrors(
      this.surveyName,
      this.questions,
      this.endDate,
    );
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length > 0) {
      this.publishError.set(this.fieldFillErrorMessage);
      this.focusFirstPublishError(errors);
      return;
    }
    this.publish();
  }

  /**
   * Returns the letter prefix for one answer option index.
   * @param index - Zero-based answer index.
   * @returns Letter prefix such as `'A.'`.
   */
  protected optionLetter(index: number): string {
    return `${String.fromCharCode(65 + index)}.`;
  }

  /**
   * Returns the publish-validation key for one answer field.
   * @param questionIndex - Zero-based question index.
   * @param answerIndex - Zero-based answer index.
   * @returns Stable error key for the answer input.
   */
  protected answerFieldKey(questionIndex: number, answerIndex: number): string {
    return answerFieldErrorKey(questionIndex, answerIndex);
  }

  /**
   * Returns answer-date error copy when that field failed publish validation.
   * @param questionIndex - Zero-based question index.
   * @param answerIndex - Zero-based answer index.
   * @returns User-facing date error message, or an empty string when valid.
   */
  protected answerFieldErrorMessage(questionIndex: number, answerIndex: number): string {
    const answer = this.questions[questionIndex]?.answers[answerIndex];
    if (answer === undefined) {
      return '';
    }
    const issue = validateGermanAnswerDateRaw(answer.text);
    return issue === null ? '' : germanAnswerDateErrorMessage(issue);
  }

  /** Persists the survey when the first question block exists. */
  protected publish(): void {
    void this.runPublish();
  }

  /** Async publish entry that surfaces persistence errors. */
  private async runPublish(): Promise<void> {
    this.publishError.set(null);
    const first = this.questions[0];
    if (!first) {
      this.publishError.set('No question available.');
      return;
    }
    try {
      await this.completePublish(first);
    } catch {
      this.publishError.set('Could not publish survey. Please try again.');
    }
  }

  /** Drops stale question-prompt errors after structural edits. */
  private stripQuestionPromptErrors(): void {
    this.fieldErrors.update((map) => stripQuestionPromptErrorKeys(map));
  }

  /**
   * Scrolls to and focuses one question prompt input.
   * @param index - Zero-based index of the question block.
   */
  private scrollAndFocusQuestion(index: number): void {
    const doc = this.document;
    doc.getElementById(`create-q-block-${index}`)?.scrollIntoView({
      block: 'nearest',
      behavior: 'auto',
    });
    doc.getElementById(`create-q-prompt-${index}`)?.focus();
  }

  /**
   * Focuses and scrolls to the first invalid publish field.
   * @param errors - Current publish validation error map.
   */
  private focusFirstPublishError(errors: Record<string, boolean>): void {
    queueMicrotask(() => {
      scrollToFirstPublishError(errors, this.questions, this.document);
    });
  }

  /**
   * Creates the published survey in Supabase and shows the overlay.
   * @param first - First question block used for description fallback.
   */
  private async completePublish(first: QuestionBlock): Promise<void> {
    const title = this.surveyName.trim();
    const description = resolvePublishedDescription(this.describingText, first);
    await persistPublishedSurvey(
      title,
      description,
      this.endDate,
      this.category,
      this.questions,
    );
    this.beginPostPublishUi();
  }

  /** Shows the publish overlay then navigates home after a short delay. */
  private beginPostPublishUi(): void {
    this.publishOverlayOpen.set(true);
    window.setTimeout(() => {
      this.publishOverlayOpen.set(false);
      void this.router.navigateByUrl('/');
    }, 2800);
  }
}
