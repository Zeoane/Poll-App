import { requireElementById } from '../utils/dom';

/**
 * Resolves optional open-button element for the new-survey dialog.
 * @returns Open button when present and typed correctly, otherwise `null`.
 */
function readOpenButton(): HTMLButtonElement | null {
  const openEl = document.getElementById('new-survey-button');
  return openEl instanceof HTMLButtonElement ? openEl : null;
}

/**
 * Loads dialog shell elements for the new-survey modal.
 * @returns Dialog, form, and shell control elements for the modal.
 */
export function readNewSurveyShell(): {
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

/**
 * Loads form fields and error targets for the new-survey modal.
 * @returns Input controls and inline error hosts for the create form.
 */
export function readNewSurveyFields(): {
  titleInput: HTMLInputElement;
  optionsInput: HTMLTextAreaElement;
  descriptionInput: HTMLTextAreaElement;
  deadlineInput: HTMLInputElement;
  titleError: HTMLElement;
  optionsError: HTMLElement;
  deadlineError: HTMLElement;
} {
  return {
    titleInput: requireElementById('poll-title', HTMLInputElement),
    optionsInput: requireElementById('poll-options', HTMLTextAreaElement),
    descriptionInput: requireElementById('poll-description', HTMLTextAreaElement),
    deadlineInput: requireElementById('poll-deadline', HTMLInputElement),
    titleError: requireElementById('poll-title-error', HTMLElement),
    optionsError: requireElementById('poll-options-error', HTMLElement),
    deadlineError: requireElementById('poll-deadline-error', HTMLElement),
  };
}
