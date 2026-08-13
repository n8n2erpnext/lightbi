import { describe, expect, it } from 'vitest';
import { detectBusinessSignals } from './business-signal-detector';
import { createDatasetUnderstanding } from './dataset-understanding-contract';

describe('semantic coverage', () => {
  it('classifies every populated column and surfaces unknown business-like fields', () => {
    const registry = detectBusinessSignals({
      columns: [
        {
          name: 'Revenue',
          type: 'number',
          sampleValues: [100, 120, 90],
          uniqueValuesCount: 3,
          distinctRatio: 1
        },
        {
          name: 'DecisionMode',
          type: 'string',
          sampleValues: ['Internal', 'External', 'External', 'Internal'],
          uniqueValuesCount: 2,
          distinctRatio: 0.5
        },
        {
          name: '__empty__',
          type: 'string',
          sampleValues: ['', null, undefined],
          uniqueValuesCount: 0,
          distinctRatio: 0
        }
      ]
    });

    const coverage = registry.semanticCoverage;
    expect(coverage).toBeDefined();
    expect(coverage!.items).toHaveLength(3);
    const revenueCoverage = coverage!.items.find(item => item.physicalColumn === 'Revenue');
    expect(['recognized', 'partial']).toContain(revenueCoverage?.status);
    expect(revenueCoverage?.inferredSignal).toBe('revenue');
    expect(coverage!.items.find(item => item.physicalColumn === 'DecisionMode')?.status).toBe('unknown_business_like');
    expect(coverage!.items.find(item => item.physicalColumn === '__empty__')?.status).toBe('technical_or_noise');
  });

  it('downgrades understanding when business-like columns are not mapped', () => {
    const registry = detectBusinessSignals({
      columns: [
        {
          name: 'Revenue',
          type: 'number',
          sampleValues: [100, 120, 90],
          uniqueValuesCount: 3,
          distinctRatio: 1
        },
        {
          name: 'DecisionMode',
          type: 'string',
          sampleValues: ['Internal', 'External', 'External', 'Internal'],
          uniqueValuesCount: 2,
          distinctRatio: 0.5
        }
      ]
    });

    const understanding = createDatasetUnderstanding({
      datasetName: 'coverage-test',
      rowCount: 4,
      columnCount: 2,
      signalRegistry: registry,
      businessViews: [{ id: 'view_1' }],
      questionSuggestions: [{ id: 'question_1' }]
    });

    expect(understanding.semanticCoverage?.summary.unknownBusinessLike).toBe(1);
    expect(understanding.status).toBe('partial');
    expect(understanding.caveats.some(caveat => caveat.includes('business-like'))).toBe(true);
    expect(understanding.readiness?.caveats.some(caveat => caveat.includes('semantic review'))).toBe(true);
  });
});
