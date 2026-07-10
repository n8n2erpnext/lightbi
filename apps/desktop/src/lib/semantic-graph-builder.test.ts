import { describe, it, expect } from 'vitest';
import { buildSemanticGraph } from './semantic-graph-builder';
import type { DatasetUnderstanding } from './dataset-understanding-contract';

describe('semantic-graph-builder', () => {
  it('builds a graph for delivery dataset', () => {
    const understanding = {
      detectedConcepts: [
        { signalId: 'report_date', label: 'Report Date', confidenceScore: 100 },
        { signalId: 'route', label: 'Route', confidenceScore: 100 },
        { signalId: 'driver', label: 'Driver', confidenceScore: 100 },
        { signalId: 'shipment', label: 'Shipment', confidenceScore: 100 },
        { signalId: 'satisfaction', label: 'Satisfaction', confidenceScore: 100 }
      ],
      availableAnalysis: [
        { dimensions: ['route'], measures: ['shipment'] }
      ],
      grain: 'event',
      relationshipHints: [],
      workflowHints: []
    } as unknown as DatasetUnderstanding;

    const graph = buildSemanticGraph(understanding);

    expect(graph.nodes.length).toBe(5);
    const routeNode = graph.nodes.find(n => n.id === 'route');
    expect(routeNode?.type).toBe('dimension');

    const dateNode = graph.nodes.find(n => n.id === 'report_date');
    expect(dateNode?.type).toBe('time');

    const shipmentNode = graph.nodes.find(n => n.id === 'shipment');
    expect(shipmentNode?.type).toBe('measure');

    expect(graph.edges.length).toBeGreaterThanOrEqual(1);
    expect(graph.edges[0].sourceId).toBe('route');
    expect(graph.edges[0].targetId).toBe('shipment');
    
    expect(graph.grain).toBe('event');
  });

  it('builds a graph for inventory dataset', () => {
    const understanding = {
      detectedConcepts: [
        { signalId: 'sku', label: 'SKU', confidenceScore: 100 },
        { signalId: 'warehouse', label: 'Warehouse', confidenceScore: 100 },
        { signalId: 'stock_age', label: 'Stock Age', confidenceScore: 100 },
        { signalId: 'stock_qty', label: 'Stock Qty', confidenceScore: 100 }
      ],
      grain: 'snapshot'
    } as unknown as DatasetUnderstanding;

    const graph = buildSemanticGraph(understanding);

    expect(graph.nodes.length).toBe(4);
    const ageNode = graph.nodes.find(n => n.id === 'stock_age');
    expect(ageNode?.type).toBe('measure');
    expect(graph.grain).toBe('snapshot');
  });

  it('handles empty understanding', () => {
    const understanding = {
      detectedConcepts: [],
      availableAnalysis: []
    } as unknown as DatasetUnderstanding;

    const graph = buildSemanticGraph(understanding);
    expect(graph.nodes.length).toBe(0);
    expect(graph.edges.length).toBe(0);
  });

  it('deduplicates edges correctly', () => {
    const understanding = {
      detectedConcepts: [
        { signalId: 'route', label: 'Route', confidenceScore: 100 },
        { signalId: 'shipment', label: 'Shipment', confidenceScore: 100 }
      ],
      availableAnalysis: [
        { dimensions: ['route'], measures: ['shipment'] },
        { dimensions: ['route'], measures: ['shipment'] } // duplicate co-occurrence
      ]
    } as unknown as DatasetUnderstanding;

    const graph = buildSemanticGraph(understanding);
    expect(graph.edges.length).toBe(1);
  });
});
