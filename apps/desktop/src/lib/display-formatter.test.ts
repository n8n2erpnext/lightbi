import { describe, it, expect } from 'vitest';
import { formatValue, inferSemanticType } from './display-formatter';
import { DEFAULT_PREFERENCES } from '../stores/display-preferences-store';

describe('display-formatter inferSemanticType', () => {
  it('infers currency correctly', () => {
    expect(inferSemanticType('revenue', 1000)).toBe('currency');
    expect(inferSemanticType('Doanh Thu', 1000)).toBe('currency');
    expect(inferSemanticType('price', 50.5)).toBe('currency');
  });

  it('infers numbers correctly', () => {
    expect(inferSemanticType('quantity', 100)).toBe('number');
    expect(inferSemanticType('age', 25)).toBe('number');
  });

  it('keeps numeric identifiers and Vietnamese mã columns as strings', () => {
    expect(inferSemanticType('Mã kho xuất', 6968)).toBe('string');
    expect(inferSemanticType('Mã phiếu xuất', 21090069680195476)).toBe('string');
    expect(inferSemanticType('ORDERID', 21090069680195476)).toBe('string');
    expect(inferSemanticType('CUSTOMERID', 9117)).toBe('string');
  });

  it('infers dates correctly', () => {
    expect(inferSemanticType('created_at', '2024-01-01')).toBe('date');
    expect(inferSemanticType('updated_at', '2024-01-01 14:30:00')).toBe('datetime');
    expect(inferSemanticType('time', '14:30:00')).toBe('time');
  });

  it('infers numeric epoch values as dates when the column name is date-like', () => {
    expect(inferSemanticType('ORDERDATE', 1714953600000)).toBe('date');
    expect(inferSemanticType('created_at', 1714953600)).toBe('datetime');
  });
});

describe('display-formatter formatValue', () => {
  it('formats numbers with commas in en-US', () => {
    const formatted = formatValue(1234567.89, 'number', { ...DEFAULT_PREFERENCES, locale: 'en-US' });
    expect(formatted).toBe('1,234,567.89');
  });

  it('does not add thousands separators to identifier-like values formatted as strings', () => {
    const semanticType = inferSemanticType('Mã kho xuất', 6968);
    expect(formatValue(6968, semanticType, { ...DEFAULT_PREFERENCES, locale: 'vi-VN' })).toBe('6968');
  });

  it('formats numbers with dots in vi-VN', () => {
    const formatted = formatValue(1234567.89, 'number', { ...DEFAULT_PREFERENCES, locale: 'vi-VN' });
    // Note: vi-VN might use non-breaking space or dot depending on the engine, but usually dot for thousands, comma for decimal
    expect(formatted).toMatch(/1\.234\.567,89/);
  });

  it('formats arabic numbers in ar-SA', () => {
    const formatted = formatValue(1234.56, 'number', { ...DEFAULT_PREFERENCES, locale: 'ar-SA' });
    // Arabic digits: ١٬٢٣٤٫٥٦
    expect(formatted).toContain('١');
    expect(formatted).toContain('٢');
  });

  it('applies accounting negative style', () => {
    const formatted = formatValue(-1000, 'number', { ...DEFAULT_PREFERENCES, locale: 'en-US', negativeStyle: 'parentheses' });
    expect(formatted).toBe('(1,000)');
  });

  it('formats currency for VND', () => {
    const formatted = formatValue(1000000, 'currency', { ...DEFAULT_PREFERENCES, locale: 'vi-VN' });
    // VND usually renders as 1.000.000 ₫
    expect(formatted).toMatch(/1\.000\.000\s*₫/);
  });

  it('returns "-" for null or empty values', () => {
    expect(formatValue(null, 'number', DEFAULT_PREFERENCES)).toBe('-');
    expect(formatValue(undefined, 'string', DEFAULT_PREFERENCES)).toBe('-');
    expect(formatValue('', 'currency', DEFAULT_PREFERENCES)).toBe('-');
  });

  it('overrides thousands separator to space (French style) even in en-US locale', () => {
    const formatted = formatValue(1000000, 'number', { ...DEFAULT_PREFERENCES, locale: 'en-US', thousandsSeparator: 'space' });
    // Should use space 1 000 000
    expect(formatted.replace(/\u202F/g, ' ')).toMatch(/1 000 000/); // Intl uses narrow no-break space \u202F for fr-FR
  });

  it('formats date according to short preference', () => {
    const d = '2024-12-31';
    const formatted = formatValue(d, 'date', { ...DEFAULT_PREFERENCES, locale: 'en-US', dateFormat: 'short' });
    expect(formatted).toBe('12/31/24');
  });

  it('formats epoch milliseconds as a date instead of a large number', () => {
    const formatted = formatValue(1714953600000, 'date', { ...DEFAULT_PREFERENCES, locale: 'en-US', dateFormat: 'iso', timezone: 'UTC' });
    expect(formatted).toBe('2024-05-06');
  });

  it('formats Excel serial dates as dates', () => {
    const formatted = formatValue(45645, 'date', { ...DEFAULT_PREFERENCES, locale: 'en-US', dateFormat: 'iso', timezone: 'UTC' });
    expect(formatted).toBe('2024-12-19');
  });

  it('formats datetime according to compact preference', () => {
    const d = '2024-12-31T14:30:00Z';
    const compact = formatValue(d, 'datetime', { ...DEFAULT_PREFERENCES, locale: 'en-US', datetimeFormat: 'compact', timezone: 'UTC' });
    const detailed = formatValue(d, 'datetime', { ...DEFAULT_PREFERENCES, locale: 'en-US', datetimeFormat: 'detailed', timezone: 'UTC' });
    expect(compact).toBe('12/31/24, 2:30 PM');
    expect(detailed.length).toBeGreaterThan(compact.length);
  });

  it('formats time-only strings reliably without timezone shift', () => {
    const t = '14:30:00';
    const formatted12 = formatValue(t, 'time', { ...DEFAULT_PREFERENCES, locale: 'en-US', timeFormat: '12h' });
    const formatted24 = formatValue(t, 'time', { ...DEFAULT_PREFERENCES, locale: 'en-US', timeFormat: '24h' });
    
    // Using UTC internally should keep 14:30 as 14:30 or 2:30 PM
    expect(formatted12).toMatch(/2:30/);
    expect(formatted12).toMatch(/PM/i);
    expect(formatted24).toMatch(/14:30/);
  });
});
