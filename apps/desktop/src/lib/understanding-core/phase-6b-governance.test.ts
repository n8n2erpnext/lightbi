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
    expect(governedMetricPolicyHash()).toBe('26bd430cbca42fbb5a6c8fdf51f248fd40ebf9dc28bd29f458ee53d864de3f5c');
    expect(questionActionPolicyHash()).toBe('f623f6adbef180d69d78e1f5f185ff62517df9f8d7093788da48d92661c8c808');
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
