import { describe, it, expect } from 'vitest';
import { calculateBusinessConfidence } from './business-confidence-engine';
import type { ConfidenceSignalRegistry } from './business-confidence-engine';

describe('Business Confidence Engine', () => {

  const createRegistry = (signals: any[], isMultiDataset = false): ConfidenceSignalRegistry => ({
    version: "1.0",
    isMultiDataset,
    signals
  });

  it('1. Single high signal', () => {
    const reg = createRegistry([{
      id: '1', category: 'dataset_health', label: 'Data Quality', score: 95, weight: 25, enabled: true, explanation: ''
    }]);
    const result = calculateBusinessConfidence(reg);
    expect(result.score).toBe(95);
    expect(result.level).toBe('HIGH');
  });

  it('2. Weighted average', () => {
    const reg = createRegistry([
      { id: '1', category: 'dataset_health', label: 'Data Quality', score: 100, weight: 25, enabled: true, explanation: '' },
      { id: '2', category: 'business_view', label: 'Business View', score: 50, weight: 25, enabled: true, explanation: '' }
    ]);
    const result = calculateBusinessConfidence(reg);
    expect(result.score).toBe(75); // (100 * 0.5) + (50 * 0.5)
  });

  it('3. Missing signals normalization', () => {
    const reg = createRegistry([
      { id: '1', category: 'dataset_health', label: 'Data Quality', score: 80, weight: 25, enabled: true, explanation: '' },
      { id: '2', category: 'relationship_quality', label: 'Rel Quality', score: 0, weight: 25, enabled: false, explanation: '' },
      { id: '3', category: 'business_view', label: 'Business View', score: 100, weight: 10, enabled: true, explanation: '' }
    ]);
    const result = calculateBusinessConfidence(reg);
    // enabled weights: 25 + 10 = 35. 
    // health normalized weight = 25/35 = 0.714
    // bv normalized weight = 10/35 = 0.285
    // score = 80*0.714 + 100*0.285 = 57.14 + 28.57 = 85.71 -> 86
    expect(result.score).toBe(86);
  });

  it('4. Provisional mode detection', () => {
    const reg = createRegistry([
      { id: '1', category: 'dataset_health', label: 'Data Quality', score: 100, weight: 25, enabled: true, explanation: '' }
    ]);
    const result = calculateBusinessConfidence(reg);
    expect(result.mode).toBe('provisional');
  });

  it('5. Final mode detection', () => {
    const reg = createRegistry([
      { id: '1', category: 'result_validation', label: 'Result Val', score: 100, weight: 25, enabled: true, explanation: '' },
      { id: '2', category: 'coverage', label: 'Coverage', score: 100, weight: 15, enabled: true, explanation: '' }
    ]);
    const result = calculateBusinessConfidence(reg);
    expect(result.mode).toBe('final');
  });

  it('6. High confidence', () => {
    const reg = createRegistry([
      { id: '1', category: 'dataset_health', label: 'Data Quality', score: 90, weight: 25, enabled: true, explanation: '' }
    ]);
    const result = calculateBusinessConfidence(reg);
    expect(result.level).toBe('HIGH');
  });

  it('7. Medium confidence', () => {
    const reg = createRegistry([
      { id: '1', category: 'dataset_health', label: 'Data Quality', score: 70, weight: 25, enabled: true, explanation: '' }
    ]);
    const result = calculateBusinessConfidence(reg);
    expect(result.level).toBe('MEDIUM');
  });

  it('8. Low confidence', () => {
    const reg = createRegistry([
      { id: '1', category: 'dataset_health', label: 'Data Quality', score: 40, weight: 25, enabled: true, explanation: '' }
    ]);
    const result = calculateBusinessConfidence(reg);
    expect(result.level).toBe('LOW');
  });

  it('9. Dataset health cap', () => {
    const reg = createRegistry([
      { id: '1', category: 'dataset_health', label: 'Data Quality', score: 40, weight: 1, enabled: true, explanation: '' },
      { id: '2', category: 'business_view', label: 'Business View', score: 100, weight: 99, enabled: true, explanation: '' }
    ]);
    // Weighted average is ~99, which is HIGH, but health is 40 (< 50)
    const result = calculateBusinessConfidence(reg);
    expect(result.level).toBe('MEDIUM');
  });

  it('10. Missing relationship cap', () => {
    // Multi dataset, no relationship signal -> cap at MEDIUM
    const reg = createRegistry([
      { id: '1', category: 'dataset_health', label: 'Data Quality', score: 100, weight: 25, enabled: true, explanation: '' }
    ], true);
    const result = calculateBusinessConfidence(reg);
    expect(result.level).toBe('MEDIUM');
  });

  it('11. Explanation generation', () => {
    const reg = createRegistry([
      { id: '1', category: 'dataset_health', label: 'Data Quality', score: 90, weight: 25, enabled: true, explanation: '' }
    ]);
    const result = calculateBusinessConfidence(reg);
    expect(result.caveats).toContain("Runtime result has not been validated yet.");
    expect(result.explanation[0]).toContain("High confidence:");
  });

  it('12. Deterministic output', () => {
    const reg = createRegistry([
      { id: '1', category: 'dataset_health', label: 'Data Quality', score: 90, weight: 25, enabled: true, explanation: '' }
    ]);
    const result1 = calculateBusinessConfidence(reg);
    const result2 = calculateBusinessConfidence(reg);
    expect(result1.score).toBe(result2.score);
    expect(result1.level).toBe(result2.level);
    expect(result1.mode).toBe(result2.mode);
  });
  it('13. Disabled validation/coverage keeps mode provisional', () => {
    const reg = createRegistry([
      { id: '1', category: 'dataset_health', label: 'Data Quality', score: 100, weight: 25, enabled: true, explanation: '' },
      { id: '2', category: 'result_validation', label: 'Result Val', score: 100, weight: 25, enabled: false, explanation: '' },
      { id: '3', category: 'coverage', label: 'Coverage', score: 100, weight: 15, enabled: false, explanation: '' }
    ]);
    const result = calculateBusinessConfidence(reg);
    expect(result.mode).toBe('provisional');
  });
});
