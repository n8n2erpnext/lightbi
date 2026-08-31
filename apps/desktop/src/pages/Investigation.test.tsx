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
import type { DrillThroughPoint } from '../lib/drill-through-export';
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
import { advancedSourceId, useAdvancedSourceStore } from '../stores/advanced-source-store';

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
  ChartPreviewRenderer: ({ model, onDrillThrough }: {
    model: { title: string; xField?: string; yField?: string; rows: Record<string, unknown>[] };
    onDrillThrough?: (point: DrillThroughPoint) => void;
  }) => {
    const xField = model.xField ?? 'item.product';
    const row = model.rows[0] ?? {};
    const value = row[xField] ?? 'A';
    const testId = model.title === 'Revenue by product'
      ? 'canonical-chart-renderer'
      : `supporting-chart-renderer:${model.title}`;
    return <button type="button" data-testid={testId} onClick={() => onDrillThrough?.({
      dimensionField: xField, sourceDimensionField: xField, value, label: String(value),
      measureField: model.yField, measureValue: model.yField ? row[model.yField] : undefined,
    })}>{model.title}</button>;
  },
}));
vi.mock('../lib/drill-through-export', async () => {
  const actual = await vi.importActual<typeof import('../lib/drill-through-export')>('../lib/drill-through-export');
  return { ...actual, executeDrillThrough: vi.fn() };
});
vi.mock('../lib/governed-descriptive-executor', async () => {
  const actual = await vi.importActual<typeof import('../lib/governed-descriptive-executor')>('../lib/governed-descriptive-executor');
  return { ...actual, executeGovernedDescriptiveAnalysis: vi.fn() };
});
vi.mock('../lib/result-validator-contract', () => ({
  validatePreviewAgainstIntent: vi.fn(),
}));

import { getCurrentInvestigationSession } from '../lib/investigation-session';
import { validatePreviewAgainstIntent } from '../lib/result-validator-contract';
import { executeGovernedMetricRequest } from '../lib/understanding-core/governed-metric-executor';
import { saveWorkspaceSession } from '../lib/workspace-session-api';
import { executeDrillThrough } from '../lib/drill-through-export';
import { executeGovernedDescriptiveAnalysis } from '../lib/governed-descriptive-executor';

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

