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

type RequiredField = 'title' | 'options';

export interface PollFormControllerOptions {
  readonly pollService: PollService;
}

/** Controls the new-survey dialog: opening, validation, and poll creation. */
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

  /** Wires up dialog open/close and form submission events. */
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

  /** Resets the form, clears errors, and opens the modal dialog. */
  private open(): void {
    this.form.reset();
    this.clearError('title');
    this.clearError('options');
    this.dialog.showModal();
    this.titleInput.focus();
  }

  /** Closes the modal dialog without submitting. */
  private close(): void {
    this.dialog.close();
  }

  /** Handles form submission by validating and creating a new poll. */
  private handleSubmit(): void {
    const input = this.collectInput();
    const errors = this.validate(input);
    if (Object.keys(errors).length > 0) {
      this.applyErrors(errors);
      return;
    }
    this.pollService.createPoll(input);
    this.close();
  }

  /** Reads the current form values into a structured NewPollInput. */
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

  /** Returns validation errors keyed by field, or an empty object when valid. */
  private validate(input: NewPollInput): ValidationErrors {
    const errors: ValidationErrors = {};
    if (input.title.length < MIN_TITLE_LENGTH) {
      errors.title = `Bitte einen Titel mit mindestens ${MIN_TITLE_LENGTH} Zeichen angeben.`;
    } else if (input.title.length > POLL_TITLE_MAX_CHARS) {
      errors.title = `Der Titel darf höchstens ${POLL_TITLE_MAX_CHARS} Zeichen haben.`;
    } else if (countTitleWords(input.title) > POLL_TITLE_MAX_WORDS) {
      errors.title = `Der Titel darf höchstens ${POLL_TITLE_MAX_WORDS} Wörter haben.`;
    }
    const uniqueOptions = new Set(input.options.map((option) => option.toLowerCase()));
    if (input.options.length < MIN_OPTIONS) {
      errors.options = `Bitte mindestens ${MIN_OPTIONS} Antwortoptionen angeben (eine pro Zeile).`;
    } else if (uniqueOptions.size !== input.options.length) {
      errors.options = 'Antwortoptionen müssen eindeutig sein.';
    }
    return errors;
  }

  /** Renders all validation errors and focuses the first invalid field. */
  private applyErrors(errors: ValidationErrors): void {
    this.applyFieldError('title', errors.title);
    this.applyFieldError('options', errors.options);
    this.focusFirstInvalid(errors);
  }

  /** Renders or clears the error message for a single field. */
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

  /** Moves focus to the first field that has a validation error. */
  private focusFirstInvalid(errors: ValidationErrors): void {
    if (errors.title !== undefined) {
      this.titleInput.focus();
      return;
    }
    if (errors.options !== undefined) {
      this.optionsInput.focus();
    }
  }

  /** Clears the error message for the given field. */
  private clearError(field: RequiredField): void {
    const errorElement = field === 'title' ? this.titleError : this.optionsError;
    const inputElement = field === 'title' ? this.titleInput : this.optionsInput;
    errorElement.textContent = '';
    inputElement.removeAttribute('aria-invalid');
  }
}
