import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = path.join(process.cwd(), 'src');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(SRC, relativePath), 'utf8');
}

describe('Phase 8F core to production UI parity', () => {
  it('keeps Home analysis source-bound and projects only canonical state', () => {
    const home = read('pages/Home.tsx');
    const view = read('components/home/HomeWorkspaceView.tsx');

    expect(home).toContain('const metricSourceId = multiSourceDataset.analyses.find');
    expect(home).toContain('return metricSource?.artifact ?? null');
    expect(home).toContain('presentCanonicalConsumerArtifact');
    expect(home).toContain('presentCanonicalMultiSourceRelationship');
    expect(view).toContain('canonicalPresentation');
    expect(view).toContain('canonicalMultiSourcePresentation');
    expect(view).not.toContain('<DataQualityCard');
    expect(view).not.toContain('<DecisionTrustReportCard');
    expect(view).not.toContain('<BusinessFusionOpportunityCard');
    expect(view).not.toContain('homeGuidance.recentInsights.items.map');
    expect(view).not.toMatch(/formatRowCount=.*compact:\s*true/);
    expect(view).not.toMatch(/rows_count,\s*'number',\s*preferences,\s*\{\s*compact:\s*true/);
  });

  it('requires explicit source evidence and never promotes placeholders', () => {
    const home = read('pages/Home.tsx');
    const review = read('components/analysis/CanonicalMultiSourceReview.tsx');
    const evidence = read('components/analysis/CanonicalEvidenceReview.tsx');

    expect(home).toContain("role: ''");
    expect(home).toContain('if (draft.role) overlay = appendCanonicalEvidenceDeclaration');
    expect(review).toContain('Select an explicit role for every included source');
    expect(review).not.toContain('<option value="unknown_other">');
    expect(evidence).not.toContain("useState('VND')");
    expect(evidence).not.toContain("useState('EA')");
  });

  it('keeps runtime failure separate and unsupported capability non-remediable', () => {
    const card = read('components/analysis/UnderstandingNextCard.tsx');

    expect(card).toContain("{ id: 'execution-failed', label: 'Execution failed'");
    expect(card).toContain("{ id: 'unsupported', label: 'Unsupported in current MVP'");
    expect(card).toContain("item.state === 'unsupported_mvp' ? 'View limitation'");
    expect(card).toContain("item.state === 'ready' && item.executionReadiness !== 'not_executable'");
  });

  it('does not create BA narrative or governed totals before execution', () => {
    const investigation = read('pages/Investigation.tsx');

    expect(investigation).toContain("const baDecisionBrief = previewResult?.status === 'executed'");
    expect(investigation).not.toContain('createPreExecutionBADecisionBrief');
    expect(investigation).toContain("const governedResultValues = previewResult?.status === 'executed'");
    expect(investigation).toContain('session.canonicalMultiSourceExecutionResult?.evidence?.currency ?? null');
    expect(investigation).not.toContain("currency: 'USD'");
  });

  it('keeps browser-reachable relationship identity hashing free of Node crypto', () => {
    const relationship = read('lib/understanding-core/relationship-candidate-engine.ts');
    const sha = read('lib/understanding-core/deterministic-text-sha256.ts');

    expect(relationship).toContain('deterministicTextSha256');
    expect(relationship).not.toContain('node:crypto');
    expect(sha).not.toContain('node:crypto');
  });

  it('keeps legacy and mock execution disconnected from production pages', () => {
    const pages = ['Home.tsx', 'Investigation.tsx', 'Advanced.tsx']
      .map(file => read(`pages/${file}`))
      .join('\n');

    expect(pages).not.toContain('handleUseBusinessFusionDataset');
    expect(pages).not.toContain('createBusinessFusionVirtualDataset');
    expect(pages).not.toContain('executeBackendPreview(');
    expect(pages).not.toContain('executeDuckDBPreviewRuntime(');
  });
});
