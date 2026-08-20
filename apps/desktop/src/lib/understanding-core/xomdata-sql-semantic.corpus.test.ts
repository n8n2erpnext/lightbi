import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SEMANTIC_SIGNAL_BY_ID, SEMANTIC_SIGNAL_REGISTRY_V1 } from '../semantic-registry';
import { aggregateContextualEvidence } from './contextual-evidence-aggregator';
import { profilePhysicalSource } from './profiler';
import { createUnderstandingCoreResult } from './question-engine';
import { generateSemanticCandidateArtifact } from './semantic-candidate-engine';
import { resolveSemanticShadow } from './semantic-resolver';

type CorpusColumn = { name: string; nativeType: string; nullable: boolean; primaryKey: boolean };
type CorpusTable = {
  table: string;
  estimatedRows: number | null;
  columns: CorpusColumn[];
  sampleRows: Record<string, unknown>[];
};
type Corpus = {
  schemaVersion: string;
  counts: { schemas: number; tables: number; columns: number; sampledRows: number };
  schemas: Array<{ schema: string; tables: CorpusTable[] }>;
};

const root = join(process.cwd(), '..', '..');
const corpus = JSON.parse(readFileSync(
  join(root, 'sample-corpus', 'ground-truth', 'xomdata-sql-corpus.json'),
  'utf8',
)) as Corpus;

function rawRows(table: CorpusTable): unknown[][] {
  return [
    table.columns.map((column) => column.name),
    ...table.sampleRows.map((row) => table.columns.map((column) => row[column.name] ?? null)),
  ];
}

function resolve(table: CorpusTable, kind: 'database_table' | 'local_file') {
  const rows = rawRows(table);
  const physical = profilePhysicalSource({
    schemaVersion: 'lightbi.physical-source-input.v1',
    source: {
      sourceId: `xomdata-corpus:${kind}:${createHash('sha256').update(JSON.stringify(rows)).digest('hex')}`,
      kind,
      label: 'generic-source',
    },
    rawRows: rows,
  });
  const candidates = generateSemanticCandidateArtifact(physical, { registry: SEMANTIC_SIGNAL_REGISTRY_V1 });
  return resolveSemanticShadow(physical, candidates, aggregateContextualEvidence(physical, candidates));
}

function selected(artifact: ReturnType<typeof resolve>) {
  return Object.fromEntries(artifact.columns
    .filter((column) => column.selectedCandidateId && ['probable', 'confirmed'].includes(column.finalState))
    .map((column) => [column.physicalColumn, column.selectedCandidateId]));
}

describe('Xom Data cross-domain semantic corpus', () => {
  it('covers all 17 schemas and 63 tables with real read-only samples', () => {
    expect(corpus.schemaVersion).toBe('lightbi.xomdata-sql-semantic-corpus.v1');
    expect(corpus.counts.schemas).toBe(17);
    expect(corpus.counts.tables).toBe(63);
    expect(corpus.counts.columns).toBe(690);
    expect(corpus.counts.sampledRows).toBeGreaterThanOrEqual(300);
  });

  it('keeps semantic recognition and suggested analyses source-kind invariant', () => {
    const audit = corpus.schemas.flatMap((schema) => schema.tables.map((table) => {
      const database = resolve(table, 'database_table');
      const local = resolve(table, 'local_file');
      const databaseSelected = selected(database);
      const localSelected = selected(local);
      expect(localSelected, `${schema.schema}.${table.table}`).toEqual(databaseSelected);

      const columns = table.columns.map((column) => column.name);
      const databaseCore = createUnderstandingCoreResult({
        sourceKind: 'database_table',
        sourceLabel: 'generic-source',
        columns,
        rows: table.sampleRows,
        sourceRowCount: table.estimatedRows ?? table.sampleRows.length,
      });
      const localCore = createUnderstandingCoreResult({
        sourceKind: 'local_file',
        sourceLabel: 'generic-source',
        columns,
        rows: table.sampleRows,
        sourceRowCount: table.estimatedRows ?? table.sampleRows.length,
      });
      expect(localCore.signals.map((signal) => signal.id), `${schema.schema}.${table.table}:signals`)
        .toEqual(databaseCore.signals.map((signal) => signal.id));
      expect(localCore.actions.map((action) => action.questionId), `${schema.schema}.${table.table}:actions`)
        .toEqual(databaseCore.actions.map((action) => action.questionId));

      const selectedSignals = Object.values(databaseSelected);
      return {
        schema: schema.schema,
        table: table.table,
        columns: table.columns.length,
        sampledRows: table.sampleRows.length,
        recognizedColumns: Object.keys(databaseSelected).length,
        unresolvedColumns: table.columns.length - Object.keys(databaseSelected).length,
        selectedSignals,
        capabilityDomains: [...new Set(selectedSignals.flatMap((id) => SEMANTIC_SIGNAL_BY_ID.get(id)?.domains ?? []))].sort(),
        universalSignals: databaseCore.signals.map((signal) => signal.id),
        executableQuestions: databaseCore.actions.map((action) => action.questionId),
      };
    }));

    const summary = {
      generatedOn: new Date().toISOString(),
      corpus: corpus.schemaVersion,
      totals: {
        schemas: corpus.counts.schemas,
        tables: corpus.counts.tables,
        columns: audit.reduce((sum, table) => sum + table.columns, 0),
        recognizedColumns: audit.reduce((sum, table) => sum + table.recognizedColumns, 0),
        unresolvedColumns: audit.reduce((sum, table) => sum + table.unresolvedColumns, 0),
        tablesWithExecutableQuestions: audit.filter((table) => table.executableQuestions.length > 0).length,
      },
      tables: audit,
    };

    const output = process.env.LIGHTBI_XOMDATA_AUDIT_OUTPUT;
    if (output) writeFileSync(output, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    expect(summary.totals.tables).toBe(63);
  }, 120_000);
});
