import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { createBusinessBrainBrief } from './business-brain-brief';
import type { AnalysisAction } from './analysis-opportunity-actions';
import { createBusinessFusionOverview } from './business-fusion-overview';
import type { BusinessFusionOverview } from './business-fusion-overview';
import type { ChartPreviewModel } from './chart-preview-model';
import type { DatasetFamily } from './batch-inspection';
import type { SourceInspectionResult, SourceType } from './source-preflight';

function action(overrides: Partial<AnalysisAction>): AnalysisAction {
  return {
    id: 'action_test',
    opportunityName: 'Money over time',
    label: 'Money over time',
    description: 'Analyze money movement.',
    actionType: 'trend',
    dimensions: ['period'],
    measures: ['revenue'],
    confidenceScore: 90,
    source: 'dataset_understanding',
    ...overrides
  };
}

function chart(overrides: Partial<ChartPreviewModel>): ChartPreviewModel {
  return {
    id: 'chart_test',
    sourceResultId: 'preview_test',
    status: 'ready',
    chartType: 'bar',
    title: 'Money over time',
    xField: 'period',
    yField: 'revenue',
    seriesFields: [],
    rows: [
      { period: '2026-05', revenue: 100 },
      { period: '2026-06', revenue: 80 }
    ],
    warnings: [],
    source: 'duckdb_preview_result',
    ...overrides
  };
}

function overview(overrides: Partial<BusinessFusionOverview> = {}): BusinessFusionOverview {
  return {
    status: 'ready',
    title: 'Business fusion',
    periodLabels: ['2026-05', '2026-06'],
    objectKeys: [],
    sources: [],
    metrics: [
      {
        metricId: 'revenue',
        label: 'Revenue',
        previousValue: 100,
        currentValue: 80,
        delta: -20,
        deltaPercent: -0.2,
        sourceRole: 'accounting'
      },
      {
        metricId: 'delivery_fee',
        label: 'Delivery fee',
        previousValue: 10,
        currentValue: 14,
        delta: 4,
        deltaPercent: 0.4,
        sourceRole: 'logistics'
      }
    ],
    topGrowthDrivers: [],
    topDeclineDrivers: [
      {
        key: 'Product A',
        dimension: 'product',
        metricId: 'revenue',
        previousValue: 70,
        currentValue: 40,
        delta: -30,
        deltaPercent: -0.43
      }
    ],
    topProfitDrivers: [],
    crossChecks: [],
    reconciliationChecks: [],
    narrativeSections: [],
    riskSignals: [],
    executiveSummary: 'Revenue decreased.',
    caveats: [],
    readinessScore: 90,
    ...overrides
  };
}

function readSampleRows(path: string): Record<string, unknown>[] {
  const workbook = XLSX.readFile(path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null }).map(row => {
    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key.replace(/^\uFEFF/, ''), value])
    );
  });
}

function sampleFamily(id: string, name: string, files: Array<{ name: string; path: string; sourceType: SourceType }>): DatasetFamily {
  const parsed = files.map(item => {
    const rows = readSampleRows(item.path);
    const columns = Object.keys(rows[0] ?? {});
    const result: SourceInspectionResult = {
      status: 'accessible',
      sourceType: item.sourceType,
      label: item.name,
      normalizedUrl: item.path,
      metadata: {
        name: item.name,
        rows_count: rows.length,
        columns,
        preview_rows: rows.slice(0, 100),
        analysis_rows: rows
      }
    };

    return {
      file: new File([''], item.name),
      result,
      rows,
      columns
    };
  });

  return {
    id,
    name,
    schemaFingerprint: id,
    totalRows: parsed.reduce((sum, item) => sum + item.rows.length, 0),
    columns: parsed[0]?.columns ?? [],
    profiles: {},
    files: parsed.map(({ file, result }) => ({ file, result }))
  };
}

