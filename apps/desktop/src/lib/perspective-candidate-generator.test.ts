import { describe, it, expect } from 'vitest';
import { generatePerspectiveCandidates } from './perspective-candidate-generator';
import type { BusinessSignalRegistry, BusinessSignal } from './business-signal-detector';

// Mock helper to create a registry easily for tests
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

describe('Perspective Candidate Generator', () => {
  it('1. Operations logistics registry: driver, route, delivery_status -> emits operations only', () => {
    const registry = createMockRegistry([
      { id: 'driver', score: 80 },
      { id: 'route', score: 90 },
      { id: 'delivery_status', score: 70 }
    ]);

    const candidates = generatePerspectiveCandidates(registry);
    
    expect(candidates.length).toBe(1);
    expect(candidates[0].id).toBe('operations');
    // Avg = (80+90+70)/3 = 80. Bonus = (3-1)*5 = 10. Total = 90.
    expect(candidates[0].confidenceScore).toBe(90);
  });

  it('2. Inventory shared-signal test: sku, warehouse, stock_movement', () => {
    const registry = createMockRegistry([
      { id: 'sku', score: 90 },
      { id: 'warehouse', score: 80 },
      { id: 'stock_movement', score: 80 }
    ]);

    const candidates = generatePerspectiveCandidates(registry);
    
    // Inventory should be generated and ranked first
    // Operations should be generated lower because of shared 'warehouse'
    expect(candidates.length).toBe(2);
    expect(candidates[0].id).toBe('inventory');
    expect(candidates[1].id).toBe('operations');
    
    // Check inventory confidence: Avg (90+80+80)/3 = 83.33. Bonus = (3-1)*5 = 10. Total = 93.
    expect(candidates[0].confidenceScore).toBe(93);
    // Check operations confidence: Avg 80/1 = 80. Bonus = 0. Total = 80.
    expect(candidates[1].confidenceScore).toBe(80);
  });

  it('3. Revenue registry: revenue, branch, order', () => {
    const registry = createMockRegistry([
      { id: 'revenue', score: 95 },
      { id: 'branch', score: 85 },
      { id: 'order', score: 90 }
    ]);

    const candidates = generatePerspectiveCandidates(registry);
    
    expect(candidates.length).toBe(1);
    expect(candidates[0].id).toBe('revenue');
  });

  it('4. Customer registry: customer, segment', () => {
    const registry = createMockRegistry([
      { id: 'customer', score: 80 },
      { id: 'segment', score: 70 }
    ]);

    const candidates = generatePerspectiveCandidates(registry);
    
    expect(candidates.length).toBe(1);
    expect(candidates[0].id).toBe('customer');
  });

  it('5. Performance registry: target, achievement, productivity', () => {
    const registry = createMockRegistry([
      { id: 'target', score: 85 },
      { id: 'achievement', score: 90 },
      { id: 'productivity', score: 80 }
    ]);

    const candidates = generatePerspectiveCandidates(registry);
    
    expect(candidates.length).toBe(1);
    expect(candidates[0].id).toBe('performance');
  });

  it('6. Empty registry emits []', () => {
    const registry = createMockRegistry([]);
    const candidates = generatePerspectiveCandidates(registry);
    expect(candidates.length).toBe(0);
  });

  it('7. Unknown signals emits []', () => {
    const registry = createMockRegistry([
      { id: 'random_id1', score: 90 },
      { id: 'random_id2', score: 80 }
    ]);

    const candidates = generatePerspectiveCandidates(registry);
    expect(candidates.length).toBe(0);
  });

  it('8. Sorting: Higher confidence perspective appears first', () => {
    // Generate weak operations signal (1 signal) and strong revenue signals (3 signals)
    const registry = createMockRegistry([
      { id: 'driver', score: 50 },
      { id: 'revenue', score: 90 },
      { id: 'order', score: 90 },
      { id: 'branch', score: 90 }
    ]);

    const candidates = generatePerspectiveCandidates(registry);
    expect(candidates.length).toBe(2);
    expect(candidates[0].id).toBe('revenue');
    expect(candidates[1].id).toBe('operations');
  });

  it('9. No fallback: No mapped signals means no perspectives', () => {
    const registry = createMockRegistry([
      { id: 'unmapped_signal', score: 100 }
    ]);
    const candidates = generatePerspectiveCandidates(registry);
    expect(candidates.length).toBe(0);
  });
});
