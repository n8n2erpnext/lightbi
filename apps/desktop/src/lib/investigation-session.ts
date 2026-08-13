import type { AnalysisAction } from './analysis-opportunity-actions';
import type { RuntimeIntent } from './analysis-runtime-contract';
import type { RuntimePlanPreview } from './runtime-planner-preview';
import type { AISafeBriefing } from './ai-briefing-contract';
import type { RuntimeDatasetSource, RuntimeRowScope } from './runtime-dataset-source';
import type { BusinessFusionOverview } from './business-fusion-overview';
import type { SaveWorkspaceSessionRequest } from './workspace-session-api';
import type { CanonicalInvestigationHandoffV1 } from './understanding-core/canonical-consumer-boundary';
import type { GovernedMetricExecutionResultV1 } from './understanding-core/governed-runtime-contracts';
import type { CanonicalMultiSourceDatasetV1, CanonicalMultiSourceInvestigationHandoffV1 } from './understanding-core/canonical-multisource-boundary';
import type { CanonicalMultiSourceExecutionResultV1 } from './understanding-core/governed-multisource-duckdb-boundary';

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
  canonicalHandoff?: CanonicalInvestigationHandoffV1 | CanonicalMultiSourceInvestigationHandoffV1;
  canonicalExecutionResult?: GovernedMetricExecutionResultV1;
  canonicalMultiSourceDataset?: CanonicalMultiSourceDatasetV1;
  canonicalMultiSourceExecutionResult?: CanonicalMultiSourceExecutionResultV1;
  supportingAnalyses?: Array<{
    analysisAction: AnalysisAction;
    runtimeIntent: RuntimeIntent;
    runtimePlanPreview: RuntimePlanPreview;
  }>;
  /**
   * The complete Easy-mode workspace kept only for the lifetime of the app.
   * This lets Back return to the already-understood source without downloading
   * and profiling the persisted file again. It is never serialized.
   */
  workspaceDataset?: unknown;
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
  workspaceSessionPayload?: SaveWorkspaceSessionRequest,
  canonicalHandoff?: CanonicalInvestigationHandoffV1 | CanonicalMultiSourceInvestigationHandoffV1,
  canonicalMultiSourceDataset?: CanonicalMultiSourceDatasetV1,
  supportingAnalyses?: InvestigationSession['supportingAnalyses'],
  workspaceDataset?: unknown
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
    workspaceSessionPayload,
    canonicalHandoff,
    canonicalMultiSourceDataset,
    supportingAnalyses,
    workspaceDataset,
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
