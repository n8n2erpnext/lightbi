import { describe, it, expect } from 'vitest';
import { projectToCanonicalRows, getUnprojectableCanonicalFields } from './canonical-row-projection';

describe('canonical-row-projection', () => {
  it('projects raw Vietnamese keys to canonical English keys', () => {
    const rawRows = [
      { 'Tuyến xe': 'A', 'Mã tài kiện': '123' },
      { 'Tuyến xe': 'B', 'Mã tài kiện': '456' }
    ];
    
    const required = ['route', 'shipment'];
    const projected = projectToCanonicalRows(rawRows, required);

    expect(projected.length).toBe(2);
    expect(projected[0]).toEqual({ route: 'A', shipment: '123' });
    expect(projected[1]).toEqual({ route: 'B', shipment: '456' });
  });

  it('keeps canonical fields intact if they already match perfectly', () => {
    const rawRows = [
      { 'route': 'X', 'shipment': '999' }
    ];
    
    const required = ['route'];
    const projected = projectToCanonicalRows(rawRows, required);

    expect(projected[0]).toEqual({ route: 'X' });
  });

  it('projects source-neutral physical headers by normalized direct match before taxonomy fallback', () => {
    const rawRows = [
      { 'Business: Internet users (per 100 people)': 72, 'Health: Health expenditure, total (% GDP)': 8.5 }
    ];

    const required = [
      'business: internet users (per 100 people)',
      'health: health expenditure, total (% gdp)'
    ];
    const projected = projectToCanonicalRows(rawRows, required);

    expect(projected[0]).toEqual({
      'business: internet users (per 100 people)': 72,
      'health: health expenditure, total (% gdp)': 8.5
    });
    expect(getUnprojectableCanonicalFields(Object.keys(rawRows[0]), required)).toEqual([]);
  });

  it('fails transparently with CANONICAL_PROJECTION_CONFLICT if multiple columns map to the same canonical field', () => {
    const rawRows = [
      { 'Tuyến xe': 'A', 'Route': 'B' }
    ];
    
    const required = ['route'];
    expect(() => projectToCanonicalRows(rawRows, required)).toThrowError(/CANONICAL_PROJECTION_CONFLICT/);
  });

  it('fails transparently with CANONICAL_PROJECTION_MISSING if required field is totally unmapped', () => {
    const rawRows = [
      { 'Ngẫu nhiên': 'A' }
    ];
    
    const required = ['route'];
    expect(() => projectToCanonicalRows(rawRows, required)).toThrowError(/CANONICAL_PROJECTION_MISSING/);
  });

  it('projects trend and new group_by fields accurately', () => {
    const rawRows = [
      { 'Ngày báo cáo': '2023-10-01', 'Tên lái xe': 'Driver 1', 'Đánh giá': 5, 'Mã tài kiện': 'S001' },
      { 'Ngày báo cáo': '2023-10-02', 'Tên lái xe': 'Driver 2', 'Đánh giá': 4, 'Mã tài kiện': 'S002' }
    ];
    
    const required = ['report_date', 'driver', 'satisfaction', 'shipment'];
    const projected = projectToCanonicalRows(rawRows, required);

    expect(projected.length).toBe(2);
    expect(projected[0]).toEqual({ report_date: '2023-10-01', driver: 'Driver 1', satisfaction: 5, shipment: 'S001' });
    expect(projected[1]).toEqual({ report_date: '2023-10-02', driver: 'Driver 2', satisfaction: 4, shipment: 'S002' });
  });

  it('preserves full raw rows when required array is empty (for table_preview)', () => {
    const rawRows = [
      { 'Ngẫu nhiên': 'A', 'Biến Dị': 123 }
    ];
    
    const required: string[] = [];
    const projected = projectToCanonicalRows(rawRows, required);

    expect(projected.length).toBe(1);
    expect(projected[0]).toEqual({ 'Ngẫu nhiên': 'A', 'Biến Dị': 123 });
  });

  it('ignores virtual measures when mapping', () => {
    const rawRows = [
      { 'Tuyến xe': 'A' }
    ];
    
    const required = ['route', 'record_count', 'row_count'];
    const projected = projectToCanonicalRows(rawRows, required);

    expect(projected.length).toBe(1);
    expect(projected[0]).toEqual({ route: 'A' });
  });

  it('correctly maps contextually promoted stock_status from generic status aliases', () => {
    const rawRows = [
      { 'Mã hàng': 'SKU1', 'Trạng thái': 'Còn hàng' }
    ];
    // 'Trạng thái' is a generic status alias, but it should map to stock_status
    const required = ['sku', 'stock_status'];
    const projected = projectToCanonicalRows(rawRows, required);

    expect(projected.length).toBe(1);
    expect(projected[0]).toEqual({ sku: 'SKU1', stock_status: 'Còn hàng' });
  });

  it('correctly maps contextually promoted delivery_status from generic status aliases', () => {
    const rawRows = [
      { 'Tuyến xe': 'TX1', 'Trạng thái': 'Đang giao' }
    ];
    const required = ['route', 'delivery_status'];
    const projected = projectToCanonicalRows(rawRows, required);

    expect(projected.length).toBe(1);
    expect(projected[0]).toEqual({ route: 'TX1', delivery_status: 'Đang giao' });
  });

  describe('getUnprojectableCanonicalFields', () => {
    it('returns empty array if all fields can map', () => {
      const rawHeaders = ['Tuyến xe', 'Mã tài kiện'];
      const required = ['route', 'shipment'];
      
      const unprojectable = getUnprojectableCanonicalFields(rawHeaders, required);
      expect(unprojectable).toEqual([]);
    });

    it('returns missing fields', () => {
      const rawHeaders = ['Tuyến xe'];
      const required = ['route', 'stock_age'];
      
      const unprojectable = getUnprojectableCanonicalFields(rawHeaders, required);
      expect(unprojectable).toEqual(['stock_age']);
    });

    it('ignores virtual measures', () => {
      const rawHeaders = ['Tuyến xe'];
      const required = ['route', 'record_count'];
      
      const unprojectable = getUnprojectableCanonicalFields(rawHeaders, required);
      expect(unprojectable).toEqual([]);
    });

    it('identifies unprojectable stock_status if no generic status alias exists', () => {
      const rawHeaders = ['Mã hàng']; // Missing 'Trạng thái'
      const required = ['sku', 'stock_status'];
      
      const unprojectable = getUnprojectableCanonicalFields(rawHeaders, required);
      expect(unprojectable).toEqual(['stock_status']);
    });
  });

  describe('Anti-contamination checks for contextually promoted fields', () => {
    it('delivery_status is not considered projectable as stock_status in delivery-only context', () => {
      const rawHeaders = ['Tuyến xe', 'Trạng thái'];
      // Because 'sku' or 'warehouse' are NOT required, 'stock_status' cannot inherit generic 'Trạng thái'
      const required = ['route', 'stock_status'];
      
      const unprojectable = getUnprojectableCanonicalFields(rawHeaders, required);
      expect(unprojectable).toContain('stock_status');
    });

    it('stock_status is not considered projectable as delivery_status in inventory-only context', () => {
      const rawHeaders = ['Mã hàng', 'Trạng thái'];
      // Because 'route', 'driver', 'shipment' are NOT required, 'delivery_status' cannot inherit generic 'Trạng thái'
      const required = ['sku', 'delivery_status'];
      
      const unprojectable = getUnprojectableCanonicalFields(rawHeaders, required);
      expect(unprojectable).toContain('delivery_status');
    });

    it('generic status aliases are only inherited with domain/context evidence', () => {
      const rawRows = [
        { 'Tuyến xe': 'TX1', 'Trạng thái': 'Đang giao' }
      ];
      // Only generic 'Trạng thái' present, but required doesn't include 'route'
      const required = ['delivery_status'];
      expect(() => projectToCanonicalRows(rawRows, required)).toThrowError(/CANONICAL_PROJECTION_MISSING/);
    });
  });
});
