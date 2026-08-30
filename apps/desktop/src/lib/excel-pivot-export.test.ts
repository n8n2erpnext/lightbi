import * as XLSX from 'xlsx';
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { CleanDataHandoffResultV1 } from './clean-data-handoff';
import { createDecisionVisualizationPlan } from './decision-visualization-plan';
import { createExcelPivotWorkbook, resolveExcelPivotRecipe } from './excel-pivot-export';

function cleanData(): CleanDataHandoffResultV1 {
  return {
    artifact: {
      schemaVersion: 'lightbi.clean-data-handoff.v1', artifactId: 'clean:test', createdAt: '2026-08-31T00:00:00.000Z',
      source: { sourceId: 'source:sales', sourceName: 'sales.xlsx', sourceFingerprint: 'fp', sourceRows: 3, sourceColumns: 5, sourcePreserved: true },
      grain: { structuralForm: 'transactional_rows', identityBasis: 'order_id', temporalMode: 'event', aggregationForm: 'row_level', readiness: 'ready' },
      lineage: [
        { sourceColumn: 'Product', outputColumn: 'product', physicalType: 'string', semanticConcept: 'product', semanticState: 'resolved', nullable: false, qualityIssues: [], transformations: ['preserve_value', 'canonical_name'] },
        { sourceColumn: 'SKU', outputColumn: 'sku', physicalType: 'string', semanticConcept: 'sku', semanticState: 'resolved', nullable: false, qualityIssues: [], transformations: ['preserve_value', 'canonical_name'] },
        { sourceColumn: 'Revenue', outputColumn: 'revenue', physicalType: 'number', semanticConcept: 'revenue', semanticState: 'resolved', nullable: false, qualityIssues: [], transformations: ['preserve_value', 'canonical_name'] },
        { sourceColumn: 'Category', outputColumn: 'category', physicalType: 'string', semanticConcept: 'category', semanticState: 'resolved', nullable: false, qualityIssues: [], transformations: ['preserve_value', 'canonical_name'] },
        { sourceColumn: 'Report Date', outputColumn: 'report_date', physicalType: 'string', semanticConcept: 'report_date', semanticState: 'resolved', nullable: false, qualityIssues: [], transformations: ['preserve_value', 'canonical_name'] },
      ],
      candidateKeys: ['sku'], qualityCaveats: [], auditTrail: [],
      output: { rowCount: 3, columnCount: 5, powerBiReady: true, originalRowsMutated: false },
    },
    cleanRows: [
      { product: 'TV', sku: 'TV-1', revenue: 100, category: 'Electronics', report_date: '2026-06-01' },
      { product: 'Phone', sku: 'PH-1', revenue: 200, category: 'Electronics', report_date: '2026-06-02' },
      { product: 'TV', sku: 'TV-2', revenue: 150, category: 'Electronics', report_date: '2026-06-03' },
    ],
  };
}

const action = {
  id: 'action-sales-by-product', opportunityName: 'Which products contribute the most sales revenue?', label: 'Sales by product',
  description: 'Compare sales by product', actionType: 'group_by' as const, dimensions: ['product'], measures: ['sales_revenue'],
  confidenceScore: 100, source: 'dataset_understanding' as const,
};

function decisionPlan() {
  return createDecisionVisualizationPlan({ perspectiveId: action.id, sourceCount: 1, dimensionField: 'Product', metricIds: ['sales_revenue'], rows: [{ Product: 'TV', sales_revenue: 250 }] });
}

