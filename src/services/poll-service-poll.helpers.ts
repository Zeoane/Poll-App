import type { Poll, SurveyQuestion } from '../types/poll';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/** Polls ending within this window appear in the home “Ending soon” row. */
export const ENDING_SOON_THRESHOLD_MS = 3 * DAY_IN_MS;

/**
 * True when the poll deadline has passed relative to reference time.
 * @param poll - Poll to check.
 * @param referenceTimeMs - Reference instant in milliseconds; defaults to now.
 * @returns False when the poll has no deadline; otherwise true when deadline is on or before the reference time.
 */
export function isPollEnded(poll: Poll, referenceTimeMs: number = Date.now()): boolean {
  if (poll.deadline === null) {
    return false;
  }
  return poll.deadline.getTime() <= referenceTimeMs;
}

/**
 * True when the poll category matches the active filter (null = all).
 * @param poll - Poll to test.
 * @param category - Active category filter, or null to match all categories.
 * @returns True when the filter is null or equals the poll category.
 */
export function pollMatchesCategory(poll: Poll, category: string | null): boolean {
  if (category === null) {
    return true;
  }
  return poll.category === category;
}

/**
 * True when deadline lies strictly between now and the ending-soon threshold.
 * @param poll - Poll to test.
 * @param nowMs - Current reference instant in milliseconds.
 * @param thresholdMs - Upper bound instant (now + ending-soon window).
 * @returns False when the poll has no deadline; otherwise true when deadline is after now and on or before the threshold.
 */
export function pollIsEndingSoon(
  poll: Poll,
  nowMs: number,
  thresholdMs: number,
): boolean {
  if (poll.deadline === null) {
    return false;
  }
  const deadlineMs = poll.deadline.getTime();
  return deadlineMs > nowMs && deadlineMs <= thresholdMs;
}

/**
 * Sorts by ascending deadline; missing deadlines go last.
 * @param a - First poll to compare.
 * @param b - Second poll to compare.
 * @returns Negative, zero, or positive sort order for `Array.sort`.
 */
export function comparePollsByDeadline(a: Poll, b: Poll): number {
  if (a.deadline === null && b.deadline === null) {
    return a.createdAt.getTime() - b.createdAt.getTime();
  }
  if (a.deadline === null) {
    return 1;
  }
  if (b.deadline === null) {
    return -1;
  }
  const byDeadline = a.deadline.getTime() - b.deadline.getTime();
  if (byDeadline !== 0) {
    return byDeadline;
  }
  return a.createdAt.getTime() - b.createdAt.getTime();
}

/**
 * Sums votes for one question's options.
 * @param question - Question whose option vote counts to sum.
 * @returns Total votes across all options on the question.
 */
export function getQuestionVoteTotal(question: SurveyQuestion): number {
  return question.options.reduce((sum, option) => sum + option.votes, 0);
}

/**
 * Sums votes across all questions or legacy flat options.
 * @param poll - Poll with nested questions or legacy flat options.
 * @returns Total vote count across all questions, or across flat options when no questions exist.
 */
export function getTotalVotes(poll: Poll): number {
  if (poll.questions !== undefined && poll.questions.length > 0) {
    return poll.questions.reduce(
      (sum, question) => sum + getQuestionVoteTotal(question),
      0,
    );
  }
  return poll.options.reduce((sum, option) => sum + option.votes, 0);
}

/**
 * Lists non-ended polls matching the category filter.
 * @param polls - Source poll list.
 * @param category - Category filter, or null for all categories.
 * @param referenceTimeMs - Reference instant for ended checks; defaults to now.
 * @returns Active polls that match the category filter (order unchanged).
 */
export function listActivePolls(
  polls: readonly Poll[],
  category: string | null,
  referenceTimeMs: number = Date.now(),
): Poll[] {
  return polls
    .filter((poll) => !isPollEnded(poll, referenceTimeMs))
    .filter((poll) => pollMatchesCategory(poll, category));
}

/**
 * Lists ended polls matching the category filter.
 * @param polls - Source poll list.
 * @param category - Category filter, or null for all categories.
 * @param referenceTimeMs - Reference instant for ended checks; defaults to now.
 * @returns Ended polls that match the category filter (order unchanged).
 */
export function listPastPolls(
  polls: readonly Poll[],
  category: string | null,
  referenceTimeMs: number = Date.now(),
): Poll[] {
  return polls
    .filter((poll) => isPollEnded(poll, referenceTimeMs))
    .filter((poll) => pollMatchesCategory(poll, category));
}

/**
 * Lists soon-ending active polls, ignoring the category filter.
 * @param polls - Source poll list.
 * @param referenceTimeMs - Reference instant for ended and window checks; defaults to now.
 * @returns Active polls whose deadline falls within {@link ENDING_SOON_THRESHOLD_MS} of the reference time.
 */
export function listEndingSoonPolls(
  polls: readonly Poll[],
  referenceTimeMs: number = Date.now(),
): Poll[] {
  const thresholdMs = referenceTimeMs + ENDING_SOON_THRESHOLD_MS;
  return polls
    .filter((poll) => !isPollEnded(poll, referenceTimeMs))
    .filter((poll) => pollIsEndingSoon(poll, referenceTimeMs, thresholdMs));
}

/**
 * Returns the first nested survey question when present.
 * @param poll - Poll whose first question to read.
 * @returns First question, or undefined when `questions` is empty or missing.
 */
export function getFirstSurveyQuestion(poll: Poll): SurveyQuestion | undefined {
  return poll.questions?.[0];
}
