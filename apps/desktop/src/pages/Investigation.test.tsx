/**
 * @vitest-environment jsdom
 */
import fs from 'node:fs';
import path from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalysisAction } from '../lib/analysis-opportunity-actions';
import type { RuntimeIntent } from '../lib/analysis-runtime-contract';
import type { InvestigationSession } from '../lib/investigation-session';
import type { ResultValidationResult } from '../lib/result-validator-contract';
import type { RuntimePlanPreview } from '../lib/runtime-planner-preview';
import type { RuntimeDatasetSource, RuntimeSourceBindingV1 } from '../lib/runtime-dataset-source';
import type { CanonicalInvestigationHandoffV1 } from '../lib/understanding-core/canonical-consumer-boundary';
import type { CanonicalSourceBoundaryV1 } from '../lib/understanding-core/canonical-source-boundary';
import type {
  GovernedExecutionEvidenceV1,
  GovernedExecutionRestrictionV1,
  GovernedMetricExecutionResultV1,
  GovernedMetricQueryPlanV1,
  GovernedRuntimeActionV1,
  GovernedRuntimePreflightV1,
} from '../lib/understanding-core/governed-runtime-contracts';
import { Investigation } from './Investigation';

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));

vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));
vi.mock('../lib/investigation-session', () => ({ getCurrentInvestigationSession: vi.fn() }));
vi.mock('../lib/workspace-session-api', () => ({
  saveWorkspaceSession: vi.fn().mockResolvedValue({ id: 'saved-session' }),
}));
vi.mock('../lib/understanding-core/governed-metric-executor', () => ({
  executeGovernedMetricRequest: vi.fn(),
}));
vi.mock('../lib/understanding-core/governed-local-duckdb-boundary', () => ({
  createGovernedLocalDuckDBBoundary: vi.fn(() => ({ execute: vi.fn() })),
}));
vi.mock('../components/analysis/ChartPreviewRenderer', () => ({
  ChartPreviewRenderer: () => <div data-testid="canonical-chart-renderer">Canonical chart</div>,
}));
vi.mock('../lib/result-validator-contract', () => ({
  validatePreviewAgainstIntent: vi.fn(),
}));

import { getCurrentInvestigationSession } from '../lib/investigation-session';
import { validatePreviewAgainstIntent } from '../lib/result-validator-contract';
import { executeGovernedMetricRequest } from '../lib/understanding-core/governed-metric-executor';
import { saveWorkspaceSession } from '../lib/workspace-session-api';

const restriction: GovernedExecutionRestrictionV1 = {
  code: 'DECISION_USE_PROHIBITED',
  severity: 'critical',
  reason: 'Preview evidence cannot authorize decision use.',
  references: ['canonical:test-source'],
  decisionUseBlocked: true,
};

const evidence: GovernedExecutionEvidenceV1 = {
  evidenceId: 'canonical-evidence:test-source',
  kind: 'runtime_policy',
  references: ['canonical:test-source'],
  provenance: 'governed_policy',
};

const metricBinding = {
  requirementId: 'sales_revenue_value',
  role: 'measure' as const,
  semanticId: 'money.revenue',
  sourceColumnIndex: 1,
  physicalColumn: 'Revenue',
  semanticState: 'confirmed' as const,
};

const dimensionBinding = {
  requirementId: 'product_dimension',
  role: 'dimension' as const,
  semanticId: 'item.product',
  sourceColumnIndex: 0,
  physicalColumn: 'Product',
  semanticState: 'confirmed' as const,
};

const runtimeAction: GovernedRuntimeActionV1 = {
  schemaVersion: 'lightbi.governed-runtime-contract.v1',
  actionId: 'runtime-action:test',
  sourceActionCandidateId: 'action-candidate:test',
  questionId: 'question:test',
  domainPackId: 'commerce_distribution_mvp',
  metricId: 'sales_revenue',
  metricVersion: '1.0.0',
  sourceReference: 'canonical:test-source',
  operator: 'governed_sum',
  metricBindings: [metricBinding],
  groupingBindings: [dimensionBinding],
  timeBinding: null,
  asOfBasis: null,
  filters: [],
  restrictions: [restriction],
  evidence: [evidence],
  runtimeActionCreated: true,
  runtimeActionAuthorized: true,
  executionPerformed: false,
  decisionUseAuthorized: false,
  productionWiring: { executed: false },
};

