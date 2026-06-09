import type {
  QuestionOptionRow,
  QuestionResultStatRow,
  QuestionRow,
  SurveyRow,
} from '../types/database.types';
import type { Poll, PollOption, SurveyQuestion } from '../types/poll';

/**
 * Maps one survey row to a list-level poll without question details.
 * @param row - Survey row from the `surveys` table.
 * @returns List-level poll with empty options and parsed dates.
 */
export function mapSurveyRowToListPoll(row: SurveyRow): Poll {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    options: [],
    createdAt: new Date(row.created_at),
    deadline: row.deadline === null ? null : new Date(row.deadline),
    status: 'published',
  };
}

/**
 * Maps and sorts question rows with options and aggregated vote counts.
 * @param questions - Question rows for one survey.
 * @param options - Option rows for those questions.
 * @param stats - Aggregated vote stats from `question_result_stats`.
 * @returns Questions sorted by `sort_order` with nested options and vote totals.
 */
function mapSurveyQuestions(
  questions: readonly QuestionRow[],
  options: readonly QuestionOptionRow[],
  stats: readonly QuestionResultStatRow[],
): SurveyQuestion[] {
  const voteByOption = buildVoteCountMap(stats);
  return questions
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((question) => mapQuestionRow(question, options, voteByOption));
}

/**
 * Builds a full poll with nested questions and vote counts.
 * @param survey - Survey header row.
 * @param questions - Question rows for the survey.
 * @param options - Option rows for those questions.
 * @param stats - Aggregated vote stats from `question_result_stats`.
 * @returns Full poll with nested questions; legacy `options` mirrors the first question.
 */
export function mapSurveyDetailToPoll(
  survey: SurveyRow,
  questions: readonly QuestionRow[],
  options: readonly QuestionOptionRow[],
  stats: readonly QuestionResultStatRow[],
): Poll {
  const mappedQuestions = mapSurveyQuestions(questions, options, stats);
  const firstOptions = mappedQuestions[0]?.options ?? [];
  return {
    id: survey.id,
    title: survey.title,
    description: survey.description,
    category: survey.category,
    options: firstOptions,
    questions: mappedQuestions,
    createdAt: new Date(survey.created_at),
    deadline: survey.deadline === null ? null : new Date(survey.deadline),
    status: 'published',
  };
}

/**
 * Maps one question row with its options and vote totals.
 * @param question - Question row to map.
 * @param options - All option rows for the survey (filtered by question id).
 * @param voteByOption - Option id to vote count lookup.
 * @returns Survey question with sorted options and vote counts.
 */
function mapQuestionRow(
  question: QuestionRow,
  options: readonly QuestionOptionRow[],
  voteByOption: ReadonlyMap<string, number>,
): SurveyQuestion {
  const questionOptions = options
    .filter((option) => option.question_id === question.id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((option) => mapOptionRow(option, voteByOption));
  return {
    id: question.id,
    sortOrder: question.sort_order,
    prompt: question.prompt,
    allowMultiple: question.allow_multiple,
    options: questionOptions,
  };
}

/**
 * Maps one option row with an aggregated vote count.
 * @param option - Option row from `question_options`.
 * @param voteByOption - Option id to vote count lookup.
 * @returns Poll option with label and vote total (zero when no stat row exists).
 */
function mapOptionRow(
  option: QuestionOptionRow,
  voteByOption: ReadonlyMap<string, number>,
): PollOption {
  return {
    id: option.id,
    label: option.label,
    votes: voteByOption.get(option.id) ?? 0,
  };
}

/**
 * Indexes vote counts by option id from result stats rows.
 * @param stats - Rows from the `question_result_stats` view.
 * @returns Map of option id to vote count; rows with null `option_id` are skipped.
 */
function buildVoteCountMap(
  stats: readonly QuestionResultStatRow[],
): ReadonlyMap<string, number> {
  const map = new Map<string, number>();
  for (const row of stats) {
    if (row.option_id === null) {
      continue;
    }
    map.set(row.option_id, row.vote_count ?? 0);
  }
  return map;
}
