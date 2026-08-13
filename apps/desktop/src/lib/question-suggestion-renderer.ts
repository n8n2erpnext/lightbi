import type { QuestionPlan } from './question-plan-generator';
import { findBusinessViewDefinition, listQuestionIntentsByBusinessView } from './domain-knowledge-catalog';

export type QuestionSuggestion = {
  id: string;
  questionPlanId: string;
  businessViewId: string;
  perspectiveId: string;
  intentId: string;
  text: string;
  confidenceScore: number;
  evidenceSignals: string[];
  source: "domain_catalog";
};

export type RenderQuestionSuggestionsInput = {
  plans: QuestionPlan[];
};

export function renderQuestionSuggestions(input: RenderQuestionSuggestionsInput): QuestionSuggestion[] {
  const suggestions: QuestionSuggestion[] = [];

  for (const plan of input.plans) {
    const viewDef = findBusinessViewDefinition(plan.businessViewId);
    if (!viewDef) continue;

    const intents = listQuestionIntentsByBusinessView(plan.businessViewId);
    const intentDef = intents.find(i => i.id === plan.intentId);
    if (!intentDef) continue;

    for (let i = 0; i < intentDef.questionTemplates.length; i++) {
      const template = intentDef.questionTemplates[i];
      suggestions.push({
        id: `sugg_${plan.id}_${i}`,
        questionPlanId: plan.id,
        businessViewId: plan.businessViewId,
        perspectiveId: plan.perspectiveId,
        intentId: plan.intentId,
        text: template,
        confidenceScore: plan.confidenceScore,
        evidenceSignals: [...plan.evidenceSignals],
        source: "domain_catalog"
      });
    }
  }

  return suggestions.sort((a, b) => b.confidenceScore - a.confidenceScore);
}
