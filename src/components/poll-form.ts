import type { PollService } from '../services/poll-service';
import {
  type NewPollInput,
  type ValidationErrors,
  POLL_TITLE_MAX_CHARS,
  POLL_TITLE_MAX_WORDS,
} from '../types/poll';

import { requireElementById } from '../utils/dom';

const MIN_TITLE_LENGTH = 3;
const MIN_OPTIONS = 2;

/** Counts non-empty trimmed words in a title string. */
function countTitleWords(title: string): number {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

/** Returns a title validation message or undefined when valid. */
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

/** Returns an options validation message or undefined when valid. */
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

/** Resolves optional open-button element for the new-survey dialog. */
function readOpenButton(): HTMLButtonElement | null {
  const openEl = document.getElementById('new-survey-button');
  return openEl instanceof HTMLButtonElement ? openEl : null;
}

/** Loads dialog shell elements for the new-survey modal. */
function readNewSurveyShell(): {
  dialog: HTMLDialogElement;
  form: HTMLFormElement;
  openButton: HTMLButtonElement | null;
  closeButton: HTMLButtonElement;
  cancelButton: HTMLButtonElement;
} {
  return {
    dialog: requireElementById('new-survey-dialog', HTMLDialogElement),
    form: requireElementById('new-survey-form', HTMLFormElement),
    openButton: readOpenButton(),
    closeButton: requireElementById('new-survey-close', HTMLButtonElement),
    cancelButton: requireElementById('new-survey-cancel', HTMLButtonElement),
  };
}

/** Loads form fields and error targets for the new-survey modal. */
function readNewSurveyFields(): {
  titleInput: HTMLInputElement;
  optionsInput: HTMLTextAreaElement;
  descriptionInput: HTMLTextAreaElement;
  deadlineInput: HTMLInputElement;
  titleError: HTMLElement;
  optionsError: HTMLElement;
} {
  return {
    titleInput: requireElementById('poll-title', HTMLInputElement),
    optionsInput: requireElementById('poll-options', HTMLTextAreaElement),
    descriptionInput: requireElementById('poll-description', HTMLTextAreaElement),
    deadlineInput: requireElementById('poll-deadline', HTMLInputElement),
    titleError: requireElementById('poll-title-error', HTMLElement),
    optionsError: requireElementById('poll-options-error', HTMLElement),
  };
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

  /** Wires the modal form to the poll service and DOM nodes. */
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

  /** Assigns dialog shell controls to instance fields. */
  private assignShell(shell: ReturnType<typeof readNewSurveyShell>): void {
    this.dialog = shell.dialog;
    this.form = shell.form;
    this.openButton = shell.openButton;
    this.closeButton = shell.closeButton;
    this.cancelButton = shell.cancelButton;
  }

  /** Assigns inputs and error hosts to instance fields. */
  private assignFields(fields: ReturnType<typeof readNewSurveyFields>): void {
    this.titleInput = fields.titleInput;
    this.optionsInput = fields.optionsInput;
    this.descriptionInput = fields.descriptionInput;
    this.deadlineInput = fields.deadlineInput;
    this.titleError = fields.titleError;
    this.optionsError = fields.optionsError;
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
  }

  /** Resets errors and opens the modal with focus on title. */
  private open(): void {
    this.form.reset();
    this.clearError('title');
    this.clearError('options');
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
    this.pollService.createPoll(input);
    this.openButton?.classList.add('button--cta--success');
    this.close();
  }

  /** Reads trimmed form values into a new-poll payload. */
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

  /** Parses non-empty option lines from the textarea. */
  private readTrimmedOptionLines(): string[] {
    return this.optionsInput.value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  /** Parses deadline input, or null when empty. */
  private readDeadlineFromInput(): Date | null {
    const deadlineValue = this.deadlineInput.value;
    return deadlineValue.length > 0 ? new Date(deadlineValue) : null;
  }

  /** Runs title and options validation rules. */
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

  /** Surfaces field errors and focuses the first invalid control. */
  private applyErrors(errors: ValidationErrors): void {
    this.applyFieldError('title', errors.title);
    this.applyFieldError('options', errors.options);
    this.focusFirstInvalid(errors);
  }

  /** Writes one inline error or clears that field. */
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

  /** Focuses title, then options, based on which error exists. */
  private focusFirstInvalid(errors: ValidationErrors): void {
    if (errors.title !== undefined) {
      this.titleInput.focus();
      return;
    }
    if (errors.options !== undefined) {
      this.optionsInput.focus();
    }
  }

  /** Clears inline error state for one field. */
  private clearError(field: RequiredField): void {
    const errorElement = field === 'title' ? this.titleError : this.optionsError;
    const inputElement = field === 'title' ? this.titleInput : this.optionsInput;
    errorElement.textContent = '';
    inputElement.removeAttribute('aria-invalid');
  }
}