function sampleFamilies(): DatasetFamily[] {
  return [
    sampleFamily('sales_reports', 'Sales ERP Reports', [
      { name: 'Sales_ERP_May_2026.xlsx', path: '../../sample data/Sales_ERP_May_2026.xlsx', sourceType: 'local_xlsx' },
      { name: 'Sales_ERP_June_2026.xlsx', path: '../../sample data/Sales_ERP_June_2026.xlsx', sourceType: 'local_xlsx' }
    ]),
    sampleFamily('accounting_reports', 'Accounting ERP Reports', [
      { name: 'Accounting_ERP_May_2026.csv', path: '../../sample data/Accounting_ERP_May_2026.csv', sourceType: 'local_csv' },
      { name: 'Accounting_ERP_June_2026.csv', path: '../../sample data/Accounting_ERP_June_2026.csv', sourceType: 'local_csv' }
    ]),
    sampleFamily('logistics_reports', 'Logistics ERP Reports', [
      { name: 'Logistics_ERP_May_2026.csv', path: '../../sample data/Logistics_ERP_May_2026.csv', sourceType: 'local_csv' },
      { name: 'Logistics_ERP_June_2026.csv', path: '../../sample data/Logistics_ERP_June_2026.csv', sourceType: 'local_csv' }
    ])
  ];
}

function toNumeric(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(/[^0-9,.-]/g, '').replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function groupByDimension(rows: Record<string, unknown>[], dimension: string, measures: string[]): Record<string, unknown>[] {
  const grouped = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const key = String(row[dimension] ?? '(empty)');
    const target = grouped.get(key) ?? { [dimension]: key, row_count: 0 };
    target.row_count = toNumeric(target.row_count) + 1;
    for (const measure of measures) {
      target[measure] = toNumeric(target[measure]) + toNumeric(row[measure]);
    }
    grouped.set(key, target);
  }
  return [...grouped.values()];
}

function familyAnalysisRows(family: DatasetFamily | undefined): Record<string, unknown>[] {
  if (!family) return [];
  return family.files.flatMap(file => {
    return file.result.status === 'accessible' ? file.result.metadata.analysis_rows ?? [] : [];
  });
}

