import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..');
const homeSource = fs.readFileSync(path.join(root, 'pages/Home.tsx'), 'utf8');
const investigationSource = fs.readFileSync(path.join(root, 'pages/Investigation.tsx'), 'utf8');
const persistenceSource = fs.readFileSync(path.join(root, 'hooks/useHomeWorkspaceSessions.ts'), 'utf8');
const materializerSource = fs.readFileSync(path.join(root, 'lib/full-file-runtime-materializer.ts'), 'utf8');
const executorSource = fs.readFileSync(path.join(root, 'lib/local-duckdb-executor.ts'), 'utf8');

describe('Phase 8F.1 runtime continuity negative probes', () => {
  it.each([
    ['Home blocks navigation without runtime continuity', homeSource, /!runtimeContinuity\.available \|\| !runtimeContinuity\.runtimeSource/],
    ['Home binds continuity to the selected action', homeSource, /actionCandidateId: action\.id/],
    ['Home does not create an unbound dataset-group runtime fallback', homeSource, /runtimeDatasetSource: canonicalSourceBoundary\?\.runtimeSource,/],
    ['restored snapshots without a complete source become stale', persistenceSource, /status: 'stale'.*runtimeDatasetSource: undefined.*canonicalSourceBoundary: undefined/s],
    ['restored files rebuild a canonical source boundary', persistenceSource, /createLocalCanonicalSourceBoundary\(\{/],
    ['restored readiness depends on rebuilt source boundary', persistenceSource, /status: canonicalSourceBoundary \? 'ready' : 'stale'/],
    ['Investigation requires source binding continuity', investigationSource, /sourceBindingsMatch\(canonicalSourceBoundary, runtimeDatasetSource\)/],
    ['Investigation keeps the full-file runtime guard', investigationSource, /canonical_full_file_runtime_source_required/],
    ['Investigation passes expected runtime binding to execution', investigationSource, /expectedRuntimeBinding: runtimeDatasetSource!\.binding/],
    ['Investigation passes expected source row count', investigationSource, /expectedSourceRowCount: runtimeDatasetSource!\.sourceRowCount/],
    ['materialization rejects replaced files', materializerSource, /RUNTIME_SOURCE_FILE_REPLACED/],
    ['the executor has no fallback from runtime materialization to retained rows', executorSource, /if \(input\.runtimeDatasetSource\)/],
  ])('%s', (_name, source, pattern) => {
    expect(source).toMatch(pattern);
  });

  it('the executor cannot catch a materialization failure and retry representative rows', () => {
    expect(executorSource).not.toMatch(/materializeRuntimeDatasetSource[\s\S]{0,500}catch[\s\S]{0,500}input\.rows/);
  });
});
