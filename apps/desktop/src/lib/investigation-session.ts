import type { AnalysisAction } from './analysis-opportunity-actions';
import type { RuntimeIntent } from './analysis-runtime-contract';
import type { RuntimePlanPreview } from './runtime-planner-preview';

export interface InvestigationSession {
  id: string;
  datasetId: string;
  createdAt: number;
  analysisAction: AnalysisAction;
  runtimeIntent: RuntimeIntent;
  runtimePlanPreview: RuntimePlanPreview;
}

// In-memory store for now, since we aren't using a real backend or persistent DB yet.
// In a real app this would go to a database or local storage.
let currentSession: InvestigationSession | null = null;

export function createInvestigationSession(
  datasetId: string,
  analysisAction: AnalysisAction,
  runtimeIntent: RuntimeIntent,
  runtimePlanPreview: RuntimePlanPreview
): InvestigationSession {
  const session: InvestigationSession = {
    id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    datasetId,
    createdAt: Date.now(),
    analysisAction,
    runtimeIntent,
    runtimePlanPreview
  };
  
  currentSession = session;
  return session;
}

export function getCurrentInvestigationSession(): InvestigationSession | null {
  return currentSession;
}

export function clearInvestigationSession(): void {
  currentSession = null;
}
