// @vitest-environment jsdom
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { join } from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { UnderstandingNextCard } from '../components/analysis/UnderstandingNextCard';
import { projectCanonicalArtifactToUnderstandingNext } from './canonical-consumer-presentation-adapter';
import { projectCanonicalDomainPerspectives } from './canonical-source-candidate-projection';
import { createFocusSubjectSelection, deriveFocusSubjectCandidates } from './focus-subject-analysis';
import { inspectLocalFile } from './local-file-inspector';
import { createFileSourceCandidate } from './source-preflight';
import { getOrBuildCanonicalConsumerArtifact, resetCanonicalConsumerCacheForTests } from './understanding-core/canonical-consumer-boundary';
import { presentCanonicalConsumerArtifact } from './understanding-core/canonical-consumer-presentation-contract';
import { createCanonicalSourceBoundary } from './understanding-core/canonical-source-boundary';

createRequire(import.meta.url);
afterEach(() => {
  cleanup();
  resetCanonicalConsumerCacheForTests();
});
async function buildContextFixture() {
  const rows = Array.from({ length: 120 }, (_, index) => [
    `SO-${String(index + 1).padStart(4, '0')}`,
    `2026-0${(index % 6) + 1}-${String((index % 28) + 1).padStart(2, '0')}`,
    `Product ${(index % 8) + 1}`,
    String(1000 + index * 25),
    String((index % 5) + 1),
    `Store ${(index % 4) + 1}`,
  ].join(','));
  const csv = [
    'Order ID,Order Date,Product,Revenue,Sold Qty,Store',
    ...rows,
  ].join('\n');
  const file = new File([csv], 'focus-commerce.csv', { type: 'text/csv' });
  const candidate = createFileSourceCandidate(file);
  if (!('rawUrl' in candidate)) throw new Error('local fixture required');
  const inspected = await inspectLocalFile(candidate);
  if (inspected.status !== 'accessible') throw new Error(inspected.message);
  const metadata = inspected.metadata;
  const sample = metadata.semantic_sample!;
  const boundary = createCanonicalSourceBoundary({
    datasetId: file.name,
    columns: metadata.columns!,
    semanticRows: metadata.semantic_rows!,
    semanticSample: {
      strategy: sample.strategy,
      sourceRowCount: sample.source_row_count,
      rowIndexes: sample.row_indexes,
    },
    fullFileProfile: metadata.canonical_full_file_profile!,
    fullFileUnderstanding: metadata.canonical_full_file_profile!.fullFileUnderstanding,
    runtimeFiles: [{ file }],
  });
  const artifact = getOrBuildCanonicalConsumerArtifact({
    datasetId: boundary.datasetId,
    sourceKind: 'local_file',
    sourceLabel: file.name,
    columns: boundary.semanticSample.columns,
    rows: boundary.semanticSample.rows,
    sourceRowCount: boundary.sourceRowCount,
    sourceBoundary: boundary,
  });
  if (artifact.status !== 'valid') throw new Error(artifact.blockers.join(','));
  const presentation = presentCanonicalConsumerArtifact(artifact);
  const understanding = projectCanonicalArtifactToUnderstandingNext(artifact);
  const perspectives = projectCanonicalDomainPerspectives(artifact);
  const focusCandidates = deriveFocusSubjectCandidates(
    understanding,
    boundary.semanticSample.rows,
  );
  const executable = perspectives.filter(item => item.state === 'governed_action_available');
  const pair = focusCandidates
    .map(focusCandidate => ({
      focusCandidate,
      perspective: executable.find(item =>
        item.matchedSignalIds.includes(focusCandidate.canonicalId)
        || item.perspectiveId === focusCandidate.domain),
    }))
    .find(item => item.perspective);
  if (!pair?.perspective || pair.focusCandidate.options.length === 0) {
    throw new Error('focus fixture did not produce a related governed lens');
  }
  const focus = createFocusSubjectSelection(
    pair.focusCandidate,
    pair.focusCandidate.options[0],
    understanding,
  );
  return {
    presentation,
    understanding,
    perspectives,
    focusCandidates,
    focus,
    perspectiveId: pair.perspective.perspectiveId,
  };
}

function renderContext(
  fixture: Awaited<ReturnType<typeof buildContextFixture>>,
  selectedPerspectiveId: string | null,
  withFocus: boolean,
) {
  return render(<UnderstandingNextCard
    understanding={fixture.understanding}
    canonicalPresentation={fixture.presentation}
    canonicalPerspectives={fixture.perspectives}
    selectedPerspectiveId={selectedPerspectiveId}
    focusCandidates={fixture.focusCandidates}
    selectedFocusSubject={withFocus ? fixture.focus : null}
    onSelectPerspective={() => {}}
    onClearPerspective={() => {}}
    onSelectFocusSubject={() => {}}
    onClearFocusSubject={() => {}}
  />);
}
describe('Focus Subject analysis context UI', () => {
  it('preserves the existing perspective-only mode', async () => {
    const fixture = await buildContextFixture();
    renderContext(fixture, fixture.perspectiveId, false);
    const summary = screen.getByTestId('analysis-context-summary');
    expect(summary.textContent).toContain('Perspective:');
    expect(summary.textContent).not.toContain('Focus:');
    expect(screen.getByText('Analyze this perspective')).toBeTruthy();
  });

  it('supports focus-only mode with a semantically related auto lens', async () => {
    const fixture = await buildContextFixture();
    renderContext(fixture, null, true);
    const summary = screen.getByTestId('analysis-context-summary');
    expect(summary.textContent).toContain('Focus:');
    expect(summary.textContent).toContain('Auto lens:');
    expect(screen.getByText('Analyze this focus')).toBeTruthy();
  });

  it('combines an explicit perspective with a focus without replacing either axis', async () => {
    const fixture = await buildContextFixture();
    renderContext(fixture, fixture.perspectiveId, true);
    const summary = screen.getByTestId('analysis-context-summary');
    expect(summary.textContent).toContain('Perspective:');
    expect(summary.textContent).toContain('Focus:');
    expect(summary.textContent).not.toContain('Auto lens:');
    expect(screen.getByText('Analyze focused perspective')).toBeTruthy();
  });
});
