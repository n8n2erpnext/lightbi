import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { createAnalysisWorkbookPlan, createExcelAnalysisWorkbook, createSingleSourceDeepAnalysisWorkbookPlan } from './analysis-workbook';
import { createDecisionVisualizationPlan } from './decision-visualization-plan';

const evidence = [
  { sourceName: 'sales-2026-05.xlsx', role: 'sales', period: '2026-05', sourceRowCount: 2, rows: [{ OrderID: 'A-1', Revenue: 100 }, { OrderID: 'A-2', Revenue: 120 }] },
  { sourceName: 'accounting-2026-05.xlsx', role: 'accounting', period: '2026-05', sourceRowCount: 2, rows: [{ OrderID: 'A-1', Cost: 60 }, { OrderID: 'A-2', Cost: 70 }] },
];

describe('Excel Analysis Workbook', () => {
  it('packages governed metric results while keeping multi-source evidence separate', () => {
    const decisionVisualizationPlan = createDecisionVisualizationPlan({
      perspectiveId: 'profitability', sourceCount: 2, dimensionField: 'reporting_period',
      rows: [{ reporting_period: '2026-05', gross_profit: 90 }],
    });
    const plan = createAnalysisWorkbookPlan({
      title: 'Profitability', perspectiveId: 'profitability', sourceCount: 2,
      summaryRows: [{ reporting_period: '2026-05', gross_profit: 90 }],
      decisionVisualizationPlan,
      evidenceSources: evidence,
      selectedScope: { period: '2026-05', metricId: 'gross_profit' },
      findings: ['Gross profit is positive.'], caveats: ['Correlation is not causation.'],
      notes: ['Metric rows come from the governed LightBI result.'], createdAt: '2026-08-30T00:00:00.000Z',
    });

    expect(plan.combinationPolicy).toBe('governed_metric_results_only');
    expect(plan.tables.filter(table => table.kind === 'evidence')).toHaveLength(2);
    expect(plan.tables.some(table => /combined raw/i.test(table.title))).toBe(false);

    const workbook = XLSX.read(createExcelAnalysisWorkbook(plan), { type: 'array' });
    expect(workbook.SheetNames).toEqual([
      'Analysis Overview', 'Analysis Summary', 'Pivot View', 'Evidence sales 2026-05', 'Evidence accounting 2026-05', 'Source Lineage', 'Decision Notes',
    ]);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets['Analysis Summary'])).toEqual([{ reporting_period: '2026-05', gross_profit: 90 }]);
    expect(workbook.Sheets['Pivot View']['B2']?.f).toBe("'Analysis Summary'!B2");
    expect(XLSX.utils.sheet_to_json<Array<string | number>>(workbook.Sheets['Pivot View'], { header: 1 })[0]).toEqual(['Governed metric', '2026-05']);
    expect(workbook.Sheets['Analysis Summary']['!autofilter']?.ref).toBe('A1:B2');
    expect(workbook.Sheets['Pivot View']['!autofilter']?.ref).toBe('A1:B2');
    expect(XLSX.utils.sheet_to_json(workbook.Sheets['Evidence sales 2026-05'])).toHaveLength(2);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets['Evidence accounting 2026-05'])).toHaveLength(2);
    const overview = XLSX.utils.sheet_to_json<Array<string | number>>(workbook.Sheets['Analysis Overview'], { header: 1 });
    expect(overview).toContainEqual(['Combination policy', 'governed_metric_results_only']);
    expect(overview).toContainEqual(['Raw multi-source join', 'Prohibited']);
    expect(overview).toContainEqual(['Pivot implementation', 'Formula-driven governed summary; native PivotTable/PivotChart is not embedded by the current CE writer']);
    expect(overview).toContainEqual(['Decision plan version', 'lightbi.decision-visualization-plan.v1']);
    expect(overview).toContainEqual(['Decision plan ID', decisionVisualizationPlan.planId]);
  });

  it('uses single-source policy without inventing a multi-source restriction', () => {
    const plan = createAnalysisWorkbookPlan({
      title: 'Sales snapshot', perspectiveId: 'revenue', sourceCount: 1,
      summaryRows: [{ reporting_period: '2026-06', sales_revenue: 250 }],
      evidenceSources: [evidence[0]], createdAt: '2026-08-30T00:00:00.000Z',
    });
    expect(plan.combinationPolicy).toBe('single_source');
    const workbook = XLSX.read(createExcelAnalysisWorkbook(plan), { type: 'array' });
    const overview = XLSX.utils.sheet_to_json<Array<string | number>>(workbook.Sheets['Analysis Overview'], { header: 1 });
    expect(overview).toContainEqual(['Raw multi-source join', 'Not applicable']);
  });
  it('adds clean canonical data and lineage when a Datasets handoff is supplied', () => {
    const plan = createAnalysisWorkbookPlan({
      title: 'Sales analysis', perspectiveId: 'revenue', sourceCount: 1,
      summaryRows: [{ reporting_period: '2026-06', sales_revenue: 250 }],
      evidenceSources: [evidence[0]], createdAt: '2026-08-30T00:00:00.000Z',
    });
    const cleanData = {
      artifact: {
        schemaVersion: 'lightbi.clean-data-handoff.v1' as const, artifactId: 'clean:test', createdAt: '2026-08-30T00:00:00.000Z',
        source: { sourceId: 'file:sales', sourceName: 'sales.xlsx', sourceFingerprint: 'abc', sourceRows: 2, sourceColumns: 2, sourcePreserved: true as const },
        grain: { structuralForm: 'transactional_rows', identityBasis: 'order_id', temporalMode: 'single_period', aggregationForm: 'row_level', readiness: 'ready' },
        lineage: [
          { sourceColumn: 'Order ID', outputColumn: 'order_id', physicalType: 'string', semanticConcept: 'order_id', semanticState: 'resolved', nullable: false, qualityIssues: [], transformations: ['preserve_value' as const, 'canonical_name' as const] },
          { sourceColumn: 'Revenue', outputColumn: 'sales_revenue', physicalType: 'number', semanticConcept: 'sales_revenue', semanticState: 'resolved', nullable: false, qualityIssues: [], transformations: ['preserve_value' as const, 'canonical_name' as const] },
        ],
        candidateKeys: ['order_id'], qualityCaveats: [],
        auditTrail: [{ operation: 'canonical_name' as const, column: 'order_id', affectedValues: 2 }],
        output: { rowCount: 2, columnCount: 2, powerBiReady: true as const, originalRowsMutated: false as const },
      },
      cleanRows: [{ order_id: 'A-1', sales_revenue: 100 }, { order_id: 'A-2', sales_revenue: 150 }],
    };
    const workbook = XLSX.read(createExcelAnalysisWorkbook(plan, { cleanData }), { type: 'array' });
    expect(workbook.SheetNames).toContain('Pivot View');
    expect(workbook.SheetNames).toContain('Clean Data');
    expect(workbook.SheetNames).toContain('Data Dictionary');
    expect(workbook.SheetNames).toContain('Transformation Audit');
    expect(workbook.SheetNames).toContain('Clean Handoff Manifest');
    expect(XLSX.utils.sheet_to_json(workbook.Sheets['Clean Data'])).toHaveLength(2);
    const overview = XLSX.utils.sheet_to_json<Array<string | number>>(workbook.Sheets['Analysis Overview'], { header: 1 });
    expect(overview).toContainEqual(['Clean canonical data attached', 'Yes']);
  });

  it('builds single-source Deep BA summary from computed KPIs and only emits evidence for selected drill rows', () => {
    const decisionPlan = createDecisionVisualizationPlan({ perspectiveId: 'inventory', sourceCount: 1, dimensionField: 'Store', metricIds: ['stock_qty'], rows: [{ Store: 'A', stock_qty: 12 }] });
    const plan = createSingleSourceDeepAnalysisWorkbookPlan({
      title: 'Stock by store', perspectiveId: 'inventory', resultId: 'result_1',
      chartRows: [{ Store: 'A', stock_qty: 12 }],
      kpis: [{ id: 'stock_qty', value: 12 }, { id: 'record_count', value: 1 }],
      evidence: { rows: [{ Store: 'A', Stock: 12 }], sourceResultRowCount: 3, label: 'Store = A', truncated: false },
      findings: ['Store A contains 12 units.'], recommendedActions: ['Review replenishment.'], caveats: ['Selected row scope only.'],
      decisionVisualizationPlan: decisionPlan,
      createdAt: '2026-08-30T00:00:00.000Z',
    });
    expect(plan.combinationPolicy).toBe('single_source');
    expect(plan.decisionVisualizationPlan?.planId).toBe(decisionPlan.planId);
    expect(plan.tables[0].rows).toEqual([{ stock_qty: 12, record_count: 1 }]);
    expect(plan.tables.filter(table => table.kind === 'evidence')).toHaveLength(1);
    expect(plan.sources[0]).toMatchObject({ sourceName: 'Result result_1', role: 'selected_result_evidence', sourceRowCount: 3 });

    const noEvidence = createSingleSourceDeepAnalysisWorkbookPlan({
      title: 'Stock by store', perspectiveId: 'inventory', resultId: 'result_1',
      chartRows: [{ Store: 'A', stock_qty: 12 }], createdAt: '2026-08-30T00:00:00.000Z',
    });
    expect(noEvidence.tables.filter(table => table.kind === 'evidence')).toHaveLength(0);
    expect(noEvidence.sources).toHaveLength(0);
  });

  it('uses bounded content-aware widths and autofilters for Excel usability without changing analysis truth', () => {
    const plan = createAnalysisWorkbookPlan({
      title: 'Long label analysis', perspectiveId: 'revenue', sourceCount: 1,
      summaryRows: [{ reporting_period: '2026-06', narrative_metric: 'A deliberately longer governed display value for Excel' }],
      createdAt: '2026-08-30T00:00:00.000Z',
    });
    const workbook = XLSX.read(createExcelAnalysisWorkbook(plan), { type: 'array', cellStyles: true });
    const summary = workbook.Sheets['Analysis Summary'];
    expect(summary['!autofilter']?.ref).toBe('A1:B2');
    expect(summary['!cols']?.[1]?.wch ?? 0).toBeGreaterThan('narrative_metric'.length + 2);
    expect(summary['!cols']?.[1]?.wch ?? 0).toBeLessThanOrEqual(48);
    expect(XLSX.utils.sheet_to_json(summary)).toEqual([{ reporting_period: '2026-06', narrative_metric: 'A deliberately longer governed display value for Excel' }]);
  });

});
