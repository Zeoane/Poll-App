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
  parseSurveyEndDate,
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
import { mapQuestionsForPublish } from './create-survey-publish.helpers';
import {
  germanAnswerDateErrorMessage,
  validateGermanAnswerDateRaw,
} from './create-survey-answer-date.helpers';
import {
  answerFieldErrorKey,
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

  /** Clears the optional end date field. */
  protected clearEndDate(): void {
    this.endDate = '';
    this.clearFieldErrorKey('endDate');
  }

  /** Returns the end-date error copy when that field is invalid. */
  protected endDateFieldErrorMessage(): string {
    const issue = validateSurveyEndDateRaw(this.endDate);
    return issue === null ? '' : surveyEndDateErrorMessage(issue);
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
    this.clearFieldErrorKey(answerFieldErrorKey(qIndex, aIndex));
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

  /** Returns the letter prefix for one answer option index. */
  protected optionLetter(index: number): string {
    return `${String.fromCharCode(65 + index)}.`;
  }

  /** Returns the publish-validation key for one answer field. */
  protected answerFieldKey(questionIndex: number, answerIndex: number): string {
    return answerFieldErrorKey(questionIndex, answerIndex);
  }

  /** Returns answer-date error copy when that field failed publish validation. */
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
    if (errors['endDate'] === true) {
      this.focusAndScroll('survey-end');
      return;
    }
    const questionIndex = this.questions.findIndex(
      (_, index) => errors[`q-prompt-${index}`] === true,
    );
    if (questionIndex >= 0) {
      this.focusAndScroll(`create-q-prompt-${questionIndex}`);
      return;
    }
    this.focusFirstAnswerPublishError(errors);
  }

  /** Focuses the first invalid answer field flagged during publish. */
  private focusFirstAnswerPublishError(errors: Record<string, boolean>): void {
    for (let qi = 0; qi < this.questions.length; qi += 1) {
      const question = this.questions[qi];
      if (question === undefined) {
        continue;
      }
      for (let ai = 0; ai < question.answers.length; ai += 1) {
        if (errors[answerFieldErrorKey(qi, ai)] === true) {
          this.focusAndScroll(`create-a-${qi}-${ai}`);
          return;
        }
      }
    }
  }

  /** Focuses one element id and centers it in the viewport. */
  private focusAndScroll(elementId: string): void {
    const element = this.document.getElementById(elementId);
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    element?.focus();
  }

  /** Creates the published survey in Supabase and shows the overlay. */
  private async completePublish(first: QuestionBlock): Promise<void> {
    const title = this.surveyName.trim();
    const description = this.resolvePublishedDescription(first);
    await this.persistNewSurvey(title, description);
    this.beginPostPublishUi();
  }

  /** Builds the stored survey description from optional describing text. */
  private resolvePublishedDescription(first: QuestionBlock): string {
    const describing = this.describingText.trim();
    if (describing.length > 0) {
      return describing;
    }
    const prompt = first.prompt.trim();
    return prompt.length > 0 ? prompt : 'Survey without description.';
  }

  /** Writes the full survey graph into Supabase as published. */
  private async persistNewSurvey(title: string, description: string): Promise<void> {
    const deadline = parseSurveyEndDate(this.endDate.trim());
    const category = this.category.trim();
    await getSharedPollService().createSurvey({
      title,
      description,
      category: category.length > 0 ? category : null,
      deadline,
      questions: mapQuestionsForPublish(this.questions),
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