const runtimePreflight: GovernedRuntimePreflightV1 = {
  schemaVersion: 'lightbi.governed-runtime-preflight.v1',
  identity: 'runtime-preflight:test',
  state: 'conditionally_executable',
  domainPackId: 'commerce_distribution_mvp',
  sourceReference: 'canonical:test-source',
  actionCandidateId: 'action-candidate:test',
  metricId: 'sales_revenue',
  metricVersion: '1.0.0',
  runtimePolicyHash: 'runtime-policy:test',
  metricPolicyHash: 'metric-policy:test',
  questionPolicyHash: 'question-policy:test',
  planningAllowed: true,
  executionAllowed: true,
  action: runtimeAction,
  blockers: [],
  restrictions: [restriction],
  evidence: [evidence],
  runtimeActionCreated: true,
  runtimeActionAuthorized: true,
  executionPerformed: false,
  decisionUseAuthorized: false,
  productionWiring: { executed: false },
};

const queryPlan: GovernedMetricQueryPlanV1 = {
  schemaVersion: 'lightbi.governed-metric-query-plan.v1',
  planId: 'metric-plan:test',
  runtimePreflightIdentity: runtimePreflight.identity,
  actionId: runtimeAction.actionId,
  metricId: runtimeAction.metricId,
  metricVersion: runtimeAction.metricVersion,
  sourceReference: runtimeAction.sourceReference,
  dialect: 'duckdb',
  tableIdentity: '__LIGHTBI_PREVIEW_TABLE__',
  operator: runtimeAction.operator,
  metricBindings: [metricBinding],
  groupingBindings: [dimensionBinding],
  timeBinding: null,
  asOfBasis: null,
  filters: [],
  sql: 'SELECT "product" AS "item.product", SUM(CAST("revenue" AS DOUBLE)) AS "sales_revenue" FROM __LIGHTBI_PREVIEW_TABLE__ GROUP BY "product";',
  parameters: [],
  resultColumns: ['item.product', 'sales_revenue'],
  restrictions: [restriction],
  evidence: [evidence],
  deterministic: true,
  decisionUseAuthorized: false,
  productionWiring: { executed: false },
};

const sourceBinding: RuntimeSourceBindingV1 = {
  datasetId: 'dataset:test',
  sourceId: 'canonical:test-source',
  sourceFingerprint: 'fingerprint:test-source',
  inspectionGeneration: 'inspection:test-source',
  profileGeneration: 'profile:test-source',
};

function runtimeSource(): RuntimeDatasetSource {
  return {
    kind: 'local_files',
    files: [{ file: new File(['Product,Revenue\nA,10'], 'test.csv', { type: 'text/csv' }) }],
    sourceRowCount: 1,
    binding: sourceBinding,
  };
}

function sourceBoundary(): CanonicalSourceBoundaryV1 {
  return {
    schemaVersion: 'lightbi.canonical-source-boundary.v1',
    ...sourceBinding,
    sourceRowCount: 1,
    runtimeSource: runtimeSource(),
  } as CanonicalSourceBoundaryV1;
}

function plannedHandoff(): CanonicalInvestigationHandoffV1 {
  return {
    schemaVersion: 'lightbi.canonical-investigation-handoff.v1',
    artifactIdentity: 'canonical-consumer:test',
    datasetStateIdentity: 'dataset-state:test',
    actionCandidate: null,
    runtimePreflight,
    queryPlanning: { state: 'planned', plan: queryPlan, blockers: [] },
    blockers: [],
    decisionUseAuthorized: false,
    sourceFingerprint: sourceBinding.sourceFingerprint,
    sourceBoundary: sourceBoundary(),
  };
}

function blockedHandoff(reason: string): CanonicalInvestigationHandoffV1 {
  return {
    ...plannedHandoff(),
    runtimePreflight: {
      ...runtimePreflight,
      state: 'blocked',
      planningAllowed: false,
      executionAllowed: false,
      action: null,
      blockers: [{ code: reason, severity: 'critical', source: 'integrity', references: ['canonical-consumer:test'] }],
      runtimeActionCreated: false,
      runtimeActionAuthorized: false,
    },
    queryPlanning: { state: 'blocked', plan: null, blockers: [reason] },
    blockers: [reason],
  };
}

const analysisAction: AnalysisAction = {
  id: 'action:test',
  opportunityName: 'Revenue by product',
  label: 'Revenue by product',
  description: 'Compare governed revenue by product.',
  actionType: 'group_by',
  dimensions: ['item.product'],
  measures: ['sales_revenue'],
  confidenceScore: 100,
  source: 'dataset_understanding',
};

