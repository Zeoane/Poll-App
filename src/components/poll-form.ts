import { minimumSurveyEndDate } from '../app/create-survey/create-survey-end-date';
import type { PollService } from '../services/poll-service';
import { type NewPollInput, type ValidationErrors } from '../types/poll';
import { readNewSurveyFields, readNewSurveyShell } from './poll-form.dom.helpers';
import {
  formatDatetimeLocalMin,
  validationDeadlineError,
  validationOptionsError,
  validationTitleError,
} from './poll-form.validation.helpers';

type RequiredField = 'title' | 'options' | 'deadline';

export interface PollFormControllerOptions {
  readonly pollService: PollService;
}

export class PollFormController {
  private readonly pollService: PollService;
  private dialog!: HTMLDialogElement;
  private form!: HTMLFormElement;
  private openButton!: HTMLButtonElement | null;
  private closeButton!: HTMLButtonElement;
  private cancelButton!: HTMLButtonElement;
  private titleInput!: HTMLInputElement;
  private optionsInput!: HTMLTextAreaElement;
  private descriptionInput!: HTMLTextAreaElement;
  private deadlineInput!: HTMLInputElement;
  private titleError!: HTMLElement;
  private optionsError!: HTMLElement;
  private deadlineError!: HTMLElement;

  /**
   * Wires the modal form to the poll service and DOM nodes.
   * @param options - Controller dependencies, including the poll service.
   */
  public constructor(options: PollFormControllerOptions) {
    this.pollService = options.pollService;
    this.assignNewSurveyDom();
    this.attachEvents();
  }

  /** Caches references to all new-survey modal elements. */
  private assignNewSurveyDom(): void {
    this.assignShell(readNewSurveyShell());
    this.assignFields(readNewSurveyFields());
  }

  /**
   * Assigns dialog shell controls to instance fields.
   * @param shell - Dialog shell elements from {@link readNewSurveyShell}.
   */
  private assignShell(shell: ReturnType<typeof readNewSurveyShell>): void {
    this.dialog = shell.dialog;
    this.form = shell.form;
    this.openButton = shell.openButton;
    this.closeButton = shell.closeButton;
    this.cancelButton = shell.cancelButton;
  }

  /**
   * Assigns inputs and error hosts to instance fields.
   * @param fields - Form field elements from {@link readNewSurveyFields}.
   */
  private assignFields(fields: ReturnType<typeof readNewSurveyFields>): void {
    this.titleInput = fields.titleInput;
    this.optionsInput = fields.optionsInput;
    this.descriptionInput = fields.descriptionInput;
    this.deadlineInput = fields.deadlineInput;
    this.titleError = fields.titleError;
    this.optionsError = fields.optionsError;
    this.deadlineError = fields.deadlineError;
  }

