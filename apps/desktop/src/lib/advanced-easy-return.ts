import type { AdvancedQueryResult } from './advanced-api';
import { resultRowsAsObjects } from './advanced-workspace-helpers';
import { classifyAdvancedResultCompleteness, createAdvancedResultHandoff, type AdvancedResultHandoff, type AdvancedResultSource } from './advanced-result-handoff';
import { createLocalCanonicalSourceBoundary } from './home-source-boundary';
import { inspectLocalFile } from './local-file-inspector';
import { createFileSourceCandidate } from './source-preflight';
import type { CanonicalSourceBoundaryV1 } from './understanding-core/canonical-source-boundary';

export type AdvancedEasyReturn = {
  handoff: AdvancedResultHandoff;
  canonicalSourceBoundary: CanonicalSourceBoundaryV1;
};

function safeFileStem(value: string): string {
  return value.trim().replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'advanced_result';
}

export async function createCanonicalAdvancedEasyReturn(
  source: AdvancedResultSource,
  result: AdvancedQueryResult,
): Promise<AdvancedEasyReturn> {
  const completeness = classifyAdvancedResultCompleteness(result);
  if (completeness.state !== 'complete') throw new Error(`advanced_easy_return_requires_complete_result:${completeness.state}`);
  if (result.rows.length === 0) throw new Error('advanced_easy_return_requires_rows');

  const rows = resultRowsAsObjects(result);
  const file = new File(
    [JSON.stringify(rows, (_key, value) => typeof value === 'bigint' ? value.toString() : value)],
    `${safeFileStem(source.title)}.lightbi-derived.json`,
    { type: 'application/json' },
  );
  const candidate = createFileSourceCandidate(file);
  if ('status' in candidate) throw new Error(('message' in candidate && candidate.message) || 'advanced_easy_return_candidate_invalid');
  const inspected = await inspectLocalFile(candidate);
  if (inspected.status !== 'accessible') throw new Error(inspected.message || 'advanced_easy_return_inspection_failed');
  const metadata = inspected.metadata;
  const boundary = createLocalCanonicalSourceBoundary({
    datasetId: source.datasetId,
    columns: metadata.columns || [],
    semanticRows: metadata.semantic_rows || [],
    semanticSample: metadata.semantic_sample,
    profile: metadata.canonical_full_file_profile,
    file,
  });
  if (!boundary) throw new Error('advanced_easy_return_canonical_boundary_required');

  return {
    handoff: createAdvancedResultHandoff(source, result, boundary),
    canonicalSourceBoundary: boundary,
  };
}
