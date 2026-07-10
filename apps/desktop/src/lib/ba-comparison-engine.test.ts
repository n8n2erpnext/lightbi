import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { createDomainComparisonBriefFromFamily, createTwoPeriodBusinessComparison } from './ba-comparison-engine';
import type { DatasetFamily } from './batch-inspection';

function readWorkbookRows(path: string): Record<string, unknown>[] {
  const workbook = XLSX.readFile(path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null }).map(row => {
    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key.replace(/^\uFEFF/, ''), value])
    );
  });
}

describe('ba comparison engine', () => {
  it('explains revenue increase and ranks growth and decline drivers across two reports', () => {
    const january = [
      { Product: 'A', Category: 'Core', Revenue: 1000, Cost: 800, Quantity: 10 },
      { Product: 'B', Category: 'Core', Revenue: 900, Cost: 300, Quantity: 9 },
      { Product: 'C', Category: 'Addon', Revenue: 500, Cost: 450, Quantity: 5 }
    ];
    const february = [
      { Product: 'A', Category: 'Core', Revenue: 1300, Cost: 1100, Quantity: 12 },
      { Product: 'B', Category: 'Core', Revenue: 1100, Cost: 340, Quantity: 10 },
      { Product: 'C', Category: 'Addon', Revenue: 300, Cost: 250, Quantity: 3 },
      { Product: 'D', Category: 'Addon', Revenue: 800, Cost: 500, Quantity: 8 }
    ];

    const brief = createTwoPeriodBusinessComparison(january, february, {
      previousLabel: 'January',
      currentLabel: 'February'
    });

    expect(brief.domainId).toBe('finance');
    expect(brief.headline).toContain('February revenue increased');
    expect(brief.metricDeltas.find(metric => metric.metricId === 'revenue')?.delta).toBe(1100);
    expect(brief.topGrowthDrivers.map(driver => driver.key)).toContain('D');
    expect(brief.topDeclineDrivers[0]?.key).toBe('C');
    expect(brief.reasonCodes.some(reason => reason.id === 'quantity_effect')).toBe(true);
    expect(brief.exportableEvidence.some(evidence => evidence.value === 'D')).toBe(true);
    expect(brief.presetId).toBe('business_period_review');
    expect(brief.narrativeSections.some(section => section.id === 'executive_answer')).toBe(true);
    expect(brief.narrativeSections.some(section => section.id === 'profitability_answer')).toBe(true);
    expect(brief.signalCoverage.revenueField).toBe('Revenue');
    expect(brief.periodMapping.length).toBe(2);
  });

  it('does not claim profitability when cost-like fields are missing', () => {
    const month1 = [
      { ProductName: 'A', TotalAmount: 1000 },
      { ProductName: 'B', TotalAmount: 500 }
    ];
    const month2 = [
      { ProductName: 'A', TotalAmount: 1200 },
      { ProductName: 'B', TotalAmount: 400 }
    ];

    const brief = createTwoPeriodBusinessComparison(month1, month2, {
      previousLabel: 'Month 1',
      currentLabel: 'Month 2'
    });

    expect(brief.domainId).toBe('revenue');
    expect(brief.metricDeltas.some(metric => metric.metricId === 'profit')).toBe(false);
    expect(brief.topProfitDrivers).toEqual([]);
    expect(brief.caveats.join(' ')).toContain('Profitability is not decision-ready');
    expect(brief.reasonCodes.some(reason => reason.id === 'profit_not_supported')).toBe(true);
    expect(brief.decisionReadinessScore).toBeLessThan(brief.trustScore);
    expect(brief.profitEvidenceStatus).toBe('missing');
    expect(brief.narrativeSections.find(section => section.id === 'profitability_blocked')?.severity).toBe('critical');
  });

  it('ranks profit separately from revenue so high revenue is not treated as highest value by default', () => {
    const january = [
      { Product: 'Top revenue weak margin', Revenue: 1000, Cost: 950 },
      { Product: 'Lower revenue strong margin', Revenue: 700, Cost: 150 }
    ];
    const february = [
      { Product: 'Top revenue weak margin', Revenue: 2000, Cost: 1950 },
      { Product: 'Lower revenue strong margin', Revenue: 1200, Cost: 250 }
    ];

    const brief = createTwoPeriodBusinessComparison(january, february, {
      previousLabel: 'Month 1',
      currentLabel: 'Month 2',
      preferredDomain: 'finance'
    });

    expect(brief.topGrowthDrivers[0]?.key).toBe('Top revenue weak margin');
    expect(brief.topProfitDrivers[0]?.key).toBe('Lower revenue strong margin');
    expect(brief.topProfitDrivers[0]?.currentProfit).toBe(950);
    expect(brief.topGrowthDrivers[0]?.currentProfit).toBe(50);
    expect(brief.narrativeSections.find(section => section.id === 'profitability_answer')?.summary).toContain('different from the top revenue growth driver');
  });

  it('supports Vietnamese sales report headers without locking to one sample file', () => {
    const thang1 = [
      { 'Ngành hàng': 'Đồ uống', 'Tổng tiền': '1,000,000', 'Giá vốn': '600,000', 'Số lượng': 100 },
      { 'Ngành hàng': 'Đồ khô', 'Tổng tiền': '800,000', 'Giá vốn': '500,000', 'Số lượng': 60 }
    ];
    const thang2 = [
      { 'Ngành hàng': 'Đồ uống', 'Tổng tiền': '1,400,000', 'Giá vốn': '900,000', 'Số lượng': 130 },
      { 'Ngành hàng': 'Đồ khô', 'Tổng tiền': '600,000', 'Giá vốn': '420,000', 'Số lượng': 45 }
    ];

    const brief = createTwoPeriodBusinessComparison(thang1, thang2, {
      previousLabel: 'Tháng 1',
      currentLabel: 'Tháng 2'
    });

    expect(brief.primaryDimension).toBe('Ngành hàng');
    expect(brief.headline).toContain('Tháng 2 revenue increased');
    expect(brief.topGrowthDrivers[0]?.key).toBe('Đồ uống');
    expect(brief.topDeclineDrivers[0]?.key).toBe('Đồ khô');
    expect(brief.metricDeltas.find(metric => metric.metricId === 'profit')?.delta).toBe(-20000);
    expect(brief.reasonCodes.some(reason => reason.id === 'cost_pressure')).toBe(true);
  });

  it('creates a comparison brief from a multi-file dataset family', () => {
    const family: DatasetFamily = {
      id: 'family_sales',
      name: 'Sales Reports',
      schemaFingerprint: 'same',
      totalRows: 4,
      columns: ['Product', 'Revenue', 'Cost'],
      profiles: {},
      files: [
        {
          file: new File([''], 'sales-2026-01.xlsx'),
          result: {
            status: 'accessible',
            sourceType: 'local_xlsx',
            label: 'January',
            normalizedUrl: 'local',
            metadata: {
              name: 'sales-2026-01.xlsx',
              rows_count: 2,
              columns: ['Product', 'Revenue', 'Cost'],
              analysis_rows: [
                { Product: 'A', Revenue: 100, Cost: 80 },
                { Product: 'B', Revenue: 200, Cost: 90 }
              ]
            }
          }
        },
        {
          file: new File([''], 'sales-2026-02.xlsx'),
          result: {
            status: 'accessible',
            sourceType: 'local_xlsx',
            label: 'February',
            normalizedUrl: 'local',
            metadata: {
              name: 'sales-2026-02.xlsx',
              rows_count: 2,
              columns: ['Product', 'Revenue', 'Cost'],
              analysis_rows: [
                { Product: 'A', Revenue: 180, Cost: 120 },
                { Product: 'B', Revenue: 150, Cost: 110 }
              ]
            }
          }
        }
      ]
    };

    const brief = createDomainComparisonBriefFromFamily(family);

    expect(brief).not.toBeNull();
    expect(brief?.headline).toContain('revenue increased');
    expect(brief?.topGrowthDrivers[0]?.key).toBe('A');
    expect(brief?.topDeclineDrivers[0]?.key).toBe('B');
    expect(brief?.exportableEvidence.length).toBeGreaterThan(0);
    expect(brief?.periods).toEqual(['2026-01', '2026-02']);
    expect(brief?.periodMappingNeedsReview).toBe(false);
    expect(brief?.exportableEvidence[0]?.rows[0]).toHaveProperty('__lightbi_period');
  });

  it('returns a top 10 contributor list without collapsing to a single hardcoded segment', () => {
    const previous = Array.from({ length: 12 }, (_, index) => ({
      Product: `P${index + 1}`,
      Revenue: 100,
      Cost: 40
    }));
    const current = Array.from({ length: 12 }, (_, index) => ({
      Product: `P${index + 1}`,
      Revenue: 100 + (index + 1) * 10,
      Cost: 40 + index
    }));

    const brief = createTwoPeriodBusinessComparison(previous, current, {
      previousLabel: 'Month 1',
      currentLabel: 'Month 2',
      preferredDomain: 'finance'
    });

    expect(brief.topGrowthDrivers).toHaveLength(10);
    expect(brief.topGrowthDrivers[0]?.key).toBe('P12');
    expect(brief.exportableEvidence).toHaveLength(10);
  });

  it('answers the real May vs June 2026 sales ERP comparison with revenue drivers and profit caveats', () => {
    const may = readWorkbookRows('../../sample data/Sales_ERP_May_2026.xlsx');
    const june = readWorkbookRows('../../sample data/Sales_ERP_June_2026.xlsx');

    const brief = createTwoPeriodBusinessComparison(may, june, {
      previousLabel: 'May 2026',
      currentLabel: 'June 2026',
      preferredDomain: 'revenue'
    });

    const revenueDelta = brief.metricDeltas.find(metric => metric.metricId === 'revenue');
    const quantityDelta = brief.metricDeltas.find(metric => metric.metricId === 'quantity');

    expect(brief.signalCoverage.revenueField).toBe('Revenue');
    expect(brief.signalCoverage.quantityField).toBe('Qty');
    expect(brief.primaryDimension).toBeTruthy();
    expect(brief.periods).toEqual(['May 2026', 'June 2026']);
    expect(revenueDelta).toBeTruthy();
    expect(revenueDelta?.delta).not.toBe(0);
    expect(quantityDelta).toBeTruthy();
    expect(brief.topGrowthDrivers.length).toBeGreaterThan(0);
    expect(brief.topGrowthDrivers.length).toBeLessThanOrEqual(10);
    expect(brief.topDeclineDrivers.length).toBeGreaterThan(0);
    expect(brief.topDeclineDrivers.length).toBeLessThanOrEqual(10);
    expect(brief.reasonCodes.length).toBeGreaterThan(0);
    expect(brief.exportableEvidence.length).toBeGreaterThan(0);
    expect(brief.profitEvidenceStatus).toBe('missing');
    expect(brief.topProfitDrivers).toEqual([]);
    expect(brief.narrativeSections.find(section => section.id === 'profitability_blocked')?.severity).toBe('critical');
    expect(brief.caveats.join(' ')).toContain('Profitability is not decision-ready');
  });

  it('answers the real May vs June 2026 accounting ERP comparison with top 10 profit evidence', () => {
    const may = readWorkbookRows('../../sample data/Accounting_ERP_May_2026.csv');
    const june = readWorkbookRows('../../sample data/Accounting_ERP_June_2026.csv');

    const brief = createTwoPeriodBusinessComparison(may, june, {
      previousLabel: 'May 2026',
      currentLabel: 'June 2026',
      preferredDomain: 'finance'
    });

    const whereChanged = brief.narrativeSections.find(section => section.id === 'where_changed');
    const profitability = brief.narrativeSections.find(section => section.id === 'profitability_answer');

    expect(brief.signalCoverage.revenueField).toBe('NetRevenue');
    expect(brief.signalCoverage.profitField).toBe('GrossProfit');
    expect(brief.signalCoverage.costFields).toContain('TotalCost');
    expect(brief.signalCoverage.quantityField).toBe('Qty');
    expect(brief.profitEvidenceStatus).toBe('available');
    expect(brief.topGrowthDrivers.length).toBeGreaterThan(0);
    expect(brief.topGrowthDrivers.length).toBeLessThanOrEqual(10);
    expect(brief.topDeclineDrivers.length).toBeGreaterThan(0);
    expect(brief.topDeclineDrivers.length).toBeLessThanOrEqual(10);
    expect(brief.topProfitDrivers.length).toBeGreaterThan(0);
    expect(brief.topProfitDrivers.length).toBeLessThanOrEqual(10);
    expect(whereChanged?.summary).toContain('TOP 10');
    expect(whereChanged?.bullets.filter(bullet => bullet.startsWith('Growth #')).length).toBeGreaterThan(0);
    expect(profitability?.bullets.filter(bullet => bullet.startsWith('Profit #')).length).toBeGreaterThan(0);
    expect(brief.caveats.join(' ')).not.toContain('Profitability is not decision-ready');
  });

  it('handles the real May vs June 2026 logistics ERP pair without pretending revenue is available', () => {
    const may = readWorkbookRows('../../sample data/Logistics_ERP_May_2026.csv');
    const june = readWorkbookRows('../../sample data/Logistics_ERP_June_2026.csv');

    const brief = createTwoPeriodBusinessComparison(may, june, {
      previousLabel: 'May 2026',
      currentLabel: 'June 2026',
      preferredDomain: 'operations'
    });

    expect(brief.signalCoverage.revenueField).toBeNull();
    expect(brief.signalCoverage.quantityField).toBe('Qty');
    expect(brief.signalCoverage.costFields).toEqual(expect.arrayContaining(['UnitCost', 'TotalCost', 'DeliveryFee']));
    expect(brief.metricDeltas.find(metric => metric.metricId === 'quantity')).toBeTruthy();
    expect(brief.metricDeltas.find(metric => metric.metricId === 'profit')).toBeTruthy();
    expect(brief.headline).toContain('needs a revenue or value signal');
    expect(brief.caveats.join(' ')).not.toContain('Profitability is not decision-ready');
  });
});
