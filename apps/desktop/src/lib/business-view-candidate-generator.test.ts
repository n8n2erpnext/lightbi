import { describe, it, expect } from 'vitest';
import { generateBusinessViewCandidates } from './business-view-candidate-generator';
import type { PerspectiveCandidate } from './perspective-candidate-generator';
import type { BusinessSignalRegistry, BusinessSignal } from './business-signal-detector';
import { getDomainCatalog } from './domain-knowledge-catalog';

// Mock helpers
function createMockRegistry(signalsData: { id: string, score: number }[]): BusinessSignalRegistry {
  const signals: BusinessSignal[] = signalsData.map(s => ({
    canonicalId: s.id,
    domain: 'test',
    label: s.id,
    confidenceScore: s.score,
    supportingEvidence: []
  }));

  const signalMap = new Map(signals.map(s => [s.canonicalId, s]));

  return {
    datasetId: "test_ds",
    signals,
    hasSignal: (id: string) => signalMap.has(id),
    getSignal: (id: string) => signalMap.get(id),
    getSignalsByDomain: () => signals,
    getOverallConfidence: () => 100
  };
}

function createMockPerspective(id: any): PerspectiveCandidate {
  return {
    id,
    label: id,
    description: "",
    confidenceScore: 100,
    supportingSignals: [],
    evidence: []
  };
}

describe('Business View Candidate Generator (Registry-Driven)', () => {

  it('1. Operations signals generate at least one Operations view', () => {
    const registry = createMockRegistry([
      { id: 'driver', score: 100 },
      { id: 'route', score: 100 },
      { id: 'delivery_status', score: 100 }
    ]);
    const candidates = generateBusinessViewCandidates({ perspectives: [createMockPerspective('operations')], signalRegistry: registry });
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].perspectiveId).toBe('operations');
  });

  it('2. Inventory signals generate at least one Inventory view', () => {
    const registry = createMockRegistry([
      { id: 'inventory', score: 100 },
      { id: 'stock_movement', score: 100 }
    ]);
    const candidates = generateBusinessViewCandidates({ perspectives: [createMockPerspective('inventory')], signalRegistry: registry });
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].perspectiveId).toBe('inventory');
  });

  it('3. Revenue signals generate at least one Revenue view', () => {
    const registry = createMockRegistry([
      { id: 'revenue', score: 100 },
      { id: 'order', score: 100 }
    ]);
    const candidates = generateBusinessViewCandidates({ perspectives: [createMockPerspective('revenue')], signalRegistry: registry });
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].perspectiveId).toBe('revenue');
  });

  it('4. Customer signals generate at least one Customer view', () => {
    const registry = createMockRegistry([
      { id: 'customer', score: 100 },
      { id: 'segment', score: 100 }
    ]);
    const candidates = generateBusinessViewCandidates({ perspectives: [createMockPerspective('customer')], signalRegistry: registry });
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].perspectiveId).toBe('customer');
  });

  it('5. Performance signals generate at least one Performance view', () => {
    const registry = createMockRegistry([
      { id: 'target', score: 100 },
      { id: 'achievement', score: 100 }
    ]);
    const candidates = generateBusinessViewCandidates({ perspectives: [createMockPerspective('performance')], signalRegistry: registry });
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].perspectiveId).toBe('performance');
  });

  it('6. No signals returns []', () => {
    const registry = createMockRegistry([]);
    const candidates = generateBusinessViewCandidates({ perspectives: [createMockPerspective('operations')], signalRegistry: registry });
    expect(candidates.length).toBe(0);
  });

  it('7. Partial signals below threshold returns []', () => {
    // Route Performance needs route & delivery_status (min 2)
    const registry = createMockRegistry([
      { id: 'route', score: 100 }
    ]);
    const candidates = generateBusinessViewCandidates({ perspectives: [createMockPerspective('operations')], signalRegistry: registry });
    expect(candidates.length).toBe(0);
  });

  it('8. Evidence includes: matched, missing', () => {
    // Delivery SLA requires sla and route.
    const registry = createMockRegistry([
      { id: 'route', score: 100 }
    ]);
    // Force it to skip threshold check just to inspect missing if we had it, 
    // but threshold fails, so we need to pass threshold to inspect evidence.
    // Driver Performance needs driver, sla (min 2)
    // Wait, let's look at Logistics Journey (min 3: driver, route, delivery_status)
    // If we only provide 2, it fails. If we provide 3 required and miss an optional, we can check.
    // Let's modify a domain or check standard:
    // "revenue_performance" needs revenue, order (min 2). Optional: discount.
    const reg = createMockRegistry([
      { id: 'revenue', score: 100 },
      { id: 'order', score: 100 }
    ]);
    const candidates = generateBusinessViewCandidates({ perspectives: [createMockPerspective('revenue')], signalRegistry: reg });
    const view = candidates.find(c => c.id === 'revenue_performance')!;
    expect(view.matchedRequiredSignals).toContain('revenue');
    expect(view.matchedRequiredSignals).toContain('order');
    expect(view.matchedOptionalSignals).not.toContain('discount');
  });

  it('9. Confidence sorting works', () => {
    // Revenue Performance (req: revenue, order; opt: discount)
    // Revenue Trend (req: revenue; opt: order)
    const registry = createMockRegistry([
      { id: 'revenue', score: 100 }
    ]);
    const c1 = generateBusinessViewCandidates({ perspectives: [createMockPerspective('revenue')], signalRegistry: registry });
    
    const registry2 = createMockRegistry([
      { id: 'revenue', score: 100 },
      { id: 'order', score: 100 }
    ]);
    const c2 = generateBusinessViewCandidates({ perspectives: [createMockPerspective('revenue')], signalRegistry: registry2 });
    
    // c2 should have higher score for revenue_trend because it matched optional signal (order)
    const trend1 = c1.find(c => c.id === 'revenue_trend')!;
    const trend2 = c2.find(c => c.id === 'revenue_trend')!;
    expect(trend2.confidenceScore).toBeGreaterThan(trend1.confidenceScore);
  });

  it('10. Generator uses registry dynamically (new Business View automatically works)', () => {
    // We mutate the catalog in memory
    const catalog = getDomainCatalog('finance');
    expect(catalog).toBeDefined();

    // Push a fake view
    catalog!.businessViews.push({
      id: "fake_view",
      perspective: "finance",
      label: "Fake",
      description: "Fake",
      requiredSignals: ["fake_signal"],
      optionalSignals: [],
      minimumRequiredMatches: 1,
      intentIds: [],
      examples: []
    });

    const registry = createMockRegistry([
      { id: 'fake_signal', score: 100 }
    ]);

    const candidates = generateBusinessViewCandidates({ perspectives: [createMockPerspective('finance')], signalRegistry: registry });
    
    // Clean up mutation
    catalog!.businessViews = catalog!.businessViews.filter(v => v.id !== 'fake_view');

    expect(candidates.length).toBe(1);
    expect(candidates[0].id).toBe('fake_view');
  });

});