const runtimeIntent: RuntimeIntent = {
  id: 'intent:test',
  sourceActionId: analysisAction.id,
  type: 'group_by',
  dimensions: ['item.product'],
  measures: ['sales_revenue'],
  expectedShape: 'bar_chart',
  status: 'ready',
  warnings: [],
  blockedReasons: [],
  source: 'analysis_action',
};

const runtimePlanPreview: RuntimePlanPreview = {
  id: 'runtime-plan:test',
  sourceIntentId: runtimeIntent.id,
  status: 'ready',
  executionMode: 'preview_only',
  logicalOperations: [],
  requiredColumns: ['Product', 'Revenue'],
  expectedOutput: { shape: 'bar_chart', dimensions: ['item.product'], measures: ['sales_revenue'] },
  warnings: [],
  blockedReasons: [],
  source: 'runtime_intent',
};

function session(overrides: Partial<InvestigationSession> = {}): InvestigationSession {
  return {
    id: 'session:test',
    datasetId: 'dataset:test',
    createdAt: 1,
    analysisAction,
    runtimeIntent,
    runtimePlanPreview,
    rows: [{ Product: 'A', Revenue: 10 }],
    rowScope: 'full_file',
    runtimeDatasetSource: runtimeSource(),
    canonicalHandoff: plannedHandoff(),
    ...overrides,
  };
}

function validation(status: ResultValidationResult['status'] = 'passed', warnings: string[] = []): ResultValidationResult {
  return {
    id: `validation:${status}`,
    expectedResultId: 'expected:test',
    previewRuntimeResultId: 'preview:test',
    status,
    score: status === 'passed' ? 100 : 0,
    confidence: status === 'passed' ? 'HIGH' : 'LOW',
    evidence: [],
    warnings,
  };
}

function governedResult(overrides: Partial<GovernedMetricExecutionResultV1> = {}): GovernedMetricExecutionResultV1 {
  return {
    schemaVersion: 'lightbi.governed-metric-execution-result.v1',
    resultId: 'metric-result:test',
    requestId: 'consumer:metric-plan:test',
    actionId: runtimeAction.actionId,
    metricId: 'sales_revenue',
    metricVersion: '1.0.0',
    sourceReference: 'canonical:test-source',
    queryPlanIdentity: queryPlan.planId,
    operator: 'governed_sum',
    dimensions: ['item.product'],
    timeBasis: null,
    status: 'executed',
    columns: ['item.product', 'sales_revenue'],
    rows: [{ 'item.product': 'A', sales_revenue: 10 }],
    rowCount: 1,
    resultShape: 'grouped',
    groundTruthComparison: { state: 'unavailable', expected: null, actual: 10, tolerance: null },
    evidence: [evidence],
    restrictions: [restriction],
    limitations: [],
    error: null,
    runtimeActionCreated: true,
    runtimeActionAuthorized: true,
    executionPerformed: true,
    decisionUseAuthorized: false,
    productionWiring: { executed: false },
    ...overrides,
  };
}

const mockedSession = vi.mocked(getCurrentInvestigationSession);
const mockedExecute = vi.mocked(executeGovernedMetricRequest);
const mockedValidate = vi.mocked(validatePreviewAgainstIntent);
const mockedSaveWorkspaceSession = vi.mocked(saveWorkspaceSession);

