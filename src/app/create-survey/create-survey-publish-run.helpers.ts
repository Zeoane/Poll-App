import { getSharedPollService } from '../app-legacy-bootstrap';

import { parseSurveyEndDate } from './create-survey-end-date';
import { mapQuestionsForPublish } from './create-survey-publish.helpers';
import type { QuestionBlock } from './create-survey.models';

/**
 * Builds the stored survey description from optional describing text.
 * @param describingText - Optional survey describing field value.
 * @returns Trimmed describing text, or an empty string when omitted.
 */
export function resolvePublishedDescription(describingText: string): string {
  return describingText.trim();
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
