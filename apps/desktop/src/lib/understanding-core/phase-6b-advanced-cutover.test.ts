import fs from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import type { AdvancedQueryResult } from '../advanced-api';
import { createAdvancedResultHandoff, type AdvancedResultSource } from '../advanced-result-handoff';
import { generateCanonicalAIBriefing } from '../canonical-ai-briefing';
import { executeGovernedMetricRequest } from './governed-metric-executor';
import { planGovernedMetricQuery } from './governed-metric-query-planner';
import type { GovernedDuckDBBoundaryV1 } from './governed-runtime-contracts';
import { canonicalConsumerCacheStats, resetCanonicalConsumerCacheForTests } from './canonical-consumer-boundary';

const ROOT = path.resolve(__dirname, '../../../../..');
const SALES_PATH = path.join(ROOT, 'sample-corpus/anchors/1.3.0/Sales_ERP_May_2026.xlsx');
const require = createRequire(import.meta.url);
const duckdb = require('@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs') as any;
const duckdbDist = dirname(require.resolve('@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs'));

function quoteIdentifier(value: string): string {
  return `"${value.toLowerCase().replace(/"/g, '""')}"`;
}

function sqlLiteral(value: unknown): string {
  if (value == null || value === '') return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function normalizeDuckDBValue(value: unknown): unknown {
  if (typeof value === 'bigint') return Number(value);
  if (Array.isArray(value)) return value.map(normalizeDuckDBValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, normalizeDuckDBValue(nested)]));
  }
  return value;
}

async function nodeDuckDBBoundary(): Promise<GovernedDuckDBBoundaryV1> {
  const db = await duckdb.createDuckDB({
    mvp: {
      mainModule: join(duckdbDist, 'duckdb-mvp.wasm'),
      mainWorker: join(duckdbDist, 'duckdb-node-mvp.worker.cjs'),
    },
  }, new duckdb.VoidLogger(), duckdb.NODE_RUNTIME);
  await db.instantiate();
  return {
    async execute(plan, rows) {
      const connection = db.connect();
      try {
        const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
        const types = columns.map(column => rows.some(row => typeof row[column] === 'number')
          ? 'DOUBLE'
          : rows.some(row => typeof row[column] === 'boolean') ? 'BOOLEAN' : 'VARCHAR');
        connection.query(`CREATE TABLE __LIGHTBI_PREVIEW_TABLE__ (${columns.map((column, index) => `${quoteIdentifier(column)} ${types[index]}`).join(', ')})`);
        for (let offset = 0; offset < rows.length; offset += 250) {
          connection.query(`INSERT INTO __LIGHTBI_PREVIEW_TABLE__ VALUES ${rows.slice(offset, offset + 250).map(row => `(${columns.map(column => sqlLiteral(row[column])).join(', ')})`).join(', ')}`);
        }
        let parameterIndex = 0;
        const table = connection.query(plan.sql.replace(/\?/g, () => sqlLiteral(plan.parameters[parameterIndex++])));
        return {
          engine: 'duckdb' as const,
          status: 'executed' as const,
          columns: table.schema.fields.map((field: any) => field.name),
          rows: table.toArray().map((row: any) => normalizeDuckDBValue(row.toJSON()) as Record<string, unknown>),
          error: null,
          executionScope: 'full_file' as const,
        };
      } catch (error) {
        return {
          engine: 'duckdb' as const,
          status: 'failed' as const,
          columns: [],
          rows: [],
          error: error instanceof Error ? error.message : String(error),
          executionScope: 'full_file' as const,
        };
      } finally {
        connection.close();
      }
    },
  };
}

function goldenAdvancedResult(): AdvancedQueryResult {
  const workbook = XLSX.readFile(SALES_PATH, { raw: true });
  const matrix = XLSX.utils.sheet_to_json<Array<string | number | boolean | null>>(
    workbook.Sheets[workbook.SheetNames[0]],
    { header: 1, defval: null, raw: true, blankrows: false },
  );
  const names = matrix[0].map(String);
  const rows = matrix.slice(1);
  return {
    runId: 'phase6b-advanced-golden',
    columns: names.map((name, index) => ({
      id: `column-${index}`,
      name,
      logicalType: rows.some(row => typeof row[index] === 'number') ? 'number' : 'string',
    })),
    rows,
    page: { offset: 0, limit: rows.length, hasMore: false, estimatedTotal: rows.length },
    truncated: false,
    warnings: [],
    executionMs: 0,
  };
}

