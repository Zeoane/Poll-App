import { CategoryListDropdown } from '../../components/category-list-dropdown';
import { POLL_CATEGORIES } from '../../types/poll';

export interface CategorySelectionHandlers {
  getSelection: () => string | null;
  setSelection: (value: string | null) => void;
}

type CategoryDom = {
  trigger: HTMLButtonElement;
  menu: HTMLUListElement;
  label: HTMLElement;
  selectionCaption: HTMLElement;
};

/**
 * Returns wired dropdown or null when DOM nodes are missing.
 * @param doc - Document containing create-survey category markup.
 * @param handlers - Getter and setter bridging Angular state to the dropdown.
 * @returns Initialized dropdown controller, or `null` when required elements are absent.
 */
export function attachCreateSurveyCategoryDropdown(
  doc: Document,
  handlers: CategorySelectionHandlers,
): CategoryListDropdown | null {
  const els = queryCategoryElements(doc);
  if (els === null) {
    return null;
  }
  return new CategoryListDropdown({
    ...els,
    placeholder: 'Choose category',
    categories: POLL_CATEGORIES,
    allowClearByRetoggle: false,
    getSelection: handlers.getSelection,
    setSelection: handlers.setSelection,
    triggerActiveClass: 'create-category-trigger__button--filled',
  });
}

/**
 * Reads create-survey category dropdown nodes from the document.
 * @param doc - Document to query for category dropdown element ids.
 * @returns DOM node bundle, or `null` when any required element is missing.
 */
function queryCategoryElements(doc: Document): CategoryDom | null {
  const trigger = doc.getElementById(
    'survey-category-button',
  ) as HTMLButtonElement | null;
  const menu = doc.getElementById('survey-category-menu') as HTMLUListElement | null;
  const label = doc.getElementById('survey-category-label') as HTMLElement | null;
  const selCap = doc.getElementById(
    'survey-category-selection-caption',
  ) as HTMLElement | null;
  if (trigger && menu && label && selCap) {
    return { trigger, menu, label, selectionCaption: selCap };
  }
  return null;
}
