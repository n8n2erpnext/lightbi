// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EvidenceInspector } from './EvidenceInspector';
import type { EvidenceInspectorModelV1 } from '../../lib/presentation-provenance';

afterEach(cleanup);

const model: EvidenceInspectorModelV1 = {
  schemaVersion: 'lightbi.evidence-inspector-model.v1',
  subject: { id: 'why_0', kind: 'claim', label: 'Possible driver' },
  basis: ['OBSERVED', 'DOMAIN_CONTEXT', 'HYPOTHESIS'],
  authorityClass: 'hypothesis_only',
  causalStatus: 'hypothesis',
  evidenceGroups: [{ kind: 'source_field', items: [{ evidenceId: 'field:Revenue', kind: 'source_field', provenance: 'deep_ba_evidence_field', references: ['field:Revenue'] }] }],
  knowledgeRefs: [{ knowledgeId: 'micro-brain-domain:retail:0', kind: 'micro_brain_advisory', source: 'micro_brain', references: ['domain:retail'], authority: 'advisory_only', authorityNotes: ['Micro Brain retrieval/advisory relevance is not semantic confidence.'] }],
  derivation: { kind: 'hypothesis', evidenceIds: ['field:Revenue'], knowledgeIds: ['micro-brain-domain:retail:0'], policyRefs: [] },
  limitations: ['Official domain support is not active.'],
  decisionUseRestrictions: [{ code: 'decision_use_not_authorized', reason: 'This presentation context does not itself authorize a business decision.', severity: 'material' }],
};

describe('DPR-1 EvidenceInspector', () => {
  it('keeps provenance details collapsed by default and exposes bounded authority detail on demand', () => {
    render(<EvidenceInspector model={model} />);
    const details = screen.getByTestId('claim-evidence-inspector-why_0') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(screen.getByText('Hypothesis only')).toBeTruthy();

    fireEvent.click(details.querySelector('summary')!);
    expect(details.open).toBe(true);
    expect(screen.getByText(/Derivation/)).toBeTruthy();
    expect(screen.getByText('Knowledge context')).toBeTruthy();
    expect(screen.getByText(/decision_use_not_authorized/)).toBeTruthy();
    expect(screen.getByText(/not semantic confidence/)).toBeTruthy();
  });
});
