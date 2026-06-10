import { describe, it, expect } from 'vitest';
import { detectBusinessSignals, normalizeString } from './business-signal-detector';

describe('normalizeString', () => {
  it('normalizes Vietnamese characters correctly', () => {
    expect(normalizeString('Tài xế')).toBe('tai xe');
    expect(normalizeString('Tai xe')).toBe('tai xe');
    expect(normalizeString('tài-xế')).toBe('tai xe');
    expect(normalizeString('tai_xe')).toBe('tai xe');
    expect(normalizeString('NHÂN VIÊN GIAO HÀNG')).toBe('nhan vien giao hang');
  });
});

describe('Business Signal Detector MVP', () => {
  it('maps various Driver aliases to canonical driver signal', () => {
    const input = {
      columns: [
        { name: 'Driver', type: 'VARCHAR' },
        { name: 'Courier', type: 'VARCHAR' },
        { name: 'Shipper', type: 'VARCHAR' },
        { name: 'Tài xế', type: 'VARCHAR' },
        { name: 'NHÂN VIÊN GIAO HÀNG', type: 'VARCHAR' }
      ]
    };

    const registry = detectBusinessSignals(input);
    const driverSignal = registry.getSignal('driver');

    expect(driverSignal).toBeDefined();
    expect(driverSignal?.domain).toBe('operations');
    // Ensure duplicate candidates merge into one signal
    expect(registry.signals.length).toBe(1);
    // Evidence length should equal the number of matches
    expect(driverSignal?.supportingEvidence.length).toBe(5);
    // Score should be 50 (40 alias match + 10 profile support)
    expect(driverSignal?.confidenceScore).toBe(50);
    // Relationship support must exist and default to 0
    expect(driverSignal?.supportingEvidence[0].breakdown.relationshipSupport).toBe(0);
  });

  it('maps Route aliases correctly', () => {
    const input = {
      columns: [
        { name: 'Route' },
        { name: 'Zone' },
        { name: 'Region' },
        { name: 'Tuyến xe' },
        { name: 'Khu vực phát' }
      ]
    };

    const registry = detectBusinessSignals(input);
    const routeSignal = registry.getSignal('route');
    
    expect(routeSignal).toBeDefined();
    expect(registry.signals.length).toBe(1);
    expect(routeSignal?.supportingEvidence.length).toBe(5);
  });

  it('maps Inventory aliases correctly', () => {
    const input = {
      columns: [
        { name: 'SKU' },
        { name: 'Product Code' },
        { name: 'Item Code' }
      ]
    };

    const registry = detectBusinessSignals(input);
    expect(registry.hasSignal('sku')).toBe(true);
    expect(registry.signals.length).toBe(1);
  });

  it('produces no signals for unknown columns', () => {
    const input = {
      columns: [
        { name: 'random_id' },
        { name: 'metadata_info' },
        { name: 'unknown_stuff' }
      ]
    };

    const registry = detectBusinessSignals(input);
    expect(registry.signals.length).toBe(0);
  });

  it('isolates exact signals from a mixed dataset', () => {
    const input = {
      columns: [
        { name: 'Driver', type: 'VARCHAR' },
        { name: 'Route', type: 'VARCHAR' },
        { name: 'Status', type: 'VARCHAR' },
        { name: 'unknown_col' }
      ],
      semanticTags: {
        'Status': 'delivery_status'
      }
    };

    const registry = detectBusinessSignals(input);
    
    expect(registry.signals.length).toBe(3);
    expect(registry.hasSignal('driver')).toBe(true);
    expect(registry.hasSignal('route')).toBe(true);
    expect(registry.hasSignal('delivery_status')).toBe(true);
    
    // Status matched generic status alias (40) + profile support (10) = 50. Then promoted to delivery_status.
    const statusSignal = registry.getSignal('delivery_status');
    expect(statusSignal?.confidenceScore).toBe(50);
    // Since it was promoted from 'status', the semantic tag match for 'delivery_status' was on a different candidate,
    // we just check it exists.
    expect(statusSignal).toBeDefined();
  });

  it('should not emit Perspectives or Questions', () => {
    const input = {
      columns: [
        { name: 'Driver', type: 'VARCHAR' }
      ]
    };
    const registry = detectBusinessSignals(input);
    // Registry shape validation
    expect(registry).not.toHaveProperty('perspectives');
    expect(registry).not.toHaveProperty('questions');
    expect(registry).not.toHaveProperty('businessViews');
  });
});
