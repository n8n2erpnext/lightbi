import { describe, it, expect } from 'vitest';
import { generateAIBriefing, generateAIBriefingFromUnderstandingNext } from './ai-briefing-generator';
import type { DatasetUnderstanding } from './dataset-understanding-contract';
import type { DatasetUnderstandingResult } from './understanding-next/contracts';

describe('AI Briefing Generator', () => {
  it('generates briefing with semantic fields from detected concepts', () => {
    const understanding: DatasetUnderstanding = {
      datasetId: 'ds-123',
      datasetName: 'Delivery',
      grain: 'event',
      grainEvidence: 'Contains order_id',
      detectedConcepts: [
        { canonicalConcept: 'driver', displayName: 'Driver', businessDomain: 'logistics', confidenceScore: 0.9, evidence: ['driver_name'] },
        { canonicalConcept: 'route', displayName: 'Route', businessDomain: 'logistics', confidenceScore: 0.8, evidence: ['route_id'] },
        { canonicalConcept: 'shipment', displayName: 'Shipment', businessDomain: 'logistics', confidenceScore: 0.95, evidence: ['shipment_date'] }
      ],
      readiness: { tier: 'decision_support', score: 90, caveats: [], issues: [], reasonSummary: 'Good' },
      opportunities: [
        { id: '1', label: 'analyze driver performance', type: 'trend', confidence: 'high', recommendedVisual: 'line', complexity: 'low', requiredConcepts: [] }
      ],
      mappingReview: { items: [], completionScore: 100 },
      inferredEntities: [],
      caveats: [],
      status: 'understood',
      confidenceScore: 90,
      narrative: ''
    };

    const briefing = generateAIBriefing(understanding);
    expect(briefing.grain).toBe('event');
    expect(briefing.semanticFields.length).toBe(3);
    expect(briefing.semanticFields[0].canonicalId).toBe('driver');
    expect(briefing.safeActionHints.length).toBe(1);
    expect(briefing.safeActionHints[0]).toBe('Can analyze driver performance');
  });

  it('handles empty understanding gracefully', () => {
    const understanding: DatasetUnderstanding = {
      datasetId: 'unknown',
      grain: 'unknown',
      detectedConcepts: [],
      inferredEntities: [],
      caveats: [],
      status: 'insufficient',
      confidenceScore: 0,
      narrative: ''
    };
    const briefing = generateAIBriefing(understanding);
    expect(briefing.semanticFields).toHaveLength(0);
    expect(briefing.grain).toBe('unknown');
    expect(briefing.safeActionHints).toHaveLength(0);
  });

  it('deduplicates caveats from understanding and readiness', () => {
    const understandingWithDupCaveats: DatasetUnderstanding = {
      datasetId: 'ds-dup',
      grain: 'unknown',
      detectedConcepts: [],
      inferredEntities: [],
      caveats: ['No time detected.'],
      readiness: { tier: 'caution', score: 50, caveats: ['No time detected.', 'Missing primary key'], issues: [], reasonSummary: 'Caution' },
      status: 'partial',
      confidenceScore: 50,
      narrative: ''
    };
    const briefing = generateAIBriefing(understandingWithDupCaveats);
    expect(briefing.caveats.filter(c => c === 'No time detected.').length).toBe(1);
    expect(briefing.caveats.length).toBe(2);
  });

  it('scores Understanding Next readiness from data quality instead of a fixed caution value', () => {
    const strong = makeUnderstandingNext({
      quality: { headerStatus: 'clean', dirtySignals: [], blockedReasons: [] },
      profile: { grain: 'transaction', documentType: 'retail_sales_document', detectedDomains: ['revenue'] },
      availableActions: [
        {
          id: 'revenue-trend',
          questionId: 'q1',
          label: 'Revenue trend',
          actionKind: 'trend',
          dimensions: ['date'],
          measures: ['revenue'],
          executionScope: 'full_local_file',
        },
        {
          id: 'segment-sales',
          questionId: 'q2',
          label: 'Sales by segment',
          actionKind: 'group_by',
          dimensions: ['segment'],
          measures: ['revenue'],
          executionScope: 'full_local_file',
        },
      ],
    });

    const weak = makeUnderstandingNext({
      quality: {
        headerStatus: 'ambiguous',
        dirtySignals: [
          { kind: 'mixed_text_number', severity: 'warning', message: 'Mixed values', evidence: ['amount'] },
          { kind: 'blank_or_duplicate_header', severity: 'blocking', message: 'Bad header', evidence: ['Column 1'] },
        ],
        blockedReasons: ['Header could not be trusted'],
      },
      profile: { grain: 'unknown', documentType: 'generic_table', detectedDomains: [] },
      signals: [],
      availableActions: [],
      unavailableActions: [
        { id: 'blocked', label: 'Trend', reason: 'Missing time and measure', missingSignals: ['time', 'measure'], blockedReasons: ['Missing time'] },
      ],
    });

    const strongBriefing = generateAIBriefingFromUnderstandingNext(strong);
    const weakBriefing = generateAIBriefingFromUnderstandingNext(weak);

    expect(strongBriefing.readinessScore).toBeGreaterThan(70);
    expect(strongBriefing.readinessTier).toBe('decision_support');
    expect(weakBriefing.readinessScore).toBeLessThan(70);
    expect(weakBriefing.readinessTier).toBe('exploratory_only');
    expect(strongBriefing.readinessScore).not.toBe(weakBriefing.readinessScore);
  });
});