  /** Registers dialog, submit, and field input handlers. */
  private attachEvents(): void {
    this.openButton?.addEventListener('click', () => this.open());
    this.closeButton.addEventListener('click', () => this.close());
    this.cancelButton.addEventListener('click', () => this.close());
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.handleSubmit();
    });
    this.titleInput.addEventListener('input', () => this.clearError('title'));
    this.optionsInput.addEventListener('input', () => this.clearError('options'));
    this.deadlineInput.addEventListener('input', () => this.clearError('deadline'));
  }

  /** Resets errors and opens the modal with focus on title. */
  private open(): void {
    this.form.reset();
    this.clearError('title');
    this.clearError('options');
    this.clearError('deadline');
    this.deadlineInput.min = formatDatetimeLocalMin(minimumSurveyEndDate());
    this.openButton?.classList.remove('button--cta--success');
    this.dialog.showModal();
    this.titleInput.focus();
  }

  /** Closes the modal without persisting. */
  private close(): void {
    this.dialog.close();
  }

  /** Validates, creates a poll on success, and closes the modal. */
  private handleSubmit(): void {
    const input = this.collectInput();
    const errors = this.validate(input);
    if (Object.keys(errors).length > 0) {
      this.applyErrors(errors);
      return;
    }
    void this.submitPoll(input);
  }

  /**
   * Persists a new poll asynchronously and closes the modal on success.
   * @param input - Validated new-poll payload from the form.
   */
  private async submitPoll(input: NewPollInput): Promise<void> {
    await this.pollService.createPoll(input);
    this.openButton?.classList.add('button--cta--success');
    this.close();
  }

  /**
   * Reads trimmed form values into a new-poll payload.
   * @returns Collected form values ready for validation and submission.
   */
  private collectInput(): NewPollInput {
    const rawOptions = this.readTrimmedOptionLines();
    const deadline = this.readDeadlineFromInput();
    return {
      title: this.titleInput.value.trim(),
      description: this.descriptionInput.value.trim(),
      category: null,
      options: rawOptions,
      deadline,
    };
  }

  /**
   * Parses non-empty option lines from the textarea.
   * @returns Trimmed option labels with blank lines removed.
   */
  private readTrimmedOptionLines(): string[] {
    return this.optionsInput.value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  /**
   * Parses deadline input, or null when empty.
   * @returns Parsed deadline date, or `null` when the field is blank.
   */
  private readDeadlineFromInput(): Date | null {
    const deadlineValue = this.deadlineInput.value;
    return deadlineValue.length > 0 ? new Date(deadlineValue) : null;
  }

  /**
   * Runs title and options validation rules.
   * @param input - Collected form payload to validate.
   * @returns Field-specific validation errors, possibly empty.
   */
  private validate(input: NewPollInput): ValidationErrors {
    const errors: ValidationErrors = {};
    const titleErr = validationTitleError(input.title);
    if (titleErr !== undefined) {
      errors.title = titleErr;
    }
    const optionsErr = validationOptionsError(input.options);
    if (optionsErr !== undefined) {
      errors.options = optionsErr;
    }
    const deadlineErr = validationDeadlineError(input.deadline);
    if (deadlineErr !== undefined) {
      errors.deadline = deadlineErr;
    }
    return errors;
  }

  /**
   * Surfaces field errors and focuses the first invalid control.
   * @param errors - Validation errors keyed by form field.
   */
  private applyErrors(errors: ValidationErrors): void {
    this.applyFieldError('title', errors.title);
    this.applyFieldError('options', errors.options);
    this.applyFieldError('deadline', errors.deadline);
    this.focusFirstInvalid(errors);
  }

  /**
   * Writes one inline error or clears that field.
   * @param field - Form field receiving the error state.
   * @param message - Error text to show, or `undefined` to clear the field.
   */
  private applyFieldError(field: RequiredField, message: string | undefined): void {
    if (message === undefined) {
      this.clearError(field);
      return;
    }
    const errorElement = this.errorElementForField(field);
    const inputElement = this.inputElementForField(field);
    errorElement.textContent = message;
    inputElement.setAttribute('aria-invalid', 'true');
  }

  /**
   * Focuses title, then deadline, then options, based on which error exists.
   * @param errors - Validation errors keyed by form field.
   */
  private focusFirstInvalid(errors: ValidationErrors): void {
    if (errors.title !== undefined) {
      this.titleInput.focus();
      return;
    }
    if (errors.deadline !== undefined) {
      this.deadlineInput.focus();
      return;
    }
    if (errors.options !== undefined) {
      this.optionsInput.focus();
    }
  }

  /**
   * Clears inline error state for one field.
   * @param field - Form field whose error state should be reset.
   */
  private clearError(field: RequiredField): void {
    const errorElement = this.errorElementForField(field);
    const inputElement = this.inputElementForField(field);
    errorElement.textContent = '';
    inputElement.removeAttribute('aria-invalid');
  }

  /**
   * Resolves the inline error host for one form field.
   * @param field - Form field whose error element is needed.
   * @returns Inline error container for {@link field}.
   */
  private errorElementForField(field: RequiredField): HTMLElement {
    if (field === 'title') {
      return this.titleError;
    }
    if (field === 'deadline') {
      return this.deadlineError;
    }
    return this.optionsError;
  }

  /**
   * Resolves the input control for one form field.
   * @param field - Form field whose input element is needed.
   * @returns Input or textarea control for {@link field}.
   */
  private inputElementForField(field: RequiredField): HTMLInputElement | HTMLTextAreaElement {
    if (field === 'title') {
      return this.titleInput;
    }
    if (field === 'deadline') {
      return this.deadlineInput;
    }
    return this.optionsInput;
  }
}
