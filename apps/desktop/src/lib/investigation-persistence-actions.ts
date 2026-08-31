import type { InvestigationSession } from './investigation-session';
import { createAnalysisSessionIdentity } from './analysis-session-identity';
import { saveWorkspaceSession, type SaveWorkspaceSessionRequest } from './workspace-session-api';
import { isHomeDemoDataset } from './home-demo-scenarios';

const INVESTIGATION_SESSION_ROW_LIMIT = 250;

function limitInvestigationRows(rows: Record<string, unknown>[] | undefined): Record<string, unknown>[] {
  return Array.isArray(rows) ? rows.slice(0, INVESTIGATION_SESSION_ROW_LIMIT) : [];
}

export interface InvestigationPersistenceContext {
  session: InvestigationSession;
  durableAnalysisWorkbookPlan: Parameters<typeof createAnalysisSessionIdentity>[0];
  navigate: (to: string, options?: { state?: unknown }) => void;
}

export function createInvestigationPersistenceActions(context: InvestigationPersistenceContext) {
  const { session, durableAnalysisWorkbookPlan, navigate } = context;
  const { analysisAction, rows, rowScope, businessFusionOverview } = session;

  const fallbackWorkspaceSessionPayload = (): SaveWorkspaceSessionRequest => {
    const columns = rows?.[0] ? Object.keys(rows[0]) : [];
    const retainedRows = limitInvestigationRows(rows);
    return {
      title: session.datasetId || analysisAction.opportunityName || 'Untitled session',
      sourceType: businessFusionOverview ? 'business_fusion_view' : 'investigation',
      rowCount: rows?.length ?? 0,
      columnCount: columns.length,
      sourceSummary: [],
      snapshot: {
        version: 1,
        savedAt: new Date().toISOString(),
        currentDataset: {
          status: 'ready',
          file_name: session.datasetId,
          rows_count: rows?.length ?? 0,
          columns,
          profiles: {},
          sourceType: businessFusionOverview ? 'business_fusion_view' : 'investigation',
          sourceFiles: [],
          analysisRows: retainedRows,
          previewRows: retainedRows.slice(0, 100),
          businessFusionOverview,
          analysisRowScope: rows && rows.length > INVESTIGATION_SESSION_ROW_LIMIT ? 'retained_sample' : rowScope,
        },
      },
    };
  };

  const persistWorkspaceSession = async () => {
    if (isHomeDemoDataset(session.workspaceDataset)) return null;
    let payload = session.workspaceSessionPayload || fallbackWorkspaceSessionPayload();
    const analysisIdentity = createAnalysisSessionIdentity(durableAnalysisWorkbookPlan, session.workspaceDataset as any);
    if (analysisIdentity) {
      payload = { ...payload, snapshot: { ...payload.snapshot, version: 3, analysisSessionIdentity: analysisIdentity } };
    }
    try {
      const saved = await saveWorkspaceSession(payload);
      session.workspaceSessionPayload = { ...payload, id: saved.id };
      return saved;
    } catch (error) {
      console.error('Could not save workspace session', error);
      return null;
    }
  };

  const returnToCurrentDataset = async () => {
    const transientDataset = session.workspaceDataset as { status?: string } | undefined;
    if (transientDataset?.status === 'ready') {
      navigate('/', { state: null });
      void persistWorkspaceSession();
      return;
    }
    const saved = await persistWorkspaceSession();
    navigate('/', { state: saved?.id ? { restoreWorkspaceSessionId: saved.id } : null });
  };

  return { persistWorkspaceSession, returnToCurrentDataset };
}