function advancedSource(overrides: Partial<AdvancedResultSource> = {}): AdvancedResultSource {
  return {
    datasetId: 'phase6b:advanced-golden-sales',
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

describe('Phase 6B Advanced canonical cutover', () => {
  it('executes Advanced golden revenue through the canonical artifact and governed executor', async () => {
    resetCanonicalConsumerCacheForTests();
    const result = goldenAdvancedResult();
    const initial = createAdvancedResultHandoff(advancedSource(), result);
    expect(initial.canonicalArtifact.status).toBe('valid');
    if (initial.canonicalArtifact.status !== 'valid') throw new Error(initial.blockers.join(','));
    const revenue = initial.canonicalArtifact.questionGeneration.actionCandidates.find(
      candidate => candidate.questionId === 'commerce.sales_revenue.by_product',
    );
    expect(revenue).toBeDefined();
    const selected = createAdvancedResultHandoff(advancedSource({
      governedSelection: { actionCandidateId: revenue!.actionCandidateId, metricId: 'sales_revenue' },
    }), { ...result, runId: 'phase6b-advanced-golden-rerun' });

    expect(selected.canonicalArtifact).toBe(initial.canonicalArtifact);
    expect(selected.canonicalHandoff.artifactIdentity).toBe(initial.canonicalArtifact.identity);
    expect(canonicalConsumerCacheStats()).toEqual({ buildCount: 1, datasetStateCount: 1 });
    expect(selected.canonicalHandoff.queryPlanning.state).toBe('planned');
    if (selected.canonicalHandoff.queryPlanning.state !== 'planned') throw new Error(selected.blockers.join(','));

    const execution = await executeGovernedMetricRequest({
      schemaVersion: 'lightbi.governed-metric-execution-request.v1',
      requestId: 'phase6b:advanced-golden-revenue',
      plan: selected.canonicalHandoff.queryPlanning.plan,
      rows: selected.rows ?? [],
      groundTruth: { state: 'verified', value: 22_973_896_244, tolerance: 0, provenance: 'rev.sales_erp_may_2026' },
    }, await nodeDuckDBBoundary());

    expect(execution.status, execution.error ?? execution.limitations.join(',')).toBe('executed');
    expect(execution.groundTruthComparison).toMatchObject({
      state: 'exact_match',
      expected: 22_973_896_244,
      actual: 22_973_896_244,
    });
    expect(execution.restrictions).toEqual(selected.canonicalHandoff.queryPlanning.plan.restrictions);
    expect(execution.decisionUseAuthorized).toBe(false);
  }, 60_000);

  it('fails mutation, fallback, stale-state, partial-row, restriction, detector, and AI probes closed', () => {
    resetCanonicalConsumerCacheForTests();
    const result = goldenAdvancedResult();
    const initial = createAdvancedResultHandoff(advancedSource(), result);
    expect(initial.canonicalArtifact.status).toBe('valid');
    if (initial.canonicalArtifact.status !== 'valid') throw new Error(initial.blockers.join(','));
    const revenue = initial.canonicalArtifact.questionGeneration.actionCandidates.find(
      candidate => candidate.questionId === 'commerce.sales_revenue.by_product',
    )!;
    const selected = createAdvancedResultHandoff(advancedSource({ governedSelection: { actionCandidateId: revenue.actionCandidateId } }), result);
    expect(selected.canonicalHandoff.queryPlanning.state).toBe('planned');
    if (selected.canonicalHandoff.queryPlanning.state !== 'planned' || !selected.canonicalHandoff.runtimePreflight.action) throw new Error('governed revenue must plan');

    const mutated = {
      ...selected.canonicalHandoff.runtimePreflight,
      action: { ...selected.canonicalHandoff.runtimePreflight.action, operator: 'governed_identity_count' as const },
    };
    expect(planGovernedMetricQuery(mutated)).toMatchObject({ state: 'blocked', blockers: ['runtime_preflight_identity_mismatch'] });

    const sumOverride = createAdvancedResultHandoff(advancedSource({
      governedSelection: { actionCandidateId: revenue.actionCandidateId, operator: 'SUM' },
    }), result);
    const countFallback = createAdvancedResultHandoff(advancedSource({
      governedSelection: { actionCandidateId: revenue.actionCandidateId, operator: 'COUNT' },
    }), result);
    const unsupported = createAdvancedResultHandoff(advancedSource({
      governedSelection: { actionCandidateId: revenue.actionCandidateId, metricId: 'invented_metric' },
    }), result);
    for (const blocked of [sumOverride, countFallback, unsupported]) {
      expect(blocked.canonicalHandoff.queryPlanning.state).toBe('blocked');
      expect(blocked.decisionUseAuthorized).toBe(false);
    }

    const partial = createAdvancedResultHandoff(advancedSource(), {
      ...result,
      rows: result.rows.slice(0, 100),
      page: { offset: 100, limit: 100, hasMore: true, estimatedTotal: result.rows.length },
      truncated: true,
    });
    expect(partial.canonicalArtifact.status).toBe('invalid');
    expect(partial.canonicalHandoff.queryPlanning.state).toBe('blocked');

    const changed = createAdvancedResultHandoff(advancedSource({ sql: 'SELECT * FROM sales_erp_may_2026 WHERE Store = \'HCM-Q1\'' }), result);
    expect(changed.canonicalArtifact.datasetStateIdentity).not.toBe(initial.canonicalArtifact.datasetStateIdentity);
    expect(selected.canonicalHandoff.queryPlanning.plan.restrictions.length).toBeGreaterThan(0);
    expect(selected.canonicalHandoff.queryPlanning.plan.decisionUseAuthorized).toBe(false);
    expect(initial.canonicalArtifact.provenance.legacyDetectorInvoked).toBe(false);

    const briefingJson = JSON.stringify(generateCanonicalAIBriefing(initial.canonicalArtifact));
    for (const forbidden of ['aggregationOperator', 'runtimeActionAuthorized', 'executionAllowed', 'rawRows']) {
      expect(briefingJson).not.toContain(forbidden);
    }

    const before = canonicalConsumerCacheStats();
    expect(createAdvancedResultHandoff(advancedSource(), { ...result, runId: 'another-run' }).canonicalArtifact).toBe(initial.canonicalArtifact);
    expect(canonicalConsumerCacheStats()).toEqual(before);

    const investigation = fs.readFileSync(path.join(ROOT, 'apps/desktop/src/pages/Investigation.tsx'), 'utf8');
    for (const forbidden of ['executeBackendPreview(', 'executeDuckDBPreviewSandbox(', 'js_sandbox_fallback', 'enhancePlanWithGuardedSum(', 'createSafeSqlPreview(']) {
      expect(investigation).not.toContain(forbidden);
    }
    expect(investigation).toContain("['canonical_handoff_required']");
  }, 60_000);
});
