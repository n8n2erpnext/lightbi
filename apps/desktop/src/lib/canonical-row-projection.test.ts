import { describe, it, expect } from 'vitest';
import { projectToCanonicalRows } from './canonical-row-projection';

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
});
