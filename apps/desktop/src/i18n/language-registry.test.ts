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
});
