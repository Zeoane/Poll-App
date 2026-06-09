import { getSharedPollService } from '../app-legacy-bootstrap';

import { parseSurveyEndDate } from './create-survey-end-date';
import { mapQuestionsForPublish } from './create-survey-publish.helpers';
import type { QuestionBlock } from './create-survey.models';

/**
 * Builds the stored survey description from optional describing text.
 * @param describingText - Optional survey describing field value.
 * @param first - First question block supplying prompt fallback text.
 * @returns Trimmed describing text, first prompt, or a generic fallback.
 */
export function resolvePublishedDescription(
  describingText: string,
  first: QuestionBlock,
): string {
  const describing = describingText.trim();
  if (describing.length > 0) {
    return describing;
  }
  const prompt = first.prompt.trim();
  return prompt.length > 0 ? prompt : 'Survey without description.';
}

/**
 * Writes the full survey graph into Supabase as published.
 * @param title - Trimmed survey title.
 * @param description - Stored survey description.
 * @param endDate - Raw optional end-date field value.
 * @param category - Selected category label.
 * @param questions - Question blocks to publish.
 */
export async function persistPublishedSurvey(
  title: string,
  description: string,
  endDate: string,
  category: string,
  questions: readonly QuestionBlock[],
): Promise<void> {
  const deadline = parseSurveyEndDate(endDate.trim());
  const trimmedCategory = category.trim();
  await getSharedPollService().createSurvey({
    title,
    description,
    category: trimmedCategory.length > 0 ? trimmedCategory : null,
    deadline,
    questions: mapQuestionsForPublish(questions),
  });
}
