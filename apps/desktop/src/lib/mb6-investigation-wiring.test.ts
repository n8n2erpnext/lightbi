import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const investigation = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/Investigation.tsx'), 'utf8');

describe('MB-6 Investigation authority wiring', () => {
  it('builds authority from the canonical artifact and current governed runtime preflight', () => {
    expect(investigation).toMatch(/createBAAnalysisAuthorityContext\(currentCanonicalArtifact/);
    expect(investigation).toMatch(/actionCandidateId: session\?\.analysisAction\.id/);
    expect(investigation).toMatch(/runtimePreflight: session\?\.canonicalHandoff\?\.runtimePreflight/);
    expect(investigation).toMatch(/useFocusSubjectComparison\(session, primaryAnalysisAuthority\)/);
  });

  it('uses the selected action authority for Step 2 and passes it to both BA recalculation and the Deep BA surface', () => {
    expect(investigation).toMatch(/const filteredAnalysisAuthority = useMemo/);
    expect(investigation).toMatch(/actionCandidateId: action\.id/);
    expect(investigation).toMatch(/analysisAuthority: filteredAnalysisAuthority/);
    expect(investigation).toMatch(/filteredAnalysisAuthority,\s*\n\s*\);/);
    expect(investigation).toMatch(/analysisAuthority=\{filteredDeepAnalysisScope \? filteredAnalysisAuthority : primaryAnalysisAuthority\}/);
  });
});
