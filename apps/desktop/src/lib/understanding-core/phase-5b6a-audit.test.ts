import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repositoryRoot = resolve(__dirname, '../../../../..');
const architectureDocs = resolve(repositoryRoot, 'docs/architecture');

function readAudit<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(architectureDocs, name), 'utf8')) as T;
}

describe('Phase 5B6A build and authentic-capture audit', () => {
  it('preserves the immutable dirty-tree inventory and exact clean-HEAD result', () => {
    const manifest = readAudit<{
      head: string;
      worktreeClean: boolean;
      trackedModified: unknown[];
      untracked: unknown[];
      typecheck: { exitStatus: number; diagnosticCount: number };
    }>('phase-5b6a-working-tree-manifest.json');

    expect(manifest.head).toBe('70603dd6679a37a6f0a23e20fe6883faabd0e8a7');
    expect(manifest.worktreeClean).toBe(false);
    expect(manifest.trackedModified.length).toBeGreaterThan(0);
    expect(manifest.untracked.length).toBeGreaterThan(0);
    expect(manifest.typecheck).toMatchObject({ exitStatus: 2, diagnosticCount: 28 });
  });

  it('attributes every current diagnostic before Phase 5B5 and Phase 5B6', () => {
    const audit = readAudit<{
      currentTree: { diagnosticCount: number };
      cleanHead: { exitStatus: number; diagnosticCount: number; classification: string };
      incrementalPatchGroups: Array<{ id: string; outputSha256: string }>;
      diagnostics: Array<{
        finalDisposition: string;
        phase5B5Owner: boolean;
        phase5B6Owner: boolean;
        cleanHeadPresence: boolean;
      }>;
      provenanceEstablished: boolean;
    }>('phase-5b6a-typescript-provenance-audit.json');

    expect(audit.currentTree.diagnosticCount).toBe(28);
    expect(audit.cleanHead).toMatchObject({
      exitStatus: 0,
      diagnosticCount: 0,
      classification: 'diagnostics_absent_in_clean_head',
    });
    expect(audit.diagnostics).toHaveLength(28);
    expect(audit.diagnostics.every(item => item.finalDisposition === 'earlier_phase_owned_defect')).toBe(true);
    expect(audit.diagnostics.every(item => !item.cleanHeadPresence && !item.phase5B5Owner && !item.phase5B6Owner)).toBe(true);
    const hashes = audit.incrementalPatchGroups
      .filter(group => ['earlier_canonical_phase_5_untracked', 'phase_5b5_files', 'phase_5b6_files'].includes(group.id))
      .map(group => group.outputSha256);
    expect(new Set(hashes).size).toBe(1);
    expect(audit.provenanceEstablished).toBe(true);
  });

  it('does not convert abstract replay into authentic plan coverage', () => {
    const feasibility = readAudit<{
      recordsConsidered: number;
      records: Array<{ classification: string; authenticLegacyPlanInputRetained: boolean }>;
      syntheticFixtureCountedAsAuthentic: boolean;
      all145RecordsRepresented: boolean;
      actualCapturePathDecision: string;
    }>('phase-5b6a-authentic-plan-capture-feasibility.json');

    expect(feasibility.recordsConsidered).toBe(145);
    expect(feasibility.records).toHaveLength(145);
    expect(feasibility.records.every(record => record.classification === 'source_record_not_plan_applicable')).toBe(true);
    expect(feasibility.records.every(record => !record.authenticLegacyPlanInputRetained)).toBe(true);
    expect(feasibility.syntheticFixtureCountedAsAuthentic).toBe(false);
    expect(feasibility.all145RecordsRepresented).toBe(true);
    expect(feasibility.actualCapturePathDecision).toBe('authentic_capture_not_feasible_for_current_corpus');
  });

  it('separates caller-side request lifecycle identity from result identity', () => {
    const identity = readAudit<{
      currentBindingClassification: string;
      scenarios: unknown[];
      minimumFutureCorrelationContract: {
        previewRequestRequiredFields: string[];
        executorResultRequiredFields: string[];
        distinguishesIdenticalSql: boolean;
        implementedInProduction: boolean;
      };
      previewRequestIdentitySafe: boolean;
      previewResultIdentitySafe: boolean;
      chartRestrictionEnforcementPossible: boolean;
      BARestrictionEnforcementPossible: boolean;
    }>('phase-5b6a-request-result-identity-audit.json');

    expect(identity.currentBindingClassification).toBe('identity_safe_for_request_only');
    expect(identity.scenarios).toHaveLength(10);
    expect(identity.previewRequestIdentitySafe).toBe(true);
    expect(identity.previewResultIdentitySafe).toBe(false);
    expect(identity.chartRestrictionEnforcementPossible).toBe(false);
    expect(identity.BARestrictionEnforcementPossible).toBe(false);
    expect(identity.minimumFutureCorrelationContract.previewRequestRequiredFields).toContain('requestToken');
    expect(identity.minimumFutureCorrelationContract.executorResultRequiredFields).toContain('requestToken');
    expect(identity.minimumFutureCorrelationContract.distinguishesIdenticalSql).toBe(true);
    expect(identity.minimumFutureCorrelationContract.implementedInProduction).toBe(false);
  });

  it('keeps corrected migration gates closed and import-isolated', () => {
    const gate = readAudit<{
      abstractSidecarProjectionLossless: boolean;
      authenticRuntimePlanReplayAvailable: boolean;
      actualPlanBindingCoverageComplete: boolean;
      previewResultIdentitySafe: boolean;
      actualContractProjectionPlanningEligible: boolean;
      productionProjectionEligible: boolean;
      canonicalAuthorityMigrationEligible: boolean;
      summaryPercentage: number | null;
      productionWiring: { executed: boolean };
    }>('phase-5b6a-migration-gate-correction.json');
    const isolation = readAudit<{
      productionReferences: string[];
      productionImporterAdded: boolean;
      importIsolationPassed: boolean;
    }>('phase-5b6a-import-isolation-audit.json');

    expect(gate.abstractSidecarProjectionLossless).toBe(true);
    expect(gate.authenticRuntimePlanReplayAvailable).toBe(false);
    expect(gate.actualPlanBindingCoverageComplete).toBe(false);
    expect(gate.previewResultIdentitySafe).toBe(false);
    expect(gate.actualContractProjectionPlanningEligible).toBe(false);
    expect(gate.productionProjectionEligible).toBe(false);
    expect(gate.canonicalAuthorityMigrationEligible).toBe(false);
    expect(gate.summaryPercentage).toBeNull();
    expect(gate.productionWiring.executed).toBe(false);
    expect(isolation.productionReferences).toEqual([]);
    expect(isolation.productionImporterAdded).toBe(false);
    expect(isolation.importIsolationPassed).toBe(true);
  });
});