describe('Investigation canonical consumer boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSession.mockReturnValue(session());
    mockedExecute.mockResolvedValue(governedResult());
    mockedValidate.mockReturnValue(validation());
  });

  afterEach(cleanup);

  it('renders canonical runtime blocking without a legacy readiness score', () => {
    mockedSession.mockReturnValue(session({
      rows: [],
      canonicalHandoff: undefined,
      aiBriefing: {
        datasetId: 'dataset:test', generatedAt: '2026-06-14T00:00:00.000Z', grain: 'event', grainEvidence: 'Canonical event grain',
        readinessTier: 'caution', readinessScore: 72, semanticFields: [], caveats: ['No stable time dimension detected.'], safeActionHints: [],
      },
    }));
    render(<Investigation />);
    expect(screen.getByRole('button', { name: /Run preview/i })).toBeDefined();
    expect(screen.getByTestId('investigation-preflight-blocked')).toBeDefined();
    expect(screen.queryByText('Moderate Readiness (Caution)')).toBeNull();
  });

  it('presents canonical preflight blockers and stops before execution', async () => {
    mockedSession.mockReturnValue(session({ canonicalHandoff: blockedHandoff('runtime_preflight_identity_mismatch') }));
    render(<Investigation />);
    await waitFor(() => expect(screen.getAllByText('Analysis Blocked').length).toBeGreaterThan(0));
    expect(screen.getAllByText(/runtime_preflight_identity_mismatch/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Run preview|Execute preview|Analyze deeper/i }).every(button => (button as HTMLButtonElement).disabled)).toBe(true);
    expect(mockedExecute).not.toHaveBeenCalled();
  });

  it('blocks a missing bound runtime source without invoking execution', async () => {
    mockedSession.mockReturnValue(session({ rows: [], runtimeDatasetSource: undefined }));
    render(<Investigation />);
    fireEvent.click(screen.getByRole('button', { name: /Run preview/i }));
    await waitFor(() => expect(screen.getAllByText(/canonical_full_file_runtime_source_required/).length).toBeGreaterThan(0));
    expect(mockedExecute).not.toHaveBeenCalled();
  });

  it('presents stale artifact rejection from canonical blockers', async () => {
    mockedSession.mockReturnValue(session({ canonicalHandoff: blockedHandoff('stale_artifact_identity') }));
    render(<Investigation />);
    await waitFor(() => expect(screen.getAllByText(/stale_artifact_identity/).length).toBeGreaterThan(0));
    expect(mockedExecute).not.toHaveBeenCalled();
  });

  it('rejects a missing canonical handoff without legacy fallback', async () => {
    mockedSession.mockReturnValue(session({ canonicalHandoff: undefined }));
    render(<Investigation />);
    fireEvent.click(screen.getByRole('button', { name: /Run preview/i }));
    await waitFor(() => expect(screen.getAllByText(/canonical_handoff_required/).length).toBeGreaterThan(0));
    expect(mockedExecute).not.toHaveBeenCalled();
  });

  it('surfaces a governed execution failure and retains restrictions', async () => {
    const current = session();
    mockedSession.mockReturnValue(current);
    const failure = governedResult({
      status: 'failed', rows: [], columns: [], rowCount: 0, error: 'DUCKDB_PARSER_ERROR: syntax error',
      limitations: ['duckdb_execution_failed'], executionPerformed: false,
    });
    mockedExecute.mockResolvedValue(failure);
    render(<Investigation />);
    await waitFor(() => expect(screen.getAllByText('Execution Failed').length).toBeGreaterThan(0));
    expect(screen.getAllByText('DUCKDB_PARSER_ERROR: syntax error').length).toBeGreaterThan(0);
    expect(current.canonicalExecutionResult?.restrictions).toEqual([restriction]);
    expect(current.canonicalExecutionResult?.decisionUseAuthorized).toBe(false);
  });

  it('surfaces a thrown canonical executor error without fallback', async () => {
    mockedExecute.mockRejectedValue(new Error('LOCAL_DUCKDB_EXECUTION_FAILED'));
    render(<Investigation />);
    await waitFor(() => expect(screen.getAllByText('LOCAL_DUCKDB_EXECUTION_FAILED').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Execution Failed').length).toBeGreaterThan(0);
  });

  it('marks an empty governed execution as result unavailable', async () => {
    mockedExecute.mockResolvedValue(governedResult({ rows: [], rowCount: 0 }));
    render(<Investigation />);
    await waitFor(() => expect(screen.getAllByText('Execution completed but returned an empty dataset. Analysis unavailable.').length).toBeGreaterThan(0));
    expect(screen.queryByTestId('canonical-chart-renderer')).toBeNull();
  });

  it('does not render a chart when canonical result validation fails', async () => {
    mockedValidate.mockReturnValue(validation('failed', ['Insufficient quality']));
    render(<Investigation />);
    await waitFor(() => expect(screen.getAllByText('Validation boundary rejected the preview result due to insufficient quality or missing required data.').length).toBeGreaterThan(0));
    expect(screen.getByText('Insufficient quality')).toBeDefined();
    expect(screen.queryByTestId('canonical-chart-renderer')).toBeNull();
  });

  it('renders a successful governed result through the canonical chart path', async () => {
    render(<Investigation />);
    await waitFor(() => expect(screen.getByTestId('canonical-chart-renderer')).toBeDefined());
    expect(screen.getByText('EXECUTED')).toBeDefined();
    const context = screen.getByTestId('governed-result-context');
    fireEvent.click(context.querySelector('summary')!);
    expect(context.textContent).toContain('sales_revenue');
    expect(context.textContent).toContain('runtime-action:test');
    expect(context.textContent).toContain('metric-plan:test');
    expect(context.textContent).toContain('canonical-evidence:test-source');
    expect(context.textContent).toContain('Preview evidence cannot authorize decision use');
    expect(mockedExecute).toHaveBeenCalledTimes(1);
  });

  it('auto-runs an authorized full-file handoff even when preview rows are not retained in the session', async () => {
    mockedSession.mockReturnValue(session({ rows: [] }));
    render(<Investigation />);
    await waitFor(() => expect(mockedExecute).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('canonical-chart-renderer')).toBeDefined();
  });

  it('projects the canonical full-scope total when visible grouped rows are bounded', async () => {
    mockedExecute.mockResolvedValue(governedResult({
      rows: [{ 'item.product': 'A', sales_revenue: 25 }],
      rowCount: 1,
      groundTruthComparison: { state: 'unavailable', expected: null, actual: 250, tolerance: null },
    }));
    render(<Investigation />);

    const summary = await screen.findByTestId('governed-result-summary');
    expect(summary.textContent).toContain('250');
    expect(summary.textContent).toContain('1 governed result group');
  });

  it('persists the current dataset and returns with the exact saved session identity', async () => {
    render(<Investigation />);
    await waitFor(() => expect(screen.getByTestId('canonical-chart-renderer')).toBeDefined());
    mockedSaveWorkspaceSession.mockClear();
    navigateMock.mockClear();
    fireEvent.click(screen.getByTestId('investigation-back-to-perspectives'));
    await waitFor(() => expect(mockedSaveWorkspaceSession).toHaveBeenCalledTimes(1));
    expect(navigateMock).toHaveBeenCalledWith('/', { state: { restoreWorkspaceSessionId: 'saved-session' } });
  });

  it('persists a non-authoritative analysis identity after governed execution without serializing export authority', async () => {
    const current = session({
      workspaceDataset: { status: 'ready', canonicalSourceBoundary: sourceBoundary() },
    });
    mockedSession.mockReturnValue(current);
    render(<Investigation />);
    await waitFor(() => expect(screen.getByTestId('canonical-chart-renderer')).toBeDefined());
    mockedSaveWorkspaceSession.mockClear();
    fireEvent.click(screen.getByTestId('investigation-back-to-perspectives'));
    await waitFor(() => expect(mockedSaveWorkspaceSession).toHaveBeenCalledTimes(1));
    const payload = mockedSaveWorkspaceSession.mock.calls[0][0] as any;
    expect(payload.snapshot.version).toBe(3);
    expect(payload.snapshot.analysisSessionIdentity).toMatchObject({
      schemaVersion: 'lightbi.analysis-session-identity.v1',
      sourceAnchor: {
        kind: 'single_source',
        sourceId: sourceBinding.sourceId,
        sourceFingerprint: sourceBinding.sourceFingerprint,
      },
      authority: {
        persistedExecutionAuthority: false,
        requiresRevalidation: true,
        decisionUseAuthorized: false,
      },
    });
    expect(payload.snapshot.analysisSessionIdentity.decisionVisualization.planId).toMatch(/^decision-visualization:/u);
    expect(payload.snapshot.analysisSessionIdentity).not.toHaveProperty('rows');
  });

  it('keeps restriction and evidence references attached after successful execution', async () => {
    const current = session();
    mockedSession.mockReturnValue(current);
    render(<Investigation />);
    await waitFor(() => expect(current.canonicalExecutionResult).toBeDefined());
    expect(current.canonicalExecutionResult?.restrictions).toEqual([restriction]);
    expect(current.canonicalExecutionResult?.evidence).toEqual([evidence]);
    expect(current.canonicalExecutionResult?.decisionUseAuthorized).toBe(false);
  });

  it('contains no backend, JavaScript sandbox, or mock preview invocation', () => {
    const source = fs.readFileSync(path.resolve(__dirname, 'Investigation.tsx'), 'utf8');
    expect(source).not.toContain('executeBackendPreview(');
    expect(source).not.toContain('executeDuckDBPreviewSandbox(');
    expect(source).not.toContain('executeDuckDBPreviewRuntime(');
    expect(source).not.toContain('Degraded Execution Mode');
    expect(source).toContain('executeGovernedMetricRequest');
  });
});