function makeUnderstandingNext(overrides: Partial<DatasetUnderstandingResult> = {}): DatasetUnderstandingResult {
  return {
    source: {
      fileNames: ['sample.xlsx'],
      sheetNames: ['Sheet1'],
      sourceRowCount: 100,
      sourceColumnCount: 4,
      parsedRowCount: 100,
      sampleRowCount: 100,
    },
    quality: { headerStatus: 'clean', dirtySignals: [], blockedReasons: [] },
    profile: { grain: 'transaction', documentType: 'retail_sales_document', detectedDomains: ['revenue'] },
    signals: [
      {
        canonicalId: 'date',
        label: 'Date',
        domain: 'revenue',
        physicalColumn: 'date',
        confidence: 95,
        evidence: ['date'],
        cardinality: 12,
        role: 'time',
        usableForDefaultQuestion: true,
      },
      {
        canonicalId: 'revenue',
        label: 'Revenue',
        domain: 'revenue',
        physicalColumn: 'revenue',
        confidence: 95,
        evidence: ['revenue'],
        cardinality: 80,
        role: 'measure',
        usableForDefaultQuestion: true,
      },
      {
        canonicalId: 'segment',
        label: 'Segment',
        domain: 'revenue',
        physicalColumn: 'segment',
        confidence: 85,
        evidence: ['segment'],
        cardinality: 5,
        role: 'dimension',
        usableForDefaultQuestion: true,
      },
    ],
    lenses: [],
    perspectives: [],
    recommendedQuestions: [
      {
        id: 'q1',
        label: 'Revenue trend',
        userPrompt: 'Show revenue over time',
        domain: 'revenue',
        perspectiveId: 'p1',
        requiredSignals: ['date', 'revenue'],
        optionalSignals: ['segment'],
        dimensions: ['date'],
        measures: ['revenue'],
        fitScore: 92,
        actionKind: 'trend',
        executionScope: 'full_local_file',
        caveats: [],
      },
    ],
    availableActions: [
      {
        id: 'revenue-trend',
        questionId: 'q1',
        label: 'Revenue trend',
        actionKind: 'trend',
        dimensions: ['date'],
        measures: ['revenue'],
        executionScope: 'full_local_file',
      },
    ],
    unavailableActions: [],
    ...overrides,
  };
}
