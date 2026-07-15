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
    const handoff = fs.readFileSync(path.join(ROOT, 'apps/desktop/src/lib/advanced-result-handoff.ts'), 'utf8');
    const investigation = fs.readFileSync(path.join(ROOT, 'apps/desktop/src/pages/Investigation.tsx'), 'utf8');

    expect(home).toContain('getOrBuildCanonicalConsumerArtifact(');
    expect(home).toContain('canonicalHandoff');
    expect(advanced).toContain('handoff.canonicalHandoff');
    expect(handoff).toContain('getOrBuildCanonicalConsumerArtifact(');
    expect(handoff).toContain('prepareCanonicalInvestigationHandoff(');
    expect(investigation).toContain('executeGovernedMetricRequest');
    expect(investigation).toContain('canonical_handoff_required');

    for (const source of [home, advanced, investigation]) {
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
    expect(governedMetricPolicyHash()).toBe('79b00e4aa7e97311da56db1f19a996c52c8034dc52da21b0dc6981dfd1282702');
    expect(questionActionPolicyHash()).toBe('9c8ce5e0904a95f70e80cb81bc79a4c52ba4729f4772a7e9a8d6e997da3d6cbb');
    expect(governedRuntimePolicyHash()).toBe('9b5ef8acc2d6761b428b41713c4e0d87a9db3bb9c79d251e51026057d0ea00b4');
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
