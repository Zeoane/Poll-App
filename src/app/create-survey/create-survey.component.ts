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
import { parseSurveyEndDate } from './create-survey-end-date';
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
  buildPublishedDescription,
  resolveFirstQuestionOptions,
} from './create-survey-publish.helpers';
import {
  computeCreateSurveyFieldErrors,
  stripQuestionPromptErrorKeys,
} from './create-survey-validation.helpers';

@Component({
  selector: 'app-create-survey',
  standalone: true,
  imports: [FormsModule, RouterLink],
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
  protected readonly maxQuestionsPerSurvey = 6;
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

  /** Clears the optional end date field. */
  protected clearEndDate(): void {
    this.endDate = '';
  }

  /** Deletes, resets, or ignores a question based on list state. */
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

  /** Returns the accessible label for a question remove button. */
  protected questionRemoveAriaLabel(index: number): string {
    return questionRemoveAriaLabel(
      this.questions,
      index,
      this.fullDeleteQuestionOrdinalMin,
    );
  }

  /** Clears or removes one answer row depending on list length. */
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
  }

  /** Returns the accessible label for an answer clear button. */
  protected answerRowClearAriaLabel(aIndex: number): string {
    return answerRowClearAriaLabel(aIndex, this.answerRowFullRemoveFromIndex);
  }

  /** Appends one empty answer row when under the per-question limit. */
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

  /** Closes the overlay when the backdrop is clicked. */
  protected onPublishOverlayBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closePublishOverlay();
    }
  }

  /** Returns whether a field key is currently marked invalid. */
  protected hasFieldError(key: string): boolean {
    return this.fieldErrors()[key] === true;
  }

  /** Clears one field error flag without cloning when unchanged. */
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
    const errors = computeCreateSurveyFieldErrors(this.surveyName, this.questions);
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length > 0) {
      this.publishError.set(this.fieldFillErrorMessage);
      this.focusFirstPublishError(errors);
      return;
    }
    this.publish();
  }

  /** Returns the letter prefix for one answer option index. */
  protected optionLetter(index: number): string {
    return `${String.fromCharCode(65 + index)}.`;
  }

  /** Persists the survey when the first question block exists. */
  protected publish(): void {
    this.publishError.set(null);
    const first = this.questions[0];
    if (!first) {
      this.publishError.set('No question available.');
      return;
    }
    this.completePublish(first);
  }

  /** Drops stale question-prompt errors after structural edits. */
  private stripQuestionPromptErrors(): void {
    this.fieldErrors.update((map) => stripQuestionPromptErrorKeys(map));
  }

  /** Scrolls to and focuses one question prompt input. */
  private scrollAndFocusQuestion(index: number): void {
    const doc = this.document;
    doc.getElementById(`create-q-block-${index}`)?.scrollIntoView({
      block: 'nearest',
      behavior: 'auto',
    });
    doc.getElementById(`create-q-prompt-${index}`)?.focus();
  }

  /** Focuses and scrolls to the first invalid publish field. */
  private focusFirstPublishError(errors: Record<string, boolean>): void {
    queueMicrotask(() => this.scrollToFirstPublishError(errors));
  }

  /** Scrolls the viewport to the first field flagged in errors. */
  private scrollToFirstPublishError(errors: Record<string, boolean>): void {
    if (errors['surveyName'] === true) {
      this.focusAndScroll('survey-name');
      return;
    }
    const questionIndex = this.questions.findIndex(
      (_, index) => errors[`q-prompt-${index}`] === true,
    );
    if (questionIndex >= 0) {
      this.focusAndScroll(`create-q-prompt-${questionIndex}`);
    }
  }

  /** Focuses one element id and centers it in the viewport. */
  private focusAndScroll(elementId: string): void {
    const element = this.document.getElementById(elementId);
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    element?.focus();
  }

  /** Creates the poll and shows the post-publish overlay. */
  private completePublish(first: QuestionBlock): void {
    const title = this.surveyName.trim();
    const options = resolveFirstQuestionOptions(first);
    const description = buildPublishedDescription(
      this.describingText,
      this.questions,
    );
    this.persistNewPoll(title, options, description);
    this.beginPostPublishUi();
  }

  /** Writes the new poll into the shared in-memory service. */
  private persistNewPoll(
    title: string,
    options: string[],
    description: string,
  ): void {
    const deadline = parseSurveyEndDate(this.endDate.trim());
    const category = this.category.trim();
    getSharedPollService().createPoll({
      title,
      description,
      category: category.length > 0 ? category : null,
      options,
      deadline,
    });
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
