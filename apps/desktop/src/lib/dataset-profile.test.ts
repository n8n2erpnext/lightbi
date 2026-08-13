import { describe, it, expect } from 'vitest';
import { buildDatasetProfile } from './dataset-profile';

describe('dataset-profile', () => {
  it('identifies retail_sales from BHX-like columns', () => {
    const columns = ['Mã hàng', 'Số lượng xuất', 'Thành tiền', 'Phieu xuat', 'Ngày'];
    const profile = buildDatasetProfile(columns, []);
    expect(profile.primaryDomain).toBe('retail_sales');
    expect(profile.features.hasTime).toBe(true);
    expect(profile.features.hasQuantities).toBe(true);
    expect(profile.features.hasFinancials).toBe(true);
  });

  it('identifies inventory_product from PLU-like columns', () => {
    const columns = ['PLU', 'Tên sản phẩm', 'Barcode', 'Tồn kho'];
    const profile = buildDatasetProfile(columns, []);
    // Note: If PLU has no retail evidence, it falls back to inventory
    expect(profile.primaryDomain).toBe('inventory_product');
  });

  it('identifies logistics from route/shipment columns', () => {
    const columns = ['Route', 'Driver', 'Package ID', 'Weight'];
    const profile = buildDatasetProfile(columns, []);
    expect(profile.primaryDomain).toBe('logistics');
  });

  it('identifies management_performance from QUAN LY columns', () => {
    const columns = ['Tên Quản Lý', 'KPI', 'Staff ID'];
    const profile = buildDatasetProfile(columns, []);
    expect(profile.primaryDomain).toBe('management_performance');
  });

  it('falls back to generic for unknown columns', () => {
    const columns = ['Random', 'Data', 'Foo', 'Bar'];
    const profile = buildDatasetProfile(columns, []);
    expect(profile.primaryDomain).toBe('generic');
  });

  it('correctly parses Excel numeric dates and standard dates without defaulting to 1/1/1970', () => {
    const columns = ['Date', 'Value'];
    const rows = [
      { 'Date': 44278 }, // roughly March 2021
      { 'Date': '2024-12-28' },
      { 'Date': 'not a date' },
      { 'Date': 123 }, // too small to be recent Excel date, shouldn't be parsed
      { 'Date': 0 } // definitely not valid
    ];
    const profile = buildDatasetProfile(columns, rows);
    expect(profile.dateRange).not.toBeNull();
    // 44278 in Excel is approx 2021
    // '2024-12-28' is 2024
    // We just want to make sure '1970' isn't in there if we didn't provide 1970
    expect(profile.dateRange?.min).not.toContain('1970');
    expect(profile.dateRange?.max).not.toContain('1970');
  });
});
