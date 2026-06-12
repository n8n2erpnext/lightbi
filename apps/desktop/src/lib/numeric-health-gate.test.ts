import { describe, it, expect } from 'vitest';
import { evaluateNumericHealth } from './numeric-health-gate';

describe('evaluateNumericHealth', () => {
  it('identifies a perfectly clean numeric array', () => {
    const samples = [1000, 1000.5, '2000', '-500'];
    const result = evaluateNumericHealth('clean_revenue', samples);
    
    expect(result.isSafeForSum).toBe(true);
    expect(result.parseSuccessRate).toBe(1.0);
    expect(result.needsCleansing).toBe(false);
  });

  it('identifies and accepts numbers with commas and flags cleansing', () => {
    const samples = ['1,000', '1,000,000', '500,000'];
    const result = evaluateNumericHealth('comma_revenue', samples);
    
    expect(result.isSafeForSum).toBe(true);
    expect(result.parseSuccessRate).toBe(1.0);
    expect(result.needsCleansing).toBe(true);
  });

  it('identifies Vietnamese currency formats and flags cleansing', () => {
    const samples = ['1.000.000đ', '500.000 VNĐ', '2.500.000 đ'];
    const result = evaluateNumericHealth('vn_revenue', samples);
    
    expect(result.isSafeForSum).toBe(true);
    expect(result.parseSuccessRate).toBe(1.0);
    expect(result.needsCleansing).toBe(true);
  });

  it('ignores true nulls and undefined in the denominator', () => {
    const samples = [1000, null, 2000, undefined, 3000];
    const result = evaluateNumericHealth('sparse_revenue', samples);
    
    expect(result.isSafeForSum).toBe(true);
    // 3 valid samples, all 3 succeeded. Rate = 1.0.
    expect(result.parseSuccessRate).toBe(1.0);
    expect(result.needsCleansing).toBe(false);
  });

  it('fails the trust gate if garbage strings drop success rate below 95%', () => {
    // 10 samples: 8 good, 2 garbage = 80% success rate
    const samples = [
      '100', '200', '300', '400', '500', 
      '600', '700', '800', 'N/A', 'abc'
    ];
    const result = evaluateNumericHealth('dirty_revenue', samples);
    
    expect(result.isSafeForSum).toBe(false);
    expect(result.parseSuccessRate).toBe(0.8);
    expect(result.needsCleansing).toBe(false);
  });

  it('treats empty strings and spaces as garbage and fails the gate if threshold not met', () => {
    // 20 samples: 18 good, 2 empty = 90%
    const samples = Array(18).fill('1000').concat(['', '   ']);
    const result = evaluateNumericHealth('empty_str_revenue', samples);
    
    expect(result.isSafeForSum).toBe(false);
    expect(result.parseSuccessRate).toBe(0.9);
  });

  it('passes the trust gate if garbage is under 5%', () => {
    // 100 samples: 96 good, 4 garbage = 96%
    const samples = Array(96).fill('1,000đ').concat(['N/A', 'N/A', '', 'abc']);
    const result = evaluateNumericHealth('mostly_clean_revenue', samples);
    
    expect(result.isSafeForSum).toBe(true);
    expect(result.parseSuccessRate).toBe(0.96);
    expect(result.needsCleansing).toBe(true);
  });

  it('hard-blocks decimal-looking strings (US format)', () => {
    const samples = ['1000.50', '2000.75'];
    const result = evaluateNumericHealth('us_decimal', samples);
    
    expect(result.isSafeForSum).toBe(false);
    expect(result.parseSuccessRate).toBe(0.0);
  });

  it('hard-blocks decimal-looking strings (EU format)', () => {
    const samples = ['1000,50', '2000,75'];
    const result = evaluateNumericHealth('eu_decimal', samples);
    
    expect(result.isSafeForSum).toBe(false);
    expect(result.parseSuccessRate).toBe(0.0);
  });

  it('hard-blocks mixed separator strings', () => {
    const samples = ['1,000.50', '1.000,50'];
    const result = evaluateNumericHealth('mixed_separators', samples);
    
    expect(result.isSafeForSum).toBe(false);
    expect(result.parseSuccessRate).toBe(0.0);
  });

  it('allows safe thousands separators', () => {
    const samples = ['1000', '1,000', '$1,000', '1.000.000đ', 'VNĐ 250000'];
    const result = evaluateNumericHealth('safe_thousands', samples);
    
    expect(result.isSafeForSum).toBe(true);
    expect(result.parseSuccessRate).toBe(1.0);
  });
});
