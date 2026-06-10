import type { BusinessViewCandidate } from './business-view-candidate-generator';
import type { BusinessSignalRegistry } from './business-signal-detector';
import { listQuestionIntentsByBusinessView } from './domain-knowledge-catalog';

export type QuestionPlanStatus = 'candidate' | 'rejected';

export type QuestionPlan = {
  id: string;
  businessViewId: string;
  perspectiveId: string;
  intentId: string;
  confidenceScore: number;
  status: QuestionPlanStatus;
  evidenceSignals: string[];
  dimensions: string[];
  measures: string[];
};

/**
 * Generic mapping layer that deduces structural query requirements (dimensions/measures)
 * from the semantic intent ID, without hardcoding specific business domains like "logistics".
 */
export function mapIntentToStructure(intentId: string): { dimensions: string[], measures: string[] } {
  const id = intentId.toLowerCase();

  if (id.includes('trend') || id.includes('aging') || id.includes('journey')) {
    return { dimensions: ['time'], measures: ['metric'] };
  }
  
  if (id.includes('correlation') || id.includes('impact')) {
    return { dimensions: ['entity'], measures: ['metric_1', 'metric_2'] };
  }
  
  if (id.includes('distribution') || id.includes('segmentation') || id.includes('flow')) {
    return { dimensions: ['category'], measures: ['metric'] };
  }

  // Default for ranking, performance, contribution, monitoring, review, etc.
  return { dimensions: ['entity'], measures: ['metric'] };
}

export function generateQuestionPlans(
  businessViews: BusinessViewCandidate[],
  registry: BusinessSignalRegistry
): QuestionPlan[] {
  const plans: QuestionPlan[] = [];

  for (const view of businessViews) {
    if (view.status === 'rejected') {
      continue;
    }

    const intents = listQuestionIntentsByBusinessView(view.definitionId);
    
    for (const intent of intents) {
      const structure = mapIntentToStructure(intent.id);
      
      const planScore = Math.round(view.confidenceScore * 0.8);

      plans.push({
        id: `plan_${view.id}_${intent.id}`,
        businessViewId: view.id,
        perspectiveId: view.perspectiveId,
        intentId: intent.id,
        confidenceScore: planScore,
        status: 'candidate',
        // Inherit evidence directly from the view
        evidenceSignals: view.evidence.map(e => e.signalId),
        dimensions: structure.dimensions,
        measures: structure.measures
      });
    }
  }

  // Sort plans descending by confidence
  return plans.sort((a, b) => b.confidenceScore - a.confidenceScore);
}
