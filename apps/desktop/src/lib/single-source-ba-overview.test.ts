import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { createSingleSourceBAOverview } from './single-source-ba-overview';

describe('single source BA overview', () => {
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
});
