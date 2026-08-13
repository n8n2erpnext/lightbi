import { describe, expect, it } from 'vitest';
import { evaluateRuntimeSourceContinuity } from './runtime-source-continuity';

function fixture() {
  const file = new File(['a,b\n1,2'], 'sales.csv', { type: 'text/csv' });
  const binding = {
    datasetId: 'sales',
    sourceId: 'source:sales',
    sourceFingerprint: 'sha256:sales',
    inspectionGeneration: 'inspection:1',
    profileGeneration: 'profile:1',
  };
  const boundary = {
    ...binding,
    sourceRowCount: 1,
    runtimeSource: { kind: 'local_files' as const, files: [{ file }], sourceRowCount: 1, binding },
  };
  return { boundary, artifact: { status: 'valid', sourceBoundary: boundary } as any };
}

function multiSourceFixture() {
  const sales = fixture().boundary;
  const accountingFixture = fixture();
  const accounting = {
    ...accountingFixture.boundary,
    datasetId: 'accounting',
    sourceId: 'source:accounting',
    sourceFingerprint: 'sha256:accounting',
    runtimeSource: {
      ...accountingFixture.boundary.runtimeSource,
      binding: {
        ...accountingFixture.boundary.runtimeSource.binding!,
        datasetId: 'accounting',
        sourceId: 'source:accounting',
        sourceFingerprint: 'sha256:accounting',
      },
    },
  };
  const dataset = {
    orderedSourceMemberships: [
      { sourceId: sales.sourceId, required: true, boundary: sales, runtimeSource: sales.runtimeSource },
      { sourceId: accounting.sourceId, required: true, boundary: accounting, runtimeSource: accounting.runtimeSource },
    ],
    analyses: [
      {
        actionCandidateId: 'gross-profit',
        state: 'ready',
        requiredSourceIds: [sales.sourceId, accounting.sourceId],
        metricSourceId: accounting.sourceId,
      },
      {
        actionCandidateId: 'sales-only',
        state: 'ready',
        requiredSourceIds: [sales.sourceId],
        metricSourceId: sales.sourceId,
      },
    ],
  } as any;
  return { dataset, sales, accounting };
}

describe('runtime source continuity', () => {
  it('accepts only the exact bound live source', () => {
    const currentFixture = fixture();
    const current = evaluateRuntimeSourceContinuity({
      artifact: currentFixture.artifact,
      runtimeSource: currentFixture.boundary.runtimeSource,
    });
    expect(current.available).toBe(true);
    expect(current.runtimeSource?.sourceRowCount).toBe(currentFixture.boundary.sourceRowCount);
  });

  it('fails closed for missing, fingerprint-mismatched and generation-stale sources', () => {
    const currentFixture = fixture();
    const missing = evaluateRuntimeSourceContinuity({ artifact: currentFixture.artifact });
    const fingerprintMismatch = evaluateRuntimeSourceContinuity({
      artifact: currentFixture.artifact,
      runtimeSource: {
        ...currentFixture.boundary.runtimeSource,
        binding: { ...currentFixture.boundary.runtimeSource.binding!, sourceFingerprint: 'replaced' },
      },
    });
    const staleGeneration = evaluateRuntimeSourceContinuity({
      artifact: currentFixture.artifact,
      runtimeSource: {
        ...currentFixture.boundary.runtimeSource,
        binding: { ...currentFixture.boundary.runtimeSource.binding!, inspectionGeneration: 'inspection:stale' },
      },
    });
    expect(missing).toMatchObject({ available: false, state: 'reselection_required' });
    expect(fingerprintMismatch.available).toBe(false);
    expect(staleGeneration.available).toBe(false);
  });

  it('never accepts representative rows as a runtime source', () => {
    const currentFixture = fixture();
    expect(evaluateRuntimeSourceContinuity({
      artifact: currentFixture.artifact,
      runtimeSource: { kind: 'local_files', files: [], sourceRowCount: 1 },
    }).available).toBe(false);
  });

  it('requires every source used by the selected multi-source action', () => {
    const { dataset, accounting } = multiSourceFixture();
    const ready = evaluateRuntimeSourceContinuity({
      artifact: null,
      multiSourceDataset: dataset,
      actionCandidateId: 'gross-profit',
    });
    dataset.orderedSourceMemberships[1] = {
      ...dataset.orderedSourceMemberships[1],
      runtimeSource: { ...accounting.runtimeSource, files: [] },
    };
    const missingMember = evaluateRuntimeSourceContinuity({
      artifact: null,
      multiSourceDataset: dataset,
      actionCandidateId: 'gross-profit',
    });
    expect(ready).toMatchObject({
      available: true,
      requiredSourceIds: ['source:sales', 'source:accounting'],
    });
    expect(ready.runtimeSource?.binding?.sourceId).toBe('source:accounting');
    expect(missingMember.available).toBe(false);
    expect(missingMember.blockers).toContain('canonical_runtime_source_unavailable:source:accounting');
  });

  it('selects the runtime source for the exact action instead of another ready analysis', () => {
    const { dataset } = multiSourceFixture();
    const result = evaluateRuntimeSourceContinuity({
      artifact: null,
      multiSourceDataset: dataset,
      actionCandidateId: 'sales-only',
    });
    expect(result.available).toBe(true);
    expect(result.requiredSourceIds).toEqual(['source:sales']);
    expect(result.runtimeSource?.binding?.sourceId).toBe('source:sales');
  });
});
