import type { Poll, SurveyQuestion } from '../types/poll';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/** Polls ending within this window appear in the home “Ending soon” row. */
export const ENDING_SOON_THRESHOLD_MS = 3 * DAY_IN_MS;

/** True when the poll deadline has passed relative to reference time. */
export function isPollEnded(poll: Poll, referenceTimeMs: number = Date.now()): boolean {
  if (poll.deadline === null) {
    return false;
  }
  return poll.deadline.getTime() <= referenceTimeMs;
}

/** True when the poll category matches the active filter (null = all). */
export function pollMatchesCategory(poll: Poll, category: string | null): boolean {
  if (category === null) {
    return true;
  }
  return poll.category === category;
}

/** True when deadline lies strictly between now and the ending-soon threshold. */
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

/** Sorts by ascending deadline; missing deadlines go last. */
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

/** Sums votes for one question's options. */
export function getQuestionVoteTotal(question: SurveyQuestion): number {
  return question.options.reduce((sum, option) => sum + option.votes, 0);
}

/** Sums votes across all questions or legacy flat options. */
export function getTotalVotes(poll: Poll): number {
  if (poll.questions !== undefined && poll.questions.length > 0) {
    return poll.questions.reduce(
      (sum, question) => sum + getQuestionVoteTotal(question),
      0,
    );
  }
  return poll.options.reduce((sum, option) => sum + option.votes, 0);
}

/** Lists non-ended polls matching the category filter. */
export function listActivePolls(
  polls: readonly Poll[],
  category: string | null,
  referenceTimeMs: number = Date.now(),
): Poll[] {
  return polls
    .filter((poll) => !isPollEnded(poll, referenceTimeMs))
    .filter((poll) => pollMatchesCategory(poll, category));
}

/** Lists ended polls matching the category filter. */
export function listPastPolls(
  polls: readonly Poll[],
  category: string | null,
  referenceTimeMs: number = Date.now(),
): Poll[] {
  return polls
    .filter((poll) => isPollEnded(poll, referenceTimeMs))
    .filter((poll) => pollMatchesCategory(poll, category));
}

/** Lists soon-ending active polls, ignoring the category filter. */
export function listEndingSoonPolls(
  polls: readonly Poll[],
  referenceTimeMs: number = Date.now(),
): Poll[] {
  const thresholdMs = referenceTimeMs + ENDING_SOON_THRESHOLD_MS;
  return polls
    .filter((poll) => !isPollEnded(poll, referenceTimeMs))
    .filter((poll) => pollIsEndingSoon(poll, referenceTimeMs, thresholdMs));
}