describe('Excel Pivot export', () => {
  it('resolves the governed perspective to cleaned semantic fields without hard-coded display headers', () => {
    const recipe = resolveExcelPivotRecipe({ title: action.opportunityName, action, cleanData: cleanData(), decisionVisualizationPlan: decisionPlan() });
    expect(recipe.perspectiveId).toBe(action.id);
    expect(recipe.rowFields).toEqual(['product', 'sku']);
    expect(recipe.valueField).toBe('revenue');
    expect(recipe.aggregation).toBe('sum');
    expect(recipe.columnFields).toEqual([]);
    expect(recipe.filterFields).toEqual(expect.arrayContaining(['report_date', 'category']));
  });

  it('creates a native editable PivotTable, PivotCache and Excel Table over the full cleaned source', () => {
    const generated = createExcelPivotWorkbook({ mode: 'full', title: action.opportunityName, action, cleanData: cleanData(), decisionVisualizationPlan: decisionPlan(), createdAt: '2026-08-31T00:00:00.000Z' });
    expect(generated.exportedRowCount).toBe(3);
    const files = unzipSync(new Uint8Array(generated.buffer));
    expect(files['xl/pivotTables/pivotTable1.xml']).toBeTruthy();
    expect(files['xl/pivotCache/pivotCacheDefinition1.xml']).toBeTruthy();
    expect(files['xl/pivotCache/pivotCacheRecords1.xml']).toBeTruthy();
    expect(files['xl/tables/table1.xml']).toBeTruthy();
    const pivotXml = strFromU8(files['xl/pivotTables/pivotTable1.xml']);
    expect(pivotXml).toContain('<colFields count="0">');
    expect(pivotXml).toContain('name="Sum of revenue"');
    expect(strFromU8(files['xl/tables/table1.xml'])).toContain('name="LightBI_Data"');
    expect(strFromU8(files['xl/pivotCache/pivotCacheRecords1.xml'])).toContain('count="3"');
    const workbook = XLSX.read(generated.buffer, { type: 'array' });
    expect(XLSX.utils.sheet_to_json(workbook.Sheets.Data)).toHaveLength(3);
  });

  it('rejects Excel row overflow before attempting to clone the full source', () => {
    const oversized = cleanData();
    oversized.cleanRows = { length: 1_048_576 } as unknown as Record<string, unknown>[];
    expect(() => createExcelPivotWorkbook({ mode: 'full', title: action.opportunityName, action, cleanData: oversized, decisionVisualizationPlan: decisionPlan() })).toThrow('EXCEL_PIVOT_ROW_LIMIT:1048576');
  });

  it('uses only the selected drill rows for current-selection mode while preserving canonical cleaned headers', () => {
    const generated = createExcelPivotWorkbook({
      mode: 'current_selection', title: action.opportunityName, action, cleanData: cleanData(), decisionVisualizationPlan: decisionPlan(),
      selectedRows: [{ Product: ' TV ', SKU: 'TV-1', Revenue: 100, Category: 'Electronics', 'Report Date': '2026-06-01' }],
      appliedFilters: [{ column: 'Product', operator: '=', value: 'TV' }], createdAt: '2026-08-31T00:00:00.000Z',
    });
    expect(generated.exportedRowCount).toBe(1);
    const workbook = XLSX.read(generated.buffer, { type: 'array' });
    expect(XLSX.utils.sheet_to_json(workbook.Sheets.Data)).toEqual([{ product: 'TV', sku: 'TV-1', revenue: 100, category: 'Electronics', report_date: '2026-06-01' }]);
    const about = XLSX.utils.sheet_to_json<Array<string | number>>(workbook.Sheets.About, { header: 1 });
    expect(about).toContainEqual(['Export mode', 'Current selection']);
    expect(about).toContainEqual(['Current LightBI filters', 'Product = TV']);
  });

  it('fails closed instead of presetting AVG/non-additive measures as SUM', () => {
    const quality = cleanData();
    quality.artifact.lineage[2] = { ...quality.artifact.lineage[2], sourceColumn: 'Quality Score', outputColumn: 'quality_score', semanticConcept: 'quality_score' };
    const qualityAction = { ...action, id: 'quality', dimensions: ['product'], measures: ['average_quality_score'], measureAggregations: { average_quality_score: 'AVG' as const } };
    expect(() => resolveExcelPivotRecipe({ title: 'Quality', action: qualityAction, cleanData: quality, decisionVisualizationPlan: null })).toThrow('EXCEL_PIVOT_NO_SAFE_VALUE_FIELD');
  });


  it('does not let an action-level SUM override governed semi-additive inventory semantics', () => {
    const inventory = cleanData();
    inventory.artifact.lineage[2] = { ...inventory.artifact.lineage[2], sourceColumn: 'Stock Qty', outputColumn: 'stock_qty', semanticConcept: 'stock_qty' };
    const inventoryAction = { ...action, id: 'inventory', dimensions: ['product'], measures: ['inventory_on_hand'], measureAggregations: { inventory_on_hand: 'SUM' as const } };
    expect(() => resolveExcelPivotRecipe({ title: 'Inventory', action: inventoryAction, cleanData: inventory, decisionVisualizationPlan: null })).toThrow('EXCEL_PIVOT_NO_SAFE_VALUE_FIELD');
  });
});
