import type { AnalysisAction } from './analysis-opportunity-actions';
import type { RuntimeIntent } from './analysis-runtime-contract';
import type { RuntimePlanPreview } from './runtime-planner-preview';
import type { AISafeBriefing } from './ai-briefing-contract';
import type { RuntimeDatasetSource, RuntimeRowScope } from './runtime-dataset-source';
import type { BusinessFusionOverview } from './business-fusion-overview';
import type { SaveWorkspaceSessionRequest } from './workspace-session-api';

export interface InvestigationSession {
  id: string;
  datasetId: string;
  createdAt: number;
  analysisAction: AnalysisAction;
  runtimeIntent: RuntimeIntent;
  runtimePlanPreview: RuntimePlanPreview;
  rows?: Record<string, unknown>[];
  aiBriefing?: AISafeBriefing;
  runtimeDatasetSource?: RuntimeDatasetSource;
  rowScope?: RuntimeRowScope;
  businessFusionOverview?: BusinessFusionOverview;
  workspaceSessionPayload?: SaveWorkspaceSessionRequest;
}

// In-memory store for now, since we aren't using a real backend or persistent DB yet.
// In a real app this would go to a database or local storage.
let currentSession: InvestigationSession | null = null;

export function createInvestigationSession(
  datasetId: string,
  analysisAction: AnalysisAction,
  runtimeIntent: RuntimeIntent,
  runtimePlanPreview: RuntimePlanPreview,
  rows?: Record<string, unknown>[],
  aiBriefing?: AISafeBriefing,
  runtimeDatasetSource?: RuntimeDatasetSource,
  rowScope?: RuntimeRowScope,
  businessFusionOverview?: BusinessFusionOverview,
  workspaceSessionPayload?: SaveWorkspaceSessionRequest
): InvestigationSession {
  let safeRows = rows;
  // Deep clone to preserve original
  safeRows = safeRows ? JSON.parse(JSON.stringify(safeRows)) : undefined;
  console.log("TRACE [SESSION] rows.length:", safeRows ? safeRows.length : 0);

  const session: InvestigationSession = {
    id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    datasetId,
    createdAt: Date.now(),
    analysisAction,
    runtimeIntent,
    runtimePlanPreview,
    rows: safeRows,
    aiBriefing,
    runtimeDatasetSource,
    rowScope,
    businessFusionOverview,
    workspaceSessionPayload
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
