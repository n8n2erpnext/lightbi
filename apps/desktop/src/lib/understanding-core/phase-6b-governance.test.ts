import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { questionActionPolicyHash } from './commerce-distribution-question-policy';
import { governedMetricPolicyHash } from './governed-metric-policy';
import { governedRuntimePolicyHash } from './governed-runtime-policy';

const ROOT = path.resolve(__dirname, '../../../../..');
const DOCS = path.join(ROOT, 'docs/architecture');
const AUDITS = [
  'phase-6b-advanced-cutover-audit.json',
  'phase-6b-production-reachability-audit.json',
  'phase-6b-legacy-retirement-audit.json',
  'phase-6b-single-path-audit.json',
  'phase-6b-end-to-end-audit.json',
  'phase-6b-import-isolation-audit.json',
  'phase-6b-final-gate-audit.json',
] as const;

function readAudit(name: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(DOCS, name), 'utf8')) as Record<string, unknown>;
}

describe('Phase 6B production reachability governance', () => {
  it('keeps both production session creators on one canonical handoff path', () => {
    const home = fs.readFileSync(path.join(ROOT, 'apps/desktop/src/pages/Home.tsx'), 'utf8');
    const advanced = fs.readFileSync(path.join(ROOT, 'apps/desktop/src/pages/Advanced.tsx'), 'utf8');
    const advancedTransferActions = fs.readFileSync(
      path.join(ROOT, 'apps/desktop/src/hooks/useAdvancedResultTransferActions.ts'),
      'utf8',
    );
    const handoff = fs.readFileSync(path.join(ROOT, 'apps/desktop/src/lib/advanced-result-handoff.ts'), 'utf8');
    const investigation = fs.readFileSync(path.join(ROOT, 'apps/desktop/src/pages/Investigation.tsx'), 'utf8');

    expect(home).toContain('getOrBuildCanonicalConsumerArtifact(');
    expect(home).toContain('canonicalHandoff');
    expect(`${advanced}\n${advancedTransferActions}`).toContain('handoff.canonicalHandoff');
    expect(handoff).toContain('getOrBuildCanonicalConsumerArtifact(');
    expect(handoff).toContain('prepareCanonicalInvestigationHandoff(');
    expect(investigation).toContain('executeGovernedMetricRequest');
    expect(investigation).toContain('canonical_handoff_required');

    for (const source of [home, advanced, advancedTransferActions, investigation]) {
      for (const forbidden of [
        'runGuidedInvestigationPipeline(',
        'createDatasetUnderstanding(',
        'createUnderstandingCoreResult(',
        'adaptCoreToUnderstandingNext(',
        'generateAIBriefingFromUnderstandingNext(',
        'executeBackendPreview(',
        'executeDuckDBPreviewSandbox(',
      ]) expect(source).not.toContain(forbidden);
    }
  });

  it('keeps policy hashes frozen and all required audits machine-readable', () => {
    expect(governedMetricPolicyHash()).toBe('e6d9acc403751fe3f04612ce84c83511efe538c76b15237cd49b32b9640b99c5');
    expect(questionActionPolicyHash()).toBe('c0616218cfd676047387ea33a783403d1d12b8040cfa87ec5cf6b7fc4a49c1ff');
    expect(governedRuntimePolicyHash()).toBe('7f553bc3d0041e8492173689efd70caa7ba6ffc8e5a64aae7175dc24576eef8e');
    for (const audit of AUDITS) expect(() => readAudit(audit), audit).not.toThrow();
    expect(readAudit('phase-6b-final-gate-audit.json')).toMatchObject({
      simpleCanonicalPath: true,
      advancedCanonicalPath: true,
      canonicalBlockersCannotFallback: true,
      policySemanticsChanged: false,
      decisionUseAuthorized: false,
      phase7Started: false,
    });
  });
});
