import type { Poll } from '../types/poll';

import { formatEndsIn } from '../utils/format';

export interface PollCardOptions {
  readonly poll: Poll;
  readonly isInteractive: boolean;
  readonly onSelect?: (pollId: string) => void;
  readonly highlight?: boolean;
}

/** Creates a poll card list item, optionally with a stretched-link open button. */
export function createPollCard(options: PollCardOptions): HTMLLIElement {
  const item = createCardItem(options);
  const article = createCardArticle(options.poll);
  if (options.isInteractive && options.onSelect !== undefined) {
    article.append(createOpenButton(options.poll, options.onSelect));
  }
  item.append(article);
  return item;
}

/** Creates the outer <li> and applies modifier classes. */
function createCardItem(options: PollCardOptions): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'poll-card';
  if (options.highlight === true) {
    item.classList.add('poll-card--highlight');
  }
  if (!options.isInteractive) {
    item.classList.add('poll-card--static');
  }
  return item;
}

/** Builds the inner article shell for a poll card. */
function createCardArticle(poll: Poll): HTMLElement {
  const article = document.createElement('article');
  article.className = 'poll-card__inner';

  if (poll.category !== null && poll.category.length > 0) {
    article.append(buildCategory(poll.category));
  }
  article.append(buildTitle(poll.title));

  const endsInLabel = formatEndsIn(poll.deadline);
  if (endsInLabel !== null) {
    article.append(buildPill(endsInLabel));
  }
  return article;
}

/** Creates the category label rendered above the title. */
function buildCategory(label: string): HTMLParagraphElement {
  const element = document.createElement('p');
  element.className = 'poll-card__category';
  element.textContent = label;
  return element;
}

/** Creates the heading element for a poll card. */
function buildTitle(text: string): HTMLHeadingElement {
  const title = document.createElement('h3');
  title.className = 'poll-card__title';
  title.textContent = text;
  return title;
}

/** Creates the bottom "Ends in X Day" pill with asymmetric corner radius. */
function buildPill(text: string): HTMLSpanElement {
  const pill = document.createElement('span');
  pill.className = 'poll-card__pill';
  pill.textContent = text;
  return pill;
}

/** Creates the invisible stretched-link button covering the whole card. */
function createOpenButton(
  poll: Poll,
  onSelect: (pollId: string) => void,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'poll-card__open';
  button.setAttribute('aria-label', `Umfrage öffnen: ${poll.title}`);
  button.addEventListener('click', () => {
    onSelect(poll.id);
  });
  return button;
}
