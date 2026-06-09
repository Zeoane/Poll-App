import { isExamplePoll, isKnownExamplePollId } from '../../data/example-polls';
import type { Poll } from '../../types/poll';

/**
 * True on the template preview route or when viewing a built-in example poll.
 * @param viewMode - Current survey view mode.
 * @param currentPoll - Loaded poll, if any.
 * @param routePollId - Route poll id while detail is loading.
 * @returns Whether the page should behave as a demo-only survey.
 */
export function isDemoSurveyView(
  viewMode: 'template' | 'poll',
  currentPoll: Poll | null,
  routePollId: string | null,
): boolean {
  if (viewMode === 'template') {
    return true;
  }
  if (isExamplePoll(currentPoll ?? undefined)) {
    return true;
  }
  return isKnownExamplePollId(routePollId);
}

/**
 * True when a transparent guard should capture page clicks before the notice opens.
 * @param isDemoPage - Whether the current route is a demo survey view.
 * @param overlayOpen - Whether the demo notice overlay is already visible.
 * @returns Whether the click guard layer should render.
 */
export function shouldShowDemoInteractionGuard(
  isDemoPage: boolean,
  overlayOpen: boolean,
): boolean {
  return isDemoPage && !overlayOpen;
}
