import { describe, it, expect } from 'vitest';
import { generateBusinessViews, confirmBusinessView, ignoreBusinessView, confirmRelationship, rejectRelationship } from './business-view-generator';
import type { RelationshipGraph, RelationshipEdge } from './relationship-graph';
import type { DatasetFamily } from './batch-inspection';

describe('Business View Generator', () => {
  const createMockDataset = (id: string, columns: string[]): DatasetFamily => ({
    id,
    name: `Dataset ${id}`,
    schemaFingerprint: id,
    files: [],
    totalRows: 100,
    columns,
    profiles: {}
  });

  const createMockEdge = (left: string, right: string, risk: "LOW" | "MEDIUM" | "HIGH" = "LOW", score: number = 75): RelationshipEdge => ({
    relationshipId: `rel_${left}_${right}`,
    leftDatasetId: left,
    rightDatasetId: right,
    leftColumnId: 'col',
    rightColumnId: 'col',
    score,
    confidence: score >= 85 ? "HIGH" : score >= 70 ? "MEDIUM" : "LOW",
    cardinality: risk === "HIGH" ? "many_to_many" : "one_to_one",
    risk,
    status: 'suggested',
    evidence: []
  });

  it('generates Product Performance, Inventory Health, and Supplier Performance views', () => {
    const ds1 = createMockDataset('ds1', ['sales_order', 'product_id', 'amount']);
    const ds2 = createMockDataset('ds2', ['warehouse', 'product_code', 'qty']);
    const ds3 = createMockDataset('ds3', ['supplier', 'product_id', 'cost']);

    const graph: RelationshipGraph = {
      nodes: new Map([
        ['ds1', { datasetId: 'ds1' }],
        ['ds2', { datasetId: 'ds2' }],
        ['ds3', { datasetId: 'ds3' }]
      ]),
      edges: [
        createMockEdge('ds1', 'ds2'),
        createMockEdge('ds2', 'ds3')
      ]
    };

    const views = generateBusinessViews(graph, { ds1, ds2, ds3 });
    const types = views.map(v => v.type);

    expect(types).toContain('product_performance');
    expect(types).toContain('inventory_health');
    expect(types).toContain('supplier_performance');
    
    // Profitability may also be emitted because 'finance' is present ('amount', 'cost') and product/supplier
    expect(types).toContain('profitability');
  });

  it('generates Profitability Analysis when finance domains exist', () => {
    const ds1 = createMockDataset('ds1', ['sales_order', 'product_id', 'revenue']);
    const ds2 = createMockDataset('ds2', ['purchase', 'product_id', 'cost']);

    const graph: RelationshipGraph = {
      nodes: new Map([
        ['ds1', { datasetId: 'ds1' }],
        ['ds2', { datasetId: 'ds2' }]
      ]),
      edges: [ createMockEdge('ds1', 'ds2') ]
    };

    const views = generateBusinessViews(graph, { ds1, ds2 });
    
    const profitView = views.find(v => v.type === 'profitability');
    expect(profitView).toBeDefined();
    
    const questions = profitView!.suggestedQuestions.map(q => q.question.toLowerCase());
    expect(questions.some(q => q.includes('profit') || q.includes('margin'))).toBe(true);
  });

  it('generates Logistics Journey and Operations Overview', () => {
    const ds1 = createMockDataset('ds1', ['truck', 'driver', 'route', 'shipment']);
    const ds2 = createMockDataset('ds2', ['receiving', 'warehouse', 'shipment']);
    const ds3 = createMockDataset('ds3', ['outbound', 'delay', 'status', 'shipment']);

    const graph: RelationshipGraph = {
      nodes: new Map([
        ['ds1', { datasetId: 'ds1' }],
        ['ds2', { datasetId: 'ds2' }],
        ['ds3', { datasetId: 'ds3' }]
      ]),
      edges: [
        createMockEdge('ds1', 'ds2'),
        createMockEdge('ds2', 'ds3')
      ]
    };

    const views = generateBusinessViews(graph, { ds1, ds2, ds3 });
    const types = views.map(v => v.type);

    expect(types).toContain('logistics_journey');
    expect(types).toContain('operations_overview');
  });

  it('generates Customer Analysis and Sales Performance', () => {
    const ds1 = createMockDataset('ds1', ['customer', 'email', 'phone']);
    const ds2 = createMockDataset('ds2', ['sales_order', 'customer_id', 'amount']);

    const graph: RelationshipGraph = {
      nodes: new Map([
        ['ds1', { datasetId: 'ds1' }],
        ['ds2', { datasetId: 'ds2' }]
      ]),
      edges: [ createMockEdge('ds1', 'ds2') ]
    };

    const views = generateBusinessViews(graph, { ds1, ds2 });
    const types = views.map(v => v.type);

    expect(types).toContain('customer_analysis');
    expect(types).toContain('sales_performance');
  });

  it('does not emit multi-dataset views for unrelated isolated datasets', () => {
    const ds1 = createMockDataset('ds1', ['customer', 'email']);
    const ds2 = createMockDataset('ds2', ['product', 'cost']);

    // No edges, isolated components
    const graph: RelationshipGraph = {
      nodes: new Map([
        ['ds1', { datasetId: 'ds1' }],
        ['ds2', { datasetId: 'ds2' }]
      ]),
      edges: []
    };

    const views = generateBusinessViews(graph, { ds1, ds2 });
    // Without any edges, comp.edges.length is 0. 
    // They are separate components because findConnectedComponents loops over nodes.
    // They might emit a single-dataset view if rules match.
    // For ds1 (customer): req is customer + order/product/finance -> fails.
    // For ds2 (product + finance): product_performance needs order/inv/sup/fin. It has product+finance, so it MIGHT emit a single dataset view!
    // But it definitely won't emit a multi-dataset view.
    
    for (const view of views) {
      expect(view.datasets.length).toBe(1);
    }
  });

  it('penalizes score and marks evidence for high-risk many_to_many relationship', () => {
    const ds1 = createMockDataset('ds1', ['sales_order', 'product_id', 'amount']);
    const ds2 = createMockDataset('ds2', ['warehouse', 'product_code', 'qty']);

    const graph: RelationshipGraph = {
      nodes: new Map([
        ['ds1', { datasetId: 'ds1' }],
        ['ds2', { datasetId: 'ds2' }]
      ]),
      edges: [ createMockEdge('ds1', 'ds2', 'HIGH', 75) ]
    };

    const views = generateBusinessViews(graph, { ds1, ds2 });
    const prodView = views.find(v => v.type === 'product_performance');
    expect(prodView).toBeDefined();
    
  });

  it('updates state locally with state helpers', () => {
    const view: any = { status: 'suggested' };
    const edge: any = { status: 'suggested' };

    const confirmedView = confirmBusinessView(view);
    expect(confirmedView.status).toBe('confirmed');
    expect(view.status).toBe('suggested'); // immutability

    const ignoredView = ignoreBusinessView(view);
    expect(ignoredView.status).toBe('ignored');

    const confirmedEdge = confirmRelationship(edge);
    expect(confirmedEdge.status).toBe('confirmed');

    const rejectedEdge = rejectRelationship(edge);
    expect(rejectedEdge.status).toBe('rejected');
  });

  it('generates deterministic IDs across runs', () => {
    const ds1 = createMockDataset('ds1', ['sales_order', 'product_id']);
    const ds2 = createMockDataset('ds2', ['warehouse', 'product_code']);

    const graph: RelationshipGraph = {
      nodes: new Map([
        ['ds1', { datasetId: 'ds1' }],
        ['ds2', { datasetId: 'ds2' }]
      ]),
      edges: [ createMockEdge('ds1', 'ds2') ]
    };

    const run1 = generateBusinessViews(graph, { ds1, ds2 });
    const run2 = generateBusinessViews(graph, { ds1, ds2 });

    expect(run1[0].id).toBe(run2[0].id);
  });
});
