import { CategoryListDropdown } from '../../components/category-list-dropdown';
import { POLL_CATEGORIES } from '../../types/poll';

export interface CategorySelectionHandlers {
  getSelection: () => string | null;
  setSelection: (value: string | null) => void;
}

/** Returns wired dropdown or null when DOM nodes are missing. */
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

type CategoryDom = {
  trigger: HTMLButtonElement;
  menu: HTMLUListElement;
  label: HTMLElement;
  selectionCaption: HTMLElement;
};

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
