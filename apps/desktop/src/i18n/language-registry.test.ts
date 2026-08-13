import { describe, expect, it } from 'vitest';
import {
  getAvailableLanguages,
  getLanguageMetadata,
  translateCatalogMessage,
} from './language-registry';

describe('language catalog registry', () => {
  it('auto-discovers language JSON files', () => {
    const codes = getAvailableLanguages().map((language) => language.code);
    expect(codes).toContain('en');
    expect(codes).toContain('vi');
  });

  it('provides locale metadata for display formatting', () => {
    expect(getLanguageMetadata('vi')).toMatchObject({
      code: 'vi',
      locale: 'vi-VN',
      direction: 'ltr',
    });
    expect(getLanguageMetadata('vi-VN')).toMatchObject({
      code: 'vi',
      locale: 'vi-VN',
    });
  });

  it('translates catalog messages and safely falls back to English source text', () => {
    expect(translateCatalogMessage('vi', 'Dashboard')).toBe('Bảng điều khiển');
    expect(translateCatalogMessage('vi', 'Uncatalogued sentence')).toBe('Uncatalogued sentence');
    expect(translateCatalogMessage('zh-CN', 'Dashboard')).toBe('Dashboard');
  });

  it('uses language-package patterns for dynamic UI sentences', () => {
    expect(translateCatalogMessage('vi-VN', '25 of 100 rows selected for export')).toBe('Đã chọn 25 / 100 dòng để xuất');
  });

  it('translates legacy Vietnamese engine output when English is selected', () => {
    expect(translateCatalogMessage('en', 'Phân tích tồn kho')).toBe('Inventory analysis');
    expect(translateCatalogMessage('en-US', 'Bình quân tồn cuối')).toBe('Average tồn cuối');
    expect(translateCatalogMessage('en', 'Uncatalogued sentence')).toBe('Uncatalogued sentence');
    expect(translateCatalogMessage('en', 'LightBI cho máy tính')).toBe('LightBI Desktop');
    expect(translateCatalogMessage('en', 'Ngôn ngữ hiển thị')).toBe('Display language');
    expect(translateCatalogMessage('en', 'Kho A là nhóm xuất hiện nhiều nhất theo chiều chi nhánh (42.0%, n=21).'))
      .toBe('Kho A appears most often in chi nhánh (42.0%, n=21).');
    expect(translateCatalogMessage('en', 'Tồn cuối kỳ cuối giảm 12.5% so với kỳ đầu trong file.'))
      .toBe('Tồn cuối decreased 12.5% in the final period versus the first period in the file.');
  });

  it('translates dynamic comparison evidence without mixing languages', () => {
    expect(translateCatalogMessage('vi', 'Store A had the largest negative revenue movement (-120).'))
      .toBe('Store A có mức giảm doanh thu lớn nhất (-120).');
    expect(translateCatalogMessage('vi', 'Quantity changed by -86, so volume likely contributed to the movement.'))
      .toBe('Số lượng thay đổi -86, vì vậy biến động sản lượng có thể đã góp phần tạo ra thay đổi này.');
  });
});
