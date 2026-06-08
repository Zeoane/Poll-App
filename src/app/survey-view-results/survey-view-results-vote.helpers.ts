import type { PollService } from '../../services/poll-service';
import type { Poll, SurveyQuestion } from '../../types/poll';

export type QuestionChoices = ReadonlyArray<string>;

export interface VoteToggleResult {
  readonly poll: Poll;
  readonly choices: QuestionChoices;
}

export interface PollVoteContext {
  readonly poll: Poll;
  readonly question: SurveyQuestion;
  readonly currentChoices: QuestionChoices;
}

/** Resolves poll, question, and current choices for one vote action. */
export function resolvePollVoteContext(
  poll: Poll | null,
  viewMode: 'template' | 'poll',
  questionId: string,
  currentChoices: QuestionChoices,
  questionsForPoll: ReadonlyArray<SurveyQuestion>,
): PollVoteContext | undefined {
  if (poll === null || viewMode !== 'poll') {
    return undefined;
  }
  const question = questionsForPoll.find((entry) => entry.id === questionId);
  if (question === undefined) {
    return undefined;
  }
  return { poll, question, currentChoices };
}

/** Toggles one option for single- or multi-select questions. */
export async function toggleVoteForQuestion(
  poll: Poll,
  question: SurveyQuestion,
  optionId: string,
  currentChoices: QuestionChoices,
  service: PollService,
): Promise<VoteToggleResult | undefined> {
  if (service.isPollEnded(poll)) {
    return undefined;
  }
  if (question.allowMultiple) {
    return toggleMultiChoice(poll, question.id, optionId, currentChoices, service);
  }
  return toggleSingleChoice(poll, question.id, optionId, currentChoices, service);
}

/** Handles select, switch, or deselect for one single-choice question. */
async function toggleSingleChoice(
  poll: Poll,
  questionId: string,
  optionId: string,
  currentChoices: QuestionChoices,
  service: PollService,
): Promise<VoteToggleResult | undefined> {
  if (currentChoices.includes(optionId)) {
    return retractChoice(poll, questionId, optionId, service);
  }
  if (currentChoices.length === 1) {
    return changeChoice(poll, questionId, currentChoices[0]!, optionId, service);
  }
  return castChoice(poll, questionId, optionId, service);
}

/** Adds or removes one option on a multi-select question. */
async function toggleMultiChoice(
  poll: Poll,
  questionId: string,
  optionId: string,
  currentChoices: QuestionChoices,
  service: PollService,
): Promise<VoteToggleResult | undefined> {
  if (currentChoices.includes(optionId)) {
    return retractChoice(poll, questionId, optionId, service);
  }
  return castChoice(poll, questionId, optionId, service);
}

/** Casts a vote and appends the option id to local choices. */
async function castChoice(
  poll: Poll,
  questionId: string,
  optionId: string,
  service: PollService,
): Promise<VoteToggleResult | undefined> {
  const updated = await service.voteOnQuestion(poll.id, questionId, optionId);
  if (updated === undefined) {
    return undefined;
  }
  const prior = await service.loadVoterChoices(poll.id);
  return { poll: updated, choices: prior[questionId] ?? [optionId] };
}

/** Retracts a vote and rebuilds local choices from the service. */
async function retractChoice(
  poll: Poll,
  questionId: string,
  optionId: string,
  service: PollService,
): Promise<VoteToggleResult | undefined> {
  const updated = await service.retractVoteOnQuestion(poll.id, questionId, optionId);
  if (updated === undefined) {
    return undefined;
  }
  const prior = await service.loadVoterChoices(poll.id);
  return { poll: updated, choices: prior[questionId] ?? [] };
}

/** Switches a single-choice vote to another option. */
async function changeChoice(
  poll: Poll,
  questionId: string,
  fromOptionId: string,
  toOptionId: string,
  service: PollService,
): Promise<VoteToggleResult | undefined> {
  const updated = await service.changeVoteOnQuestion(
    poll.id,
    questionId,
    fromOptionId,
    toOptionId,
  );
  if (updated === undefined) {
    return undefined;
  }
  return { poll: updated, choices: [toOptionId] };
}