describe('business brain brief', () => {
  it('creates an angle-first money brief with KPI and root cause evidence', () => {
    const brief = createBusinessBrainBrief({
      action: action({ opportunityName: 'Money over time' }),
      chartModel: chart({}),
      overview: overview()
    });

    expect(brief.intent).toBe('money');
    expect(brief.kpis.some(kpi => kpi.id === 'revenue')).toBe(true);
    expect(brief.rootCauses[0]?.label).toContain('Decline driver');
    expect(brief.narrative.businessQuestion).toContain('money movement');
  });

  it('marks logistics investment analysis as partial and lists missing fleet evidence', () => {
    const brief = createBusinessBrainBrief({
      action: action({
        opportunityName: 'Internal vs outsourced delivery',
        label: 'Carrier delivery fee impact',
        description: 'Analyze delivery fee by carrier and delivery status.',
        actionType: 'group_by',
        dimensions: ['Carrier'],
        measures: ['DeliveryFee']
      }),
      chartModel: chart({
        title: 'Delivery fee by carrier',
        xField: 'Carrier',
        yField: 'DeliveryFee',
        rows: [
          { Carrier: 'Nội bộ', DeliveryFee: 100 },
          { Carrier: 'Xe tải thuê ngoài', DeliveryFee: 300 }
        ]
      }),
      overview: overview()
    });

    expect(brief.intent).toBe('logistics');
    expect(brief.readiness).toBe('partial');
    expect(brief.missingEvidence.map(item => item.id)).toContain('missing_fleet_investment_inputs');
    expect(brief.recommendations.some(item => item.type === 'need_more_data')).toBe(true);
  });

  it('keeps payment reports focused on payment mix, receivable, and profit signals from the selected chart', () => {
    const brief = createBusinessBrainBrief({
      action: action({
        opportunityName: 'Payment mix and cash-flow exposure',
        label: 'Payment profitability and receivable mix',
        description: 'Compare payment methods by revenue, receivable, and gross profit.',
        actionType: 'group_by',
        dimensions: ['Payment'],
        measures: ['NetRevenue', 'AR_Debit', 'GrossProfit']
      }),
      chartModel: chart({
        title: 'Payment mix and cash-flow exposure',
        xField: 'Payment',
        yField: 'NetRevenue',
        seriesFields: ['NetRevenue', 'AR_Debit', 'GrossProfit'],
        rows: [
          { Payment: 'Cash', NetRevenue: 120, AR_Debit: 0, GrossProfit: 30 },
          { Payment: 'Installment', NetRevenue: 80, AR_Debit: 50, GrossProfit: 15 }
        ]
      }),
      overview: overview()
    });

    expect(brief.intent).toBe('payment');
    expect(brief.kpis.map(kpi => kpi.id)).toContain('payment_receivable_exposure');
    expect(brief.kpis.map(kpi => kpi.id)).toContain('payment_profit_signal');
    expect(brief.rootCauses[0]?.label).toContain('payment driver');
    expect(brief.missingEvidence.map(item => item.id)).not.toContain('missing_profit_signal');
  });

  it('keeps logistics reports focused on carrier share and delivery fee evidence from the selected chart', () => {
    const brief = createBusinessBrainBrief({
      action: action({
        opportunityName: 'Carrier cost impact',
        label: 'Internal vs outsourced carrier fee',
        description: 'Compare internal fleet and external carrier delivery fee.',
        actionType: 'group_by',
        dimensions: ['Carrier'],
        measures: ['DeliveryFee']
      }),
      chartModel: chart({
        title: 'Carrier cost impact',
        xField: 'Carrier',
        yField: 'DeliveryFee',
        seriesFields: ['DeliveryFee'],
        rows: [
          { Carrier: 'Internal fleet', DeliveryFee: 100 },
          { Carrier: 'Third-party carrier', DeliveryFee: 300 }
        ]
      }),
      overview: overview()
    });

    expect(brief.intent).toBe('logistics');
    expect(brief.kpis.map(kpi => kpi.id)).toContain('internal_carrier_share');
    expect(brief.kpis.map(kpi => kpi.id)).toContain('external_carrier_share');
    expect(brief.kpis.map(kpi => kpi.id)).toContain('total_delivery_fee');
    expect(brief.rootCauses[0]?.label).toContain('carrier driver');
    expect(brief.missingEvidence.map(item => item.id)).not.toContain('missing_delivery_fee');
    expect(brief.missingEvidence.map(item => item.id)).toContain('missing_fleet_investment_inputs');
  });

  it('computes canonical KPI formulas, period variance, and margin risk from chart fields', () => {
    const brief = createBusinessBrainBrief({
      action: action({
        opportunityName: 'Profitability trend',
        label: 'Profitability trend',
        description: 'Compare revenue, gross profit, and delivery fee by period.',
        actionType: 'trend',
        dimensions: ['period'],
        measures: ['NetRevenue', 'GrossProfit', 'DeliveryFee']
      }),
      chartModel: chart({
        title: 'Profitability trend',
        chartType: 'line',
        xField: 'period',
        yField: 'NetRevenue',
        seriesFields: ['NetRevenue', 'GrossProfit', 'DeliveryFee'],
        rows: [
          { period: '2026-05', NetRevenue: 1000, GrossProfit: 160, DeliveryFee: 40 },
          { period: '2026-06', NetRevenue: 800, GrossProfit: 60, DeliveryFee: 90 }
        ]
      }),
      overview: overview()
    });

    expect(brief.kpis.find(kpi => kpi.id === 'net_revenue')?.formula).toBe('sum(net revenue)');
    expect(brief.kpis.find(kpi => kpi.id === 'margin_pct')?.value).toBeCloseTo(220 / 1800);
    expect(brief.kpis.map(kpi => kpi.id)).toContain('delivery_fee_to_revenue');
    expect(brief.variance[0]?.id).toBe('variance_net_revenue');
    expect(brief.variance[0]?.delta).toBe(-200);
    expect(brief.risks.map(risk => risk.id)).toContain('delivery_fee_pressure');
  });

  it('detects deferred payment and receivable risks without sample-specific values', () => {
    const brief = createBusinessBrainBrief({
      action: action({
        opportunityName: 'Payment mix and cash-flow exposure',
        label: 'Payment mix',
        description: 'Compare payment methods by net revenue and receivable exposure.',
        actionType: 'group_by',
        dimensions: ['PaymentMethod'],
        measures: ['NetRevenue', 'AR_Debit']
      }),
      chartModel: chart({
        title: 'Payment mix',
        xField: 'PaymentMethod',
        yField: 'NetRevenue',
        seriesFields: ['NetRevenue', 'AR_Debit'],
        rows: [
          { PaymentMethod: 'Cash', NetRevenue: 100, AR_Debit: 0 },
          { PaymentMethod: 'Deferred credit', NetRevenue: 100, AR_Debit: 90 }
        ]
      }),
      overview: overview({ metrics: [] })
    });

    expect(brief.kpis.map(kpi => kpi.id)).toContain('deferred_payment_share');
    expect(brief.risks.map(risk => risk.id)).toContain('high_deferred_payment_share');
    expect(brief.risks.map(risk => risk.id)).toContain('high_ar_exposure');
    expect(brief.recommendations.some(item => item.title === 'Review collection and payment terms')).toBe(true);
  });

  it('builds adaptive root-cause drilldown across available business dimensions', () => {
    const brief = createBusinessBrainBrief({
      action: action({
        opportunityName: 'Profitability performance',
        label: 'Profit by business drivers',
        description: 'Explain profit by product, category, store, payment, and carrier.',
        actionType: 'group_by',
        dimensions: ['Product'],
        measures: ['GrossProfit']
      }),
      chartModel: chart({
        title: 'Profit by business drivers',
        xField: 'Product',
        yField: 'GrossProfit',
        seriesFields: ['GrossProfit', 'Category', 'Store', 'PaymentMethod', 'Carrier'],
        rows: [
          { Product: 'A', Category: 'Appliance', Store: 'North', PaymentMethod: 'Cash', Carrier: 'Internal fleet', GrossProfit: 40 },
          { Product: 'B', Category: 'Appliance', Store: 'South', PaymentMethod: 'Deferred credit', Carrier: 'Third-party carrier', GrossProfit: 90 },
          { Product: 'B', Category: 'Appliance', Store: 'South', PaymentMethod: 'Deferred credit', Carrier: 'Third-party carrier', GrossProfit: 60 }
        ]
      }),
      overview: overview()
    });

    expect(brief.rootCauses.map(cause => cause.level)).toEqual(expect.arrayContaining(['product', 'category', 'store', 'payment', 'carrier']));
    expect(brief.rootCauses.find(cause => cause.level === 'product')?.label).toContain('B');
    expect(brief.narrative.sections.find(section => section.title === 'Root cause')?.body).toContain('drill path');
  });

  it('creates a do-now recommendation when evidence is complete and high-risk blockers are absent', () => {
    const brief = createBusinessBrainBrief({
      action: action({
        opportunityName: 'Revenue by product',
        label: 'Revenue by product',
        description: 'Rank product revenue.',
        actionType: 'group_by',
        dimensions: ['Product'],
        measures: ['NetRevenue', 'GrossProfit']
      }),
      chartModel: chart({
        title: 'Revenue by product',
        xField: 'Product',
        yField: 'NetRevenue',
        seriesFields: ['NetRevenue', 'GrossProfit'],
        rows: [
          { Product: 'A', NetRevenue: 1000, GrossProfit: 400 },
          { Product: 'B', NetRevenue: 800, GrossProfit: 300 }
        ]
      }),
      overview: overview({ metrics: [] })
    });

    expect(brief.recommendations.map(item => item.type)).toContain('do_now');
  });

  it('computes plan variance and suggests next questions for follow-up analysis', () => {
    const brief = createBusinessBrainBrief({
      action: action({
        opportunityName: 'Revenue plan tracking',
        label: 'Revenue vs target',
        description: 'Compare actual revenue with target and explain the gap.',
        actionType: 'trend',
        dimensions: ['period'],
        measures: ['ActualRevenue', 'TargetRevenue']
      }),
      chartModel: chart({
        title: 'Revenue vs target',
        xField: 'period',
        yField: 'ActualRevenue',
        seriesFields: ['ActualRevenue', 'TargetRevenue', 'Store'],
        rows: [
          { period: '2026-05', Store: 'North', ActualRevenue: 100, TargetRevenue: 120 },
          { period: '2026-06', Store: 'South', ActualRevenue: 90, TargetRevenue: 110 }
        ]
      }),
      overview: overview({ metrics: [] })
    });

    expect(brief.variance.map(kpi => kpi.id)).toContain('plan_variance_actual_revenue');
    expect(brief.variance.find(kpi => kpi.id === 'plan_variance_actual_revenue')?.delta).toBe(-40);
    expect(brief.nextQuestions.length).toBeGreaterThan(0);
    expect(brief.narrative.sections.find(section => section.title === 'Next question')?.bullets.length).toBeGreaterThan(0);
  });

  it('detects concentration, reconciliation, key, and relationship risks from overview context', () => {
    const brief = createBusinessBrainBrief({
      action: action({
        opportunityName: 'Revenue by product',
        label: 'Revenue concentration',
        description: 'Review concentration and reconciliation risk.',
        actionType: 'group_by',
        dimensions: ['Product'],
        measures: ['Revenue']
      }),
      chartModel: chart({
        title: 'Revenue concentration',
        xField: 'Product',
        yField: 'Revenue',
        rows: [
          { Product: 'A', Revenue: 900 },
          { Product: 'B', Revenue: 100 }
        ]
      }),
      overview: overview({
        objectKeys: [{ key: 'OrderID', families: ['sales', 'accounting'], coverage: 0.65 }],
        reconciliationChecks: [{
          id: 'sales_accounting_revenue_gap',
          label: 'Sales vs accounting revenue',
          previousValue: 1000,
          currentValue: 850,
          gap: 150,
          gapPercent: 0.15,
          severity: 'high'
        }],
        crossChecks: ['Possible many-to-many relationship on OrderID.']
      })
    });

    expect(brief.risks.map(risk => risk.id)).toEqual(expect.arrayContaining(['concentration_risk', 'revenue_gap', 'key_coverage_risk', 'relationship_risk']));
    expect(brief.nextQuestions.some(question => question.includes('shared keys'))).toBe(true);
  });

  it('detects delivery fee spike from variance evidence', () => {
    const brief = createBusinessBrainBrief({
      action: action({
        opportunityName: 'Delivery fee trend',
        label: 'Delivery fee trend',
        description: 'Review delivery fee movement.',
        actionType: 'trend',
        dimensions: ['period'],
        measures: ['DeliveryFee']
      }),
      chartModel: chart({
        title: 'Delivery fee trend',
        xField: 'period',
        yField: 'DeliveryFee',
        rows: [
          { period: '2026-05', DeliveryFee: 100 },
          { period: '2026-06', DeliveryFee: 180 }
        ]
      }),
      overview: overview({ metrics: [] })
    });

    expect(brief.risks.map(risk => risk.id)).toContain('delivery_fee_spike');
  });

  it('does not hide payment, logistics, and fulfillment signals in the six ERP sample files', () => {
    const families = sampleFamilies();
    const fusionOverview = createBusinessFusionOverview(families);
    expect(fusionOverview).not.toBeNull();

    const accountingRows = familyAnalysisRows(families.find(family => family.id === 'accounting_reports'));
    const logisticsRows = familyAnalysisRows(families.find(family => family.id === 'logistics_reports'));

    const paymentBrief = createBusinessBrainBrief({
      action: action({
        opportunityName: 'Payment mix and cash-flow exposure',
        label: 'Payment profitability and receivable mix',
        description: 'Compare payment methods by revenue, receivable, and gross profit.',
        actionType: 'group_by',
        dimensions: ['Payment'],
        measures: ['NetRevenue', 'AR_Debit', 'GrossProfit']
      }),
      chartModel: chart({
        title: 'Payment mix and cash-flow exposure',
        xField: 'Payment',
        yField: 'NetRevenue',
        seriesFields: ['NetRevenue', 'AR_Debit', 'GrossProfit'],
        rows: groupByDimension(accountingRows, 'Payment', ['NetRevenue', 'AR_Debit', 'GrossProfit'])
      }),
      overview: fusionOverview ?? undefined
    });

    expect(paymentBrief.intent).toBe('payment');
    expect(paymentBrief.kpis.map(kpi => kpi.id)).toEqual(expect.arrayContaining([
      'payment_mix',
      'payment_receivable_exposure',
      'payment_profit_signal'
    ]));
    expect(paymentBrief.missingEvidence.map(item => item.id)).not.toContain('missing_profit_signal');
    expect(paymentBrief.evidence.some(item => item.type === 'kpi' && item.label.includes('Payment'))).toBe(true);

    const carrierBrief = createBusinessBrainBrief({
      action: action({
        opportunityName: 'Carrier cost impact',
        label: 'Internal vs outsourced carrier fee',
        description: 'Compare internal fleet and external carrier delivery fee.',
        actionType: 'group_by',
        dimensions: ['Carrier'],
        measures: ['DeliveryFee']
      }),
      chartModel: chart({
        title: 'Carrier cost impact',
        xField: 'Carrier',
        yField: 'DeliveryFee',
        seriesFields: ['DeliveryFee'],
        rows: groupByDimension(logisticsRows, 'Carrier', ['DeliveryFee'])
      }),
      overview: fusionOverview ?? undefined
    });

    expect(carrierBrief.intent).toBe('logistics');
    expect(carrierBrief.kpis.map(kpi => kpi.id)).toEqual(expect.arrayContaining([
      'internal_carrier_share',
      'external_carrier_share',
      'total_delivery_fee'
    ]));
    expect(carrierBrief.missingEvidence.map(item => item.id)).not.toContain('missing_delivery_fee');
    expect(carrierBrief.rootCauses.some(cause => cause.level === 'carrier')).toBe(true);

    const fulfillmentBrief = createBusinessBrainBrief({
      action: action({
        opportunityName: 'Delivery completion mix',
        label: 'Delivery status completion',
        description: 'Compare completed delivery status by row count.',
        actionType: 'group_by',
        dimensions: ['DeliveryStatus'],
        measures: ['row_count']
      }),
      chartModel: chart({
        title: 'Delivery completion mix',
        xField: 'DeliveryStatus',
        yField: 'row_count',
        seriesFields: ['row_count'],
        rows: groupByDimension(logisticsRows, 'DeliveryStatus', [])
      }),
      overview: fusionOverview ?? undefined
    });

    expect(fulfillmentBrief.intent).toBe('logistics');
    expect(fulfillmentBrief.kpis.map(kpi => kpi.id)).toContain('fulfilled_rate');
    expect(fulfillmentBrief.rootCauses.some(cause => cause.level === 'delivery_status')).toBe(true);
    expect(fulfillmentBrief.evidence.length).toBeGreaterThan(0);
  });
});
