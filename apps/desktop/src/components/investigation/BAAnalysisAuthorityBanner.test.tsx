/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BAAnalysisAuthorityBanner } from './BAAnalysisAuthorityBanner';
import type { BAAnalysisAuthorityContextV1 } from '../../lib/understanding-core/ba-analysis-authority-context';

const context: BAAnalysisAuthorityContextV1 = {
  schemaVersion: 'lightbi.ba-analysis-authority-context.v1', artifactIdentity: 'artifact', datasetStateIdentity: 'state', sourceFingerprint: 'source',
  domain: {
    primaryDomain: 'healthcare', primaryDomainSource: 'micro_brain_relation', analysisMode: 'evidence_bound_inferred_domain',
    officialSupport: { packId: 'commerce_distribution_mvp', state: 'unsupported', productionActive: false },
    semanticConcepts: { confirmed: 0, probable: 2, microBrainRecovered: 2, ambiguous: 0, unknown: 0, unresolved: 0 }, evidenceConflicts: 0,
    evidence: [{ domainId: 'healthcare', source: 'micro_brain_relation', canonicalSignalIds: ['patient'], physicalColumns: ['Patient ID'], reasonCodes: ['brain_relation'] }],
  },
  authorization: {
    metric: { metricId: 'source_record_count', metricVersion: '1.0.0', preflightState: 'conditionally_ready', preflightIdentity: 'preflight', runtimeState: 'conditionally_executable', runtimeExecutionAllowed: true, decisionUseAuthorized: false, selectedBindings: [], blockerCodes: [], limitationCodes: [], evidenceReferences: [] },
    formula: { state: 'not_independently_authorized', decisionUseAuthorized: false, reason: 'No separate formula authority.' },
  },
  limitations: [], evidenceReferences: ['artifact'], decisionUseAuthorized: false,
};

describe('BAAnalysisAuthorityBanner', () => {
  it('discloses inferred-domain/support/authorization state without similarity or percentage confidence', () => {
    render(<BAAnalysisAuthorityBanner context={context} scopeLabel="Step 2 · selected rows" />);
    const banner = screen.getByTestId('ba-analysis-authority');
    const text = banner.textContent ?? '';
    expect(text).toContain('Evidence-bound inferred domain');
    expect(text).toContain('Semantic inference (Micro Brain)');
    expect(text).toContain('Not production-active');
    expect(text).toContain('Metric: source_record_count · conditionally_ready');
    expect(text).toContain('Formula: not independently authorized');
    expect(text).not.toMatch(/similarity|confidence|%/i);
  });
});
