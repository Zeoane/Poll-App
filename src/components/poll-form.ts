import type { PollService } from '../services/poll-service.js';
import {
  type NewPollInput,
  type ValidationErrors,
  POLL_TITLE_MAX_CHARS,
  POLL_TITLE_MAX_WORDS,
} from '../types/poll.js';

import { requireElementById } from '../utils/dom.js';

const MIN_TITLE_LENGTH = 3;
const MIN_OPTIONS = 2;

/** Counts whitespace-separated words after trim (empty input → 0). */
function countTitleWords(title: string): number {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

function validationTitleError(title: string): string | undefined {
  if (title.length < MIN_TITLE_LENGTH) {
    return `Please enter a title with at least ${MIN_TITLE_LENGTH} characters.`;
  }
  if (title.length > POLL_TITLE_MAX_CHARS) {
    return `Title must be at most ${POLL_TITLE_MAX_CHARS} characters long.`;
  }
  if (countTitleWords(title) > POLL_TITLE_MAX_WORDS) {
    return `Title must be at most ${POLL_TITLE_MAX_WORDS} words.`;
  }
  return undefined;
}

function validationOptionsError(options: ReadonlyArray<string>): string | undefined {
  const uniqueOptions = new Set(options.map((option) => option.toLowerCase()));
  if (options.length < MIN_OPTIONS) {
    return `Please enter at least ${MIN_OPTIONS} answer options (one per line).`;
  }
  if (uniqueOptions.size !== options.length) {
    return 'Answer options must be unique.';
  }
  return undefined;
}

type RequiredField = 'title' | 'options';

export interface PollFormControllerOptions {
  readonly pollService: PollService;
}

/** New-survey modal: open/close, validation, and poll creation. */
export class PollFormController {
  private readonly pollService: PollService;
  private readonly dialog: HTMLDialogElement;
  private readonly form: HTMLFormElement;
  private readonly openButton: HTMLButtonElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly cancelButton: HTMLButtonElement;
  private readonly titleInput: HTMLInputElement;
  private readonly optionsInput: HTMLTextAreaElement;
  private readonly descriptionInput: HTMLTextAreaElement;
  private readonly deadlineInput: HTMLInputElement;
  private readonly titleError: HTMLElement;
  private readonly optionsError: HTMLElement;

  public constructor(options: PollFormControllerOptions) {
    this.pollService = options.pollService;
    this.dialog = requireElementById('new-survey-dialog', HTMLDialogElement);
    this.form = requireElementById('new-survey-form', HTMLFormElement);
    this.openButton = requireElementById('new-survey-button', HTMLButtonElement);
    this.closeButton = requireElementById('new-survey-close', HTMLButtonElement);
    this.cancelButton = requireElementById('new-survey-cancel', HTMLButtonElement);
    this.titleInput = requireElementById('poll-title', HTMLInputElement);
    this.optionsInput = requireElementById('poll-options', HTMLTextAreaElement);
    this.descriptionInput = requireElementById('poll-description', HTMLTextAreaElement);
    this.deadlineInput = requireElementById('poll-deadline', HTMLInputElement);
    this.titleError = requireElementById('poll-title-error', HTMLElement);
    this.optionsError = requireElementById('poll-options-error', HTMLElement);
    this.attachEvents();
  }

  /** Binds dialog and form events. */
  private attachEvents(): void {
    this.openButton.addEventListener('click', () => this.open());
    this.closeButton.addEventListener('click', () => this.close());
    this.cancelButton.addEventListener('click', () => this.close());
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.handleSubmit();
    });
    this.titleInput.addEventListener('input', () => this.clearError('title'));
    this.optionsInput.addEventListener('input', () => this.clearError('options'));
  }

  /** Opens the modal with a reset form. */
  private open(): void {
    this.form.reset();
    this.clearError('title');
    this.clearError('options');
    this.openButton.classList.remove('button--cta--success');
    this.dialog.showModal();
    this.titleInput.focus();
  }

  /** Closes the modal without submitting. */
  private close(): void {
    this.dialog.close();
  }

  /** Validates input, creates the poll, and closes on success. */
  private handleSubmit(): void {
    const input = this.collectInput();
    const errors = this.validate(input);
    if (Object.keys(errors).length > 0) {
      this.applyErrors(errors);
      return;
    }
    this.pollService.createPoll(input);
    this.openButton.classList.add('button--cta--success');
    this.close();
  }

  /** Reads form controls into a {@link NewPollInput}. */
  private collectInput(): NewPollInput {
    const rawOptions = this.optionsInput.value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const deadlineValue = this.deadlineInput.value;
    const deadline = deadlineValue.length > 0 ? new Date(deadlineValue) : null;
    return {
      title: this.titleInput.value.trim(),
      description: this.descriptionInput.value.trim(),
      category: null,
      options: rawOptions,
      deadline,
    };
  }

  /** Field-level validation for the create-poll form. */
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
    return errors;
  }

  /** Applies all errors and focuses the first invalid control. */
  private applyErrors(errors: ValidationErrors): void {
    this.applyFieldError('title', errors.title);
    this.applyFieldError('options', errors.options);
    this.focusFirstInvalid(errors);
  }

  /** Sets or clears one field’s inline error. */
  private applyFieldError(field: RequiredField, message: string | undefined): void {
    if (message === undefined) {
      this.clearError(field);
      return;
    }
    const errorElement = field === 'title' ? this.titleError : this.optionsError;
    const inputElement = field === 'title' ? this.titleInput : this.optionsInput;
    errorElement.textContent = message;
    inputElement.setAttribute('aria-invalid', 'true');
  }

  /** Focuses title first, then options, when those keys are set. */
  private focusFirstInvalid(errors: ValidationErrors): void {
    if (errors.title !== undefined) {
      this.titleInput.focus();
      return;
    }
    if (errors.options !== undefined) {
      this.optionsInput.focus();
    }
  }

  /** Clears error state for one field. */
  private clearError(field: RequiredField): void {
    const errorElement = field === 'title' ? this.titleError : this.optionsError;
    const inputElement = field === 'title' ? this.titleInput : this.optionsInput;
    errorElement.textContent = '';
    inputElement.removeAttribute('aria-invalid');
  }
}