const supportingTimeAction: AnalysisAction = {
  ...analysisAction,
  id: 'action:support-time',
  opportunityName: 'Money over time',
  label: 'Money over time',
  actionType: 'trend',
  dimensions: ['time.date'],
};
const supportingTimeIntent: RuntimeIntent = {
  ...runtimeIntent,
  id: 'intent:support-time',
  sourceActionId: supportingTimeAction.id,
  type: 'trend',
  dimensions: ['time.date'],
  expectedShape: 'line_chart',
};
const supportingTimePlan: RuntimePlanPreview = {
  ...runtimePlanPreview,
  id: 'runtime-plan:support-time',
  sourceIntentId: supportingTimeIntent.id,
  expectedOutput: { shape: 'line_chart', dimensions: ['time.date'], measures: ['sales_revenue'] },
};
const supportingItemAction: AnalysisAction = {
  ...analysisAction,
  id: 'action:support-item',
  opportunityName: 'Activity volume by item',
  label: 'Activity volume by item',
  actionType: 'group_by',
  measures: ['record_count'],
};
const supportingItemIntent: RuntimeIntent = {
  ...runtimeIntent,
  id: 'intent:support-item',
  sourceActionId: supportingItemAction.id,
  measures: ['record_count'],
};
const supportingItemPlan: RuntimePlanPreview = {
  ...runtimePlanPreview,
  id: 'runtime-plan:support-item',
  sourceIntentId: supportingItemIntent.id,
  expectedOutput: { shape: 'bar_chart', dimensions: ['item.product'], measures: ['record_count'] },
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
const mockedDrillThrough = vi.mocked(executeDrillThrough);
const mockedDescriptive = vi.mocked(executeGovernedDescriptiveAnalysis);

describe('Investigation canonical consumer boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAdvancedSourceStore.setState({ sources: [], activeSourceId: null, pendingEasyReturnSourceId: null });
    mockedSession.mockReturnValue(session());
    mockedExecute.mockResolvedValue(governedResult());
    mockedValidate.mockReturnValue(validation());
    mockedDrillThrough.mockImplementation(async input => ({
      id: `drill:${input.runtimePlan.id}`, sourceSqlPreviewId: `sql:${input.runtimePlan.id}`, status: 'executed',
      columns: ['Product', 'Revenue'], rows: [{ Product: 'A', Revenue: 10 }], rowCount: 1, maxRows: 50_000,
      warnings: [], blockedReasons: [], source: 'governed_duckdb_execution', point: input.point,
    }));
    mockedDescriptive.mockImplementation(async ({ preparation }) => {
      if (preparation.runtimePlan.sourceIntentId === supportingTimeIntent.id) {
        return {
          id: 'support-time-result', sourceSqlPreviewId: 'sql:support-time', status: 'executed',
          columns: ['time.date', 'sales_revenue'],
          rows: [{ 'time.date': '2026-06-10', sales_revenue: 630_467_141 }], rowCount: 1, maxRows: 100,
          warnings: [], blockedReasons: [], source: 'governed_duckdb_execution',
        };
      }
      return {
        id: 'support-item-result', sourceSqlPreviewId: 'sql:support-item', status: 'executed',
        columns: ['item.product', 'record_count'],
        rows: [{ 'item.product': 'Philips FC', record_count: 52 }], rowCount: 1, maxRows: 100,
        warnings: [], blockedReasons: [], source: 'governed_duckdb_execution',
      };
    });
  });

  afterEach(cleanup);

  it('registers Investigation rows as supplementary without stealing canonical Easy source authority', async () => {
    const fileName = 'Sales_ERP_May_2026.xlsx';
    const originalId = advancedSourceId('local_xlsx', fileName);
    const easyDataset = { status: 'ready', sourceType: 'local_xlsx', file_name: fileName };
    useAdvancedSourceStore.getState().registerSource({
      id: originalId, name: fileName, sourceType: 'local_xlsx', sourceKind: 'local_file', easyReturnDataset: easyDataset, registeredAt: new Date().toISOString(),
      tables: [{ id: '0:data', name: 'Sales', rowCount: 1500, columns: ['Product', 'Revenue'], profiles: {}, file: new File(['Product,Revenue\nA,10'], fileName) }],
    });
    mockedSession.mockReturnValue(session({ datasetId: fileName }));

    render(<Investigation />);
    await waitFor(() => expect(useAdvancedSourceStore.getState().sources.some(source => source.sourceType === 'investigation')).toBe(true));
    expect(useAdvancedSourceStore.getState().activeSourceId).toBe(originalId);
    expect(useAdvancedSourceStore.getState().sources.find(source => source.id === originalId)?.easyReturnDataset).toBe(easyDataset);
  });

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

  it('keeps perspective Deep BA independent from selected-data Step 2', async () => {
    render(<Investigation />);
    await waitFor(() => expect(screen.getByTestId('canonical-chart-renderer')).toBeDefined());

    fireEvent.click(screen.getByTestId('canonical-chart-renderer'));
    await waitFor(() => expect(screen.getByTestId('investigation-drill-through')).toBeDefined());
    await waitFor(() => expect((screen.getByTestId('analyze-selected-rows') as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByTestId('analyze-selected-rows'));
    await waitFor(() => expect(screen.getByTestId('filtered-deep-analysis-scope')).toBeDefined());

    fireEvent.click(screen.getByTestId('deep-analysis-back'));
    expect(screen.queryByTestId('filtered-deep-analysis-scope')).toBeNull();

    fireEvent.click(screen.getByTestId('perspective-deep-analysis-button'));
    await waitFor(() => expect(screen.getByTestId('deep-analysis-export-surface')).toBeDefined());
    expect(screen.queryByTestId('filtered-deep-analysis-scope')).toBeNull();
  });

  it('drills supporting line and bar charts through their own runtime plans', async () => {
    mockedSession.mockReturnValue(session({
      supportingAnalyses: [
        { analysisAction: supportingTimeAction, runtimeIntent: supportingTimeIntent, runtimePlanPreview: supportingTimePlan },
        { analysisAction: supportingItemAction, runtimeIntent: supportingItemIntent, runtimePlanPreview: supportingItemPlan },
      ],
    }));
    render(<Investigation />);

    const timeChart = await screen.findByTestId('supporting-chart-renderer:Money over time');
    const itemChart = await screen.findByTestId('supporting-chart-renderer:Activity volume by item');

    fireEvent.click(timeChart);
    await waitFor(() => expect(mockedDrillThrough).toHaveBeenCalled());
    let call = mockedDrillThrough.mock.calls[mockedDrillThrough.mock.calls.length - 1][0];
    expect(call.runtimePlan.id).toBe(supportingTimePlan.id);
    expect(call.point.dimensionField).toBe('time.date');
    fireEvent.click(await screen.findByTestId('analyze-selected-rows'));
    await waitFor(() => expect(screen.getByTestId('filtered-deep-analysis-scope')).toBeDefined());
    expect(screen.getAllByText('Money over time').length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getByTestId('deep-analysis-back'));

    fireEvent.click(itemChart);
    await waitFor(() => expect(mockedDrillThrough).toHaveBeenCalledTimes(2));
    call = mockedDrillThrough.mock.calls[mockedDrillThrough.mock.calls.length - 1][0];
    expect(call.runtimePlan.id).toBe(supportingItemPlan.id);
    expect(call.point.dimensionField).toBe('item.product');
    fireEvent.click(await screen.findByTestId('analyze-selected-rows'));
    await waitFor(() => expect(screen.getByTestId('filtered-deep-analysis-scope')).toBeDefined());
    expect(screen.getAllByText('Activity volume by item').length).toBeGreaterThanOrEqual(2);
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
