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
    const homeCanonicalArtifact = fs.readFileSync(
      path.join(ROOT, 'apps/desktop/src/lib/home-canonical-artifact.ts'),
      'utf8',
    );
    const advanced = fs.readFileSync(path.join(ROOT, 'apps/desktop/src/pages/Advanced.tsx'), 'utf8');
    const advancedTransferActions = fs.readFileSync(
      path.join(ROOT, 'apps/desktop/src/hooks/useAdvancedResultTransferActions.ts'),
      'utf8',
    );
    const handoff = fs.readFileSync(path.join(ROOT, 'apps/desktop/src/lib/advanced-result-handoff.ts'), 'utf8');
    const investigation = fs.readFileSync(path.join(ROOT, 'apps/desktop/src/pages/Investigation.tsx'), 'utf8');

    expect(home).toContain('buildHomeCanonicalArtifact(');
    expect(homeCanonicalArtifact).toContain('getOrBuildCanonicalConsumerArtifact(');
    expect(home).toContain('canonicalHandoff');
    expect(`${advanced}\n${advancedTransferActions}`).toContain('handoff.canonicalHandoff');
    expect(handoff).toContain('getOrBuildCanonicalConsumerArtifact(');
    expect(handoff).toContain('prepareCanonicalInvestigationHandoff(');
    expect(investigation).toContain('executeGovernedMetricRequest');
    expect(investigation).toContain('canonical_handoff_required');

    for (const source of [home, homeCanonicalArtifact, advanced, advancedTransferActions, investigation]) {
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
    expect(governedMetricPolicyHash()).toBe('389f209926cf7a62429c03c395b1f4c6a576b4ad16cacacb7162773352e22fd6');
    expect(questionActionPolicyHash()).toBe('840d387ff5150407a0e672e9128936f502e8da9a002937488c1e11ee01218c25');
    expect(governedRuntimePolicyHash()).toBe('0d2666545d20bd54fe4c2f3f7086e92c4fd32a63dd00ec1e2b81ed23b932605d');
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
