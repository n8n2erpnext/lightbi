import path from 'node:path';
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import type { AdvancedQueryResult } from './advanced-api';
import { createAdvancedResultHandoff, type AdvancedResultSource } from './advanced-result-handoff';
import {
  canonicalConsumerCacheStats,
  resetCanonicalConsumerCacheForTests,
} from './understanding-core/canonical-consumer-boundary';

const ROOT = path.resolve(__dirname, '../../../..');
const SALES_PATH = path.join(ROOT, 'sample data/Sales_ERP_May_2026.xlsx');

function goldenResult(overrides: Partial<AdvancedQueryResult> = {}): AdvancedQueryResult {
  const workbook = XLSX.readFile(SALES_PATH, { raw: true });
  const matrix = XLSX.utils.sheet_to_json<Array<string | number | boolean | null>>(
    workbook.Sheets[workbook.SheetNames[0]],
    { header: 1, defval: null, raw: true, blankrows: false },
  );
  const names = matrix[0].map(String);
  const rows = matrix.slice(1);
  return {
    runId: 'advanced-golden-run-1',
    columns: names.map((name, index) => ({
      id: `column-${index}`,
      name,
      logicalType: rows.some(row => typeof row[index] === 'number') ? 'number' : 'string',
    })),
    rows,
    page: { offset: 0, limit: rows.length, hasMore: false, estimatedTotal: rows.length },
    truncated: false,
    warnings: [],
    executionMs: 12,
    ...overrides,
  };
}

function source(overrides: Partial<AdvancedResultSource> = {}): AdvancedResultSource {
  return {
    datasetId: 'advanced:golden-sales',
    title: 'Sales ERP May 2026',
    provider: 'duckdb',
    sql: 'SELECT * FROM sales_erp_may_2026',
    configuration: {
      resultView: 'grid',
      visibleColumns: ['OrderID', 'OrderDate', 'Product', 'Revenue'],
      filters: [],
      filterCombinator: 'and',
      sort: null,
      tableContext: { schema: 'main', table: 'sales_erp_may_2026' },
    },
    ...overrides,
  };
}

function revenueActionId(handoff: ReturnType<typeof createAdvancedResultHandoff>): string {
  expect(handoff.canonicalArtifact.status).toBe('valid');
  if (handoff.canonicalArtifact.status !== 'valid') throw new Error(handoff.blockers.join(','));
  const action = handoff.canonicalArtifact.questionGeneration.actionCandidates.find(
    candidate => candidate.questionId === 'commerce.sales_revenue.by_product',
  );
  expect(action).toBeDefined();
  return action!.actionCandidateId;
}

describe('Advanced canonical result handoff', () => {
  it('reuses one canonical artifact and selects only an existing governed action', () => {
    resetCanonicalConsumerCacheForTests();
    const result = goldenResult();
    const initial = createAdvancedResultHandoff(source(), result);
    const selected = createAdvancedResultHandoff(source({
      governedSelection: { actionCandidateId: revenueActionId(initial), metricId: 'sales_revenue' },
    }), { ...result, runId: 'advanced-golden-run-2' });

    expect(initial.canonicalArtifact).toBe(selected.canonicalArtifact);
    expect(canonicalConsumerCacheStats()).toEqual({ buildCount: 1, datasetStateCount: 1 });
    expect(selected.canonicalHandoff.queryPlanning.state).toBe('planned');
    expect(selected.canonicalHandoff.runtimePreflight.metricId).toBe('sales_revenue');
    expect(selected.analysisAction.measures).toEqual(['sales_revenue']);
    expect(selected.rowScope).toBe('full_file');
    expect(selected.decisionUseAuthorized).toBe(false);
    expect(selected.canonicalArtifact.caveats.every(caveat => selected.aiBriefing?.caveats.includes(caveat))).toBe(true);
  }, 60_000);

  it('invalidates identity when Advanced SQL or active configuration changes', () => {
    resetCanonicalConsumerCacheForTests();
    const result = goldenResult();
    const first = createAdvancedResultHandoff(source(), result);
    const sqlChanged = createAdvancedResultHandoff(source({ sql: 'SELECT * FROM sales_erp_may_2026 WHERE Store = \'HCM-Q1\'' }), result);
    const configChanged = createAdvancedResultHandoff(source({
      configuration: { ...source().configuration, resultView: 'chart' },
    }), result);

    expect(sqlChanged.canonicalArtifact.datasetStateIdentity).not.toBe(first.canonicalArtifact.datasetStateIdentity);
    expect(configChanged.canonicalArtifact.datasetStateIdentity).not.toBe(first.canonicalArtifact.datasetStateIdentity);
    expect(canonicalConsumerCacheStats()).toEqual({ buildCount: 3, datasetStateCount: 3 });
  }, 60_000);

  const blockedSelections: Array<[string, {
    actionCandidateId?: string;
    metricId?: string;
    operator?: string;
  }]> = [
    ['SUM', { operator: 'SUM' }],
    ['COUNT', { operator: 'COUNT' }],
    ['unsupported metric', { metricId: 'advanced_ad_hoc_margin' }],
    ['unknown action', { actionCandidateId: 'advanced:invented-action' }],
  ];

  it.each(blockedSelections)('blocks an Advanced %s request instead of inventing authority', (_label, governedSelection) => {
    resetCanonicalConsumerCacheForTests();
    const initial = createAdvancedResultHandoff(source(), goldenResult());
    const selected = createAdvancedResultHandoff(source({
      governedSelection: {
        actionCandidateId: governedSelection.actionCandidateId ?? revenueActionId(initial),
        metricId: governedSelection.metricId,
        operator: governedSelection.operator,
      },
    }), goldenResult());

    expect(selected.canonicalHandoff.queryPlanning.state).toBe('blocked');
    expect(selected.decisionUseAuthorized).toBe(false);
    expect(selected.analysisAction.actionType).toBe('table_preview');
  }, 60_000);

  it('fails closed when Advanced exposes only a partial result buffer', () => {
    resetCanonicalConsumerCacheForTests();
    const full = goldenResult();
    const partial = goldenResult({
      rows: full.rows.slice(0, 100),
      page: { offset: 0, limit: 100, hasMore: true, estimatedTotal: full.rows.length },
      truncated: true,
    });
    const handoff = createAdvancedResultHandoff(source(), partial);

    expect(handoff.canonicalArtifact.status).toBe('invalid');
    expect(handoff.blockers).toContain('full_file_row_coverage_required');
    expect(handoff.canonicalHandoff.queryPlanning.state).toBe('blocked');
    expect(handoff.rowScope).toBe('retained_rows');
  }, 60_000);
});
