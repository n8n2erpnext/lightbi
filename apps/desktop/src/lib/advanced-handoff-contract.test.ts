import { describe, it, expect } from 'vitest';
import { generateAdvancedHandoff } from './advanced-handoff-contract';
import type { DatasetUnderstanding } from './dataset-understanding-contract';

describe('Advanced Handoff Contract Phase 5', () => {
  it('Scenario 1: Dataset giao hàng đầy đủ (route, driver, report_date, revenue)', () => {
    const mockUnderstanding: DatasetUnderstanding = {
      id: 'test',
      status: 'understood',
      datasetName: 'Delivery Data',
      confidenceScore: 95,
      grain: 'event',
      grainEvidence: 'event level signals',
      summary: { signalCount: 4 } as any,
      detectedConcepts: [
        { signalId: 'route', label: 'Route', canonicalConcept: 'route', confidenceScore: 90, evidence: ['Tuyến xe'] },
        { signalId: 'driver', label: 'Driver', canonicalConcept: 'driver', confidenceScore: 85, evidence: ['Tài xế'] },
        { signalId: 'report_date', label: 'Report Date', canonicalConcept: 'report_date', confidenceScore: 95, evidence: ['Ngày'] },
        { signalId: 'revenue', label: 'Revenue', canonicalConcept: 'revenue', confidenceScore: 80, evidence: ['Doanh thu'] }
      ],
      inferredEntities: [],
      workflowHints: [],
      relationshipHints: [],
      capabilities: [],
      opportunities: [],
      availableAnalysis: [],
      unavailableAnalysis: [],
      caveats: [],
      narrative: '',
      sourceTrace: {} as any,
      createdAt: new Date().toISOString(),
      readiness: {
        score: 95,
        tier: 'decision_support',
        reasonSummary: 'Good to go',
        explanation: '',
        evidence: [],
        caveats: []
      }
    };

    const artifact = generateAdvancedHandoff(mockUnderstanding);

    expect(artifact.grain).toBe('event');
    expect(artifact.fieldRoles.length).toBeGreaterThanOrEqual(4);
    expect(artifact.canonicalMapping.length).toBeGreaterThanOrEqual(1);
    expect(artifact.readinessSummary.tier).toBe('decision_support');
    expect(artifact.readinessSummary.recommendation).toContain('Suitable for automated reporting');
  });

  it('Scenario 2: Dataset tồn kho (sku, warehouse, stock_qty)', () => {
    const mockUnderstanding: DatasetUnderstanding = {
      id: 'test2',
      status: 'partial',
      datasetName: 'Inventory Data',
      confidenceScore: 80,
      grain: 'snapshot',
      grainEvidence: 'snapshot signals',
      summary: {} as any,
      detectedConcepts: [
        { signalId: 'sku', label: 'SKU', canonicalConcept: 'sku', confidenceScore: 90, evidence: ['Mã SP'] },
        { signalId: 'warehouse', label: 'Warehouse', canonicalConcept: 'warehouse', confidenceScore: 85, evidence: ['Kho'] },
        { signalId: 'stock_qty', label: 'Stock Qty', canonicalConcept: 'stock_qty', confidenceScore: 95, evidence: ['Tồn kho'] }
      ],
      inferredEntities: [],
      workflowHints: [],
      relationshipHints: [],
      capabilities: [],
      opportunities: [],
      availableAnalysis: [],
      unavailableAnalysis: [],
      caveats: [],
      narrative: '',
      sourceTrace: {} as any,
      createdAt: new Date().toISOString(),
      readiness: {
        score: 86,
        tier: 'caution',
        reasonSummary: '',
        explanation: '',
        evidence: [],
        caveats: []
      }
    };

    const artifact = generateAdvancedHandoff(mockUnderstanding);
    
    expect(artifact.grain).toBe('snapshot');
    expect(artifact.fieldRoles).toHaveLength(3);
    const roles = artifact.fieldRoles.map(r => r.role);
    expect(roles).toContain('dimension'); // sku, warehouse
    expect(roles).toContain('measure'); // stock_qty
  });

  it('Scenario 3: Dataset trống / không có signals', () => {
    const mockUnderstanding: DatasetUnderstanding = {
      id: 'test3',
      status: 'insufficient',
      datasetName: 'Empty Data',
      confidenceScore: 0,
      grain: 'unknown',
      grainEvidence: 'No patterns',
      summary: {} as any,
      detectedConcepts: [
        { signalId: 'unrecognized', label: 'Unrecognized', canonicalConcept: 'unrecognized', confidenceScore: 50, evidence: ['Cột rác'] }
      ],
      inferredEntities: [],
      workflowHints: [],
      relationshipHints: [],
      capabilities: [],
      opportunities: [],
      availableAnalysis: [],
      unavailableAnalysis: [],
      caveats: [],
      narrative: '',
      sourceTrace: {} as any,
      createdAt: new Date().toISOString()
    };

    const artifact = generateAdvancedHandoff(mockUnderstanding);
    
    expect(artifact.grain).toBe('unknown');
    expect(artifact.caveats.some(c => c.includes('could not be classified'))).toBe(true);
    expect(artifact.caveats.some(c => c.includes('grain is undetermined'))).toBe(true);
  });

  it('Scenario 4: readinessSummary.recommendation phải khớp với tier', () => {
    const mockUnderstanding: DatasetUnderstanding = {
      id: 'test4',
      status: 'understood',
      datasetName: 'Test',
      confidenceScore: 0,
      grain: 'unknown',
      grainEvidence: '',
      summary: {} as any,
      detectedConcepts: [],
      inferredEntities: [],
      workflowHints: [],
      relationshipHints: [],
      capabilities: [],
      opportunities: [],
      availableAnalysis: [],
      unavailableAnalysis: [],
      caveats: [],
      narrative: '',
      sourceTrace: {} as any,
      createdAt: new Date().toISOString(),
      readiness: {
        score: 40,
        tier: 'exploratory_only',
        reasonSummary: '',
        explanation: '',
        evidence: [],
        caveats: []
      }
    };

    const artifact = generateAdvancedHandoff(mockUnderstanding);
    expect(artifact.readinessSummary.recommendation).toContain('Use for exploration only');
  });
});
