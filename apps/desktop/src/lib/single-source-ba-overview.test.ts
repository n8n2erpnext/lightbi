import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { createSingleSourceBAOverview, sampleSingleSourceBARows } from './single-source-ba-overview';

describe('single source BA overview', () => {
  it('samples large sorted or sparse sources across their complete extent', () => {
    const rows = Array.from({ length: 5000 }, (_, index) => ({
      Date: `2026-01-${String((index % 28) + 1).padStart(2, '0')}`,
      Region: `Region ${index % 5}`,
      SparseAmount: index >= 4500 ? index : null,
    }));

    const sampled = sampleSingleSourceBARows(rows, 1000);
    expect(sampled).toHaveLength(1000);
    expect(sampled[0]).toBe(rows[0]);
    expect(sampled.at(-1)).toBe(rows.at(-1));
    expect(sampled.some(row => row.SparseAmount !== null)).toBe(true);

    const overview = createSingleSourceBAOverview(sampled, {
      sourceRowCount: rows.length,
      analysisAction: {
        id: 'universal:action_money_over_time',
        opportunityName: 'Money over time',
        dimensions: ['Date'],
        measures: ['SparseAmount'],
      },
    });
    expect(overview).not.toBeNull();
    expect(overview?.isRepresentativeSample).toBe(true);
    expect(overview?.bindings.selectedMeasure).toBe('SparseAmount');
  });
  it('keeps a selected descriptive participant angle inside the specialized BA surface', () => {
    const rows = Array.from({ length: 30 }, (_, index) => ({
      Team: ['North', 'South', 'Central'][index % 3],
      Participant: `Person ${index + 1}`,
      Role: index % 2 ? 'Member' : 'Lead',
    }));
    const overview = createSingleSourceBAOverview(rows, {
      analysisAction: {
        id: 'universal:participation_by_team',
        opportunityName: 'Participation by team or group',
        dimensions: ['Team'],
        measures: ['record_count'],
      },
    });

    expect(overview).not.toBeNull();
    expect(overview?.mode).toBe('performance');
    expect(overview?.kpis.some(kpi => kpi.id === 'records')).toBe(true);
    expect(overview?.breakdowns[0]?.physicalColumn).toBe('Team');
    expect(overview?.findings.length).toBeGreaterThan(0);
  });
  it('uses the complete sales source to produce KPIs, trends and business breakdowns', () => {
    const rows = [
      { OrderID: 'O-1', OrderDate: '2026-06-01', Product: 'A', Category: 'TV', Store: 'HCM', Salesperson: 'Lan', PaymentMethod: 'Card', Quantity: 2, Revenue: 200, Discount: 10 },
      { OrderID: 'O-2', OrderDate: '2026-06-01', Product: 'B', Category: 'AC', Store: 'HN', Salesperson: 'Minh', PaymentMethod: 'Cash', Quantity: 1, Revenue: 100, Discount: 0 },
      { OrderID: 'O-3', OrderDate: '2026-06-02', Product: 'A', Category: 'TV', Store: 'HCM', Salesperson: 'Lan', PaymentMethod: 'Card', Quantity: 3, Revenue: 300, Discount: 15 },
    ];

    const overview = createSingleSourceBAOverview(rows)!;
    expect(overview.rowCount).toBe(3);
    expect(overview.kpis.find(item => item.id === 'revenue')?.value).toBe(600);
    expect(overview.kpis.find(item => item.id === 'orders')?.value).toBe(3);
    expect(overview.kpis.find(item => item.id === 'quantity')?.value).toBe(6);
    expect(overview.trend).toEqual([
      { period: '2026-06-01', value: 300, rowCount: 2 },
      { period: '2026-06-02', value: 300, rowCount: 1 },
    ]);
    expect(overview.breakdowns.map(item => item.id)).toEqual(['product', 'category', 'branch', 'salesperson', 'payment']);
    expect(overview.breakdowns[0].top[0]).toMatchObject({ label: 'A', value: 500 });
    expect(overview.kpis.find(item => item.id === 'discount')).toMatchObject({ kind: 'money', value: 25 });
  });

  it('does not invent a transaction count when order identity is missing', () => {
    const overview = createSingleSourceBAOverview([{ Date: '2026-01-01', Revenue: 10 }, { Date: '2026-01-02', Revenue: 20 }])!;
    expect(overview.kpis.find(item => item.id === 'orders')?.label).toBe('Số bản ghi');
    expect(overview.limitations.some(item => item.includes('định danh đơn hàng'))).toBe(true);
  });

  it('covers the complete Beta Sales ERP June sample', () => {
    const workbook = XLSX.readFile('../../sample-corpus/anchors/1.3.0/Sales_ERP_June_2026.xlsx');
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]]);
    const overview = createSingleSourceBAOverview(rows)!;
    expect(overview.rowCount).toBe(1500);
    expect(overview.bindings).toMatchObject({
      order: 'OrderID', date: 'OrderDate', branch: 'Store', category: 'Category', product: 'Product',
      quantity: 'Qty', unitPrice: 'UnitPrice', discount: 'Discount', revenue: 'Revenue',
      payment: 'Payment', salesperson: 'Salesperson', status: 'Status',
    });
    expect(overview.kpis.find(item => item.id === 'discount')?.kind).toBe('percent');
    expect(overview.breakdowns.map(item => item.id)).toEqual(['product', 'category', 'brand', 'branch', 'salesperson', 'payment', 'status']);
    expect(overview.trend.length).toBeGreaterThan(1);
  });

  it('produces a full operational BA overview for logistics data without revenue', () => {
    const workbook = XLSX.readFile('../../sample-corpus/anchors/1.3.0/Logistics_ERP_June_2026.csv');
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]]);
    const overview = createSingleSourceBAOverview(rows)!;
    expect(overview.mode).toBe('operations');
    expect(overview.rowCount).toBe(1500);
    expect(overview.kpis.find(item => item.id === 'deliveries')?.value).toBeGreaterThan(0);
    expect(overview.breakdowns.length).toBeGreaterThanOrEqual(3);
    expect(overview.findings.length).toBeGreaterThan(0);
    expect(overview.recommendedActions.length).toBe(3);
  });

  it('keeps deep BA aligned with the selected operational perspective when the source also contains revenue', () => {
    const rows = [
      { ShipmentID: 'S-1', Route: 'North', Vehicle: 'V-1', DeliveryStatus: 'Late', DeliveryFee: 20, Revenue: 200 },
      { ShipmentID: 'S-2', Route: 'South', Vehicle: 'V-2', DeliveryStatus: 'On time', DeliveryFee: 30, Revenue: 300 },
      { ShipmentID: 'S-3', Route: 'North', Vehicle: 'V-1', DeliveryStatus: 'On time', DeliveryFee: 10, Revenue: 100 },
    ];

    const operations = createSingleSourceBAOverview(rows, {
      analysisAction: {
        id: 'universal:delivery_by_route',
        label: 'Compare delivery performance by route and vehicle',
        dimensions: ['route', 'vehicle', 'delivery_status'],
        measures: ['delivery_count'],
      },
    })!;
    const commercial = createSingleSourceBAOverview(rows, {
      analysisAction: {
        id: 'universal:revenue_by_route',
        label: 'Compare revenue by route',
        dimensions: ['route'],
        measures: ['revenue'],
      },
    })!;

    expect(operations.mode).toBe('operations');
    expect(operations.kpis.some(item => item.id === 'deliveries')).toBe(true);
    expect(operations.breakdowns.map(item => item.id)).toEqual(expect.arrayContaining(['deliveryStatus', 'route', 'vehicle']));
    expect(commercial.mode).toBe('commercial');
    expect(commercial.kpis.some(item => item.id === 'revenue')).toBe(true);
  });

  it('uses the selected operational measure for KPIs, breakdowns and trend', () => {
    const rows = [
      { ShipmentID: 'S-1', Date: '2026-06-01', Route: 'North', Weight: 10, DeliveryFee: 100 },
      { ShipmentID: 'S-2', Date: '2026-06-01', Route: 'South', Weight: 20, DeliveryFee: 200 },
      { ShipmentID: 'S-3', Date: '2026-06-02', Route: 'North', Weight: 30, DeliveryFee: 300 },
    ];
    const overview = createSingleSourceBAOverview(rows, {
      analysisAction: {
        id: 'universal:operations:weight_by_route',
        opportunityName: 'Cargo weight by route',
        dimensions: ['dimension.route'],
        measures: ['measure.weight'],
        measureAggregations: { 'measure.weight': 'SUM' },
      },
      semanticFields: [
        { canonicalId: 'dimension.route', physicalColumn: 'Route', role: 'dimension' },
        { canonicalId: 'measure.weight', physicalColumn: 'Weight', role: 'measure' },
      ],
    })!;

    expect(overview.mode).toBe('operations');
    expect(overview.bindings).toMatchObject({ selectedMeasure: 'Weight', selectedDimension1: 'Route' });
    expect(overview.kpis[0]).toMatchObject({ id: 'selected_measure', value: 60, kind: 'number' });
    expect(overview.breakdowns[0]).toMatchObject({ physicalColumn: 'Route', valueKind: 'number' });
    expect(overview.breakdowns[0].top).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'North', value: 40 }),
      expect.objectContaining({ label: 'South', value: 20 }),
    ]));
    expect(overview.trend).toEqual([
      { period: '2026-06-01', value: 30, rowCount: 2 },
      { period: '2026-06-02', value: 30, rowCount: 1 },
    ]);
  });

  it('keeps a selected commercial quantity angle out of the revenue fallback', () => {
    const rows = [
      { OrderID: 'O-1', Date: '2026-06-01', Product: 'A', Quantity: 2, Revenue: 200 },
      { OrderID: 'O-2', Date: '2026-06-01', Product: 'B', Quantity: 1, Revenue: 100 },
      { OrderID: 'O-3', Date: '2026-06-02', Product: 'A', Quantity: 3, Revenue: 300 },
    ];
    const overview = createSingleSourceBAOverview(rows, {
      analysisAction: {
        id: 'universal:commercial:quantity_by_product',
        opportunityName: 'Sales quantity by product',
        dimensions: ['product'],
        measures: ['quantity'],
        measureAggregations: { quantity: 'SUM' },
      },
    })!;

    expect(overview.mode).toBe('commercial');
    expect(overview.bindings).toMatchObject({ selectedMeasure: 'Quantity', selectedDimension1: 'Product' });
    expect(overview.kpis[0]).toMatchObject({ id: 'selected_measure', value: 6, kind: 'number' });
    expect(overview.breakdowns[0]).toMatchObject({ physicalColumn: 'Product' });
    expect(overview.breakdowns[0].top[0]).toMatchObject({ label: 'A', value: 5 });
    expect(overview.trend).toEqual([
      { period: '2026-06-01', value: 3, rowCount: 2 },
      { period: '2026-06-02', value: 3, rowCount: 1 },
    ]);
    expect(overview.findings.join(' ')).not.toContain('Doanh thu kỳ cuối');
  });

  it('keeps the deep BA on the selected dimension and measure inside a perspective', () => {
    const rows = [
      { job: 'student', poutcome: 'success', y: 'yes', duration: 120 },
      { job: 'student', poutcome: 'failure', y: 'no', duration: 80 },
      { job: 'admin', poutcome: 'failure', y: 'yes', duration: 60 },
      { job: 'admin', poutcome: 'failure', y: 'no', duration: 50 },
    ];
    const overview = createSingleSourceBAOverview(rows, {
      analysisAction: {
        id: 'universal:customer:previous-outcome-distribution',
        opportunityName: 'How are source records distributed by previous campaign outcome?',
        dimensions: ['previous_campaign_outcome'],
        measures: ['record_count'],
      },
      semanticFields: [{ canonicalId: 'previous_campaign_outcome', physicalColumn: 'poutcome', role: 'dimension' }],
    })!;

    expect(overview.mode).toBe('customer');
    expect(overview.kpis.some(item => item.id === 'outcome_rate')).toBe(false);
    expect(overview.breakdowns[0]).toMatchObject({ physicalColumn: 'poutcome', valueKind: 'number' });
    expect(overview.breakdowns[0].top[0]).toMatchObject({ label: 'failure', value: 3 });
  });

  it('builds a shipment backlog brief from semantic bindings without treating opaque status codes as completion', () => {
    const rows = [
      { 'Mã Phiếu Gửi': 100001, 'Bưu Cục Hiện Tại': 'HUB A', 'Trạng Thái': 200, 'Dịch Vụ': 'Express', 'Tiền COD': 500000, 'Tiền Cước': 25000 },
      { 'Mã Phiếu Gửi': 100002, 'Bưu Cục Hiện Tại': 'HUB A', 'Trạng Thái': 200, 'Dịch Vụ': 'Standard', 'Tiền COD': 200000, 'Tiền Cước': 15000 },
      { 'Mã Phiếu Gửi': 100003, 'Bưu Cục Hiện Tại': 'HUB B', 'Trạng Thái': 565, 'Dịch Vụ': 'Express', 'Tiền COD': 300000, 'Tiền Cước': 20000 },
    ];
    const overview = createSingleSourceBAOverview(rows, {
      analysisAction: {
        id: 'shipment_backlog_by_location',
        label: 'Shipment backlog by current location',
        dimensions: ['current_location'],
        measures: ['record_count'],
      },
      semanticFields: [
        { canonicalId: 'document.shipment', physicalColumn: 'Mã Phiếu Gửi', role: 'identifier' },
        { canonicalId: 'current_location', physicalColumn: 'Bưu Cục Hiện Tại', role: 'dimension' },
        { canonicalId: 'status.lifecycle', physicalColumn: 'Trạng Thái', role: 'dimension' },
        { canonicalId: 'service_group', physicalColumn: 'Dịch Vụ', role: 'dimension' },
        { canonicalId: 'money.cod', physicalColumn: 'Tiền COD', role: 'measure' },
        { canonicalId: 'money.fee', physicalColumn: 'Tiền Cước', role: 'measure' },
      ],
    })!;

    expect(overview.mode).toBe('operations');
    expect(overview.kpis.find(item => item.id === 'deliveries')?.value).toBe(3);
    expect(overview.kpis.find(item => item.id === 'cod_exposure')?.value).toBe(1_000_000);
    expect(overview.kpis.some(item => item.id === 'on_time_rate')).toBe(false);
    expect(overview.breakdowns[0]).toMatchObject({ physicalColumn: 'Bưu Cục Hiện Tại', valueKind: 'number' });
    expect(overview.breakdowns.map(item => item.physicalColumn)).toEqual(expect.arrayContaining(['Trạng Thái', 'Dịch Vụ']));
    expect(overview.findings.some(item => item.includes('không tự gán mã trạng thái'))).toBe(true);
  });

  it('creates a selected-angle BA brief for generic management KPIs without an outcome column', () => {
    const rows = Array.from({ length: 20 }, (_, index) => ({
      Manager: `Manager ${index % 5}`,
      Team: `Team ${index % 3}`,
      Score: 70 + index,
      Note: index % 2 ? 'Stable' : 'Review',
    }));
    const overview = createSingleSourceBAOverview(rows, {
      analysisAction: {
        id: 'performance_indicator_by_owner_or_team',
        opportunityName: 'Performance indicators by owner or team',
        dimensions: ['manager'],
        measures: ['indicator.metric'],
      },
      semanticFields: [
        { canonicalId: 'entity.manager', physicalColumn: 'Manager', role: 'dimension' },
        { canonicalId: 'indicator.metric', physicalColumn: 'Score', role: 'measure' },
      ],
    })!;

    expect(overview.mode).toBe('performance');
    expect(overview.bindings.selectedMeasure).toBe('Score');
    expect(overview.breakdowns[0]).toMatchObject({ physicalColumn: 'Manager' });
    expect(overview.kpis.map(item => item.id)).toEqual(expect.arrayContaining(['average_indicator', 'minimum_indicator', 'maximum_indicator']));
    expect(overview.findings.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps a selected record-count angle instead of falling back to an unrelated numeric identifier', () => {
    const rows = [
      { STT: 1, 'ĐVT': 'Cái', MVT: 'A01' },
      { STT: 2, 'ĐVT': 'Cái', MVT: 'A02' },
      { STT: 3, 'ĐVT': 'Kg', MVT: 'B01' },
    ];
    const overview = createSingleSourceBAOverview(rows, {
      analysisAction: {
        id: 'universal:catalog-composition-by-uom',
        opportunityName: 'Catalog composition by category',
        dimensions: ['uom'],
        measures: ['record_count'],
      },
      semanticFields: [{ canonicalId: 'uom', physicalColumn: 'ĐVT', role: 'dimension' }],
    })!;

    expect(overview.bindings.selectedMeasure).toBe('record_count');
    expect(overview.bindings.selectedDimension1).toBe('ĐVT');
    expect(overview.kpis.some(item => item.id === 'average_indicator')).toBe(false);
    expect(overview.breakdowns[0]).toMatchObject({ physicalColumn: 'ĐVT' });
    expect(overview.breakdowns[0].top[0]).toMatchObject({ label: 'Cái', value: 2 });
  });
});
