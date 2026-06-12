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
    // Score should be 60 (40 alias match + 10 profile support + 10 string dimension)
    expect(driverSignal?.confidenceScore).toBe(60);
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
    
    // Status matched generic status alias (40) + profile support (10) + string dimension boost (10) = 60. Then promoted to delivery_status.
    const statusSignal = registry.getSignal('delivery_status');
    expect(statusSignal?.confidenceScore).toBe(60);
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

describe('Cheap Local Evidence Boosting', () => {
  it('boosts time signals when sample values parse as dates', () => {
    const input = {
      columns: [
        { 
          name: 'Ngày báo cáo', 
          type: 'VARCHAR',
          sampleValues: ['2023-01-01', '2023-01-02', '2023-01-03']
        }
      ]
    };
    const registry = detectBusinessSignals(input);
    const signal = registry.getSignal('report_date');
    // alias match (40) + base profile (10) + date-like sample values (20) = 70
    expect(signal?.confidenceScore).toBe(70);
  });

  it('boosts status dimensions for low cardinality', () => {
    const input = {
      columns: [
        { 
          name: 'Status', 
          type: 'VARCHAR',
          uniqueValuesCount: 3,
          distinctRatio: 0.01
        }
      ]
    };
    const registry = detectBusinessSignals(input);
    const signal = registry.getSignal('status');
    // alias match (40) + base profile (10) + string dimension (10) + low cardinality status (20) = 80
    expect(signal?.confidenceScore).toBe(80);
  });

  it('reinforces measures when values are numeric, penalizes when string without numeric samples', () => {
    const inputGood = {
      columns: [
        { 
          name: 'Revenue', 
          type: 'number'
        }
      ]
    };
    const registryGood = detectBusinessSignals(inputGood);
    const signalGood = registryGood.getSignal('revenue');
    // alias (40) + base profile (10) + numeric type (20) = 70
    expect(signalGood?.confidenceScore).toBe(70);

    const inputBad = {
      columns: [
        { 
          name: 'Revenue', 
          type: 'string',
          sampleValues: ['High', 'Medium', 'Low']
        }
      ]
    };
    const registryBad = detectBusinessSignals(inputBad);
    const signalBad = registryBad.getSignal('revenue');
    // alias (40) + base profile (10) - categorical penalty (10) = 40
    expect(signalBad?.confidenceScore).toBe(40);
  });

  it('uses distinct-ratio hints for identifiers', () => {
    const input = {
      columns: [
        { 
          name: 'SKU', 
          type: 'VARCHAR',
          distinctRatio: 0.95
        }
      ]
    };
    const registry = detectBusinessSignals(input);
    const signal = registry.getSignal('sku');
    // alias (40) + base profile (10) + string dimension (10) + high distinct ratio for identifier (15) = 75
    expect(signal?.confidenceScore).toBe(75);
  });
});

describe('Alias Resolution (Phase 2)', () => {
  it('strips safe affixes to match taxonomy', () => {
    const input = {
      columns: [
        { name: 'revenue_amount', type: 'number' },
        { name: 'driver_name', type: 'VARCHAR' },
        { name: 'customer_id', type: 'VARCHAR' },
        // Instead of testing `value_profit` prefix (profit might not be in taxonomy), let's test `id_customer` if possible
        { name: 'id_customer', type: 'VARCHAR' }
      ]
    };

    const registry = detectBusinessSignals(input);
    
    // revenue_amount -> revenue
    expect(registry.hasSignal('revenue')).toBe(true);
    const revSignal = registry.getSignal('revenue');
    expect(revSignal?.supportingEvidence[0].breakdown.columnAliasMatch).toBe(30);

    // driver_name -> driver
    expect(registry.hasSignal('driver')).toBe(true);
    
    // customer_id and id_customer both map to customer, creating 2 evidences
    expect(registry.hasSignal('customer')).toBe(true);
    const custSignal = registry.getSignal('customer');
    expect(custSignal?.supportingEvidence.length).toBe(2);
  });

  it('prefers exact match over variant match if both exist', () => {
    const input = {
      columns: [
        { name: 'revenue_amount', type: 'number' }, // Variant (30)
        { name: 'revenue', type: 'number' } // Exact (40)
      ]
    };

    const registry = detectBusinessSignals(input);
    const revSignal = registry.getSignal('revenue');
    
    expect(registry.hasSignal('revenue')).toBe(true);
    // revenue = 40 + 10 (base) + 20 (number) = 70. 
    expect(revSignal?.confidenceScore).toBe(70);
    expect(revSignal?.supportingEvidence.length).toBe(2);
  });

  it('does not overmatch generic columns or inner substrings', () => {
    const input = {
      columns: [
        { name: 'amount', type: 'number' },
        { name: 'value', type: 'number' },
        { name: 'id', type: 'VARCHAR' },
        { name: 'name', type: 'VARCHAR' },
        { name: 'amount_value', type: 'number' },
        { name: 'valid', type: 'VARCHAR' } // 'valid' shouldn't be stripped to 'val' since distinct boundaries are enforced by `_id`->` id` conversion
      ]
    };

    const registry = detectBusinessSignals(input);
    expect(registry.signals.length).toBe(0);
  });
});

describe('Alias Resolution (Batch 2 - Type-Aware Guardrails)', () => {
  it('correctly maps Batch 2 allowed patterns', () => {
    const input = {
      columns: [
        { name: 'order_date', type: 'VARCHAR' }, // time -> time
        { name: 'report_time', type: 'VARCHAR' }, // time -> time
        { name: 'product_code', type: 'VARCHAR' }, // dimension -> dimension
        { name: 'branch_code', type: 'VARCHAR' }, // dimension -> dimension
        { name: 'route_no', type: 'VARCHAR' }, // dimension -> dimension
        { name: 'stock_qty', type: 'number' }, // measure -> measure
        { name: 'order_qty', type: 'number' }, // measure -> measure
        { name: 'total_revenue', type: 'number' } // measure -> measure
      ]
    };
    
    const registry = detectBusinessSignals(input);
    
    // time signals
    // report_time should map to report_date (since report_date has alias "report")
    expect(registry.hasSignal('report_date')).toBe(true);
    
    // dimensions
    expect(registry.hasSignal('sku')).toBe(true); // product_code is an exact alias for sku
    expect(registry.hasSignal('branch')).toBe(true); // branch_code -> branch
    expect(registry.hasSignal('route')).toBe(true);
    expect(registry.hasSignal('route')).toBe(true);
    
    // measures
    expect(registry.hasSignal('stock_qty')).toBe(true); // stock_qty is an exact match for stock_qty
    expect(registry.hasSignal('order')).toBe(true); // order_qty -> order
    expect(registry.hasSignal('revenue')).toBe(true);
  });

  it('enforces Type-Aware Guardrails (prevents false positives)', () => {
    const input = {
      columns: [
        { name: 'revenue_date', type: 'VARCHAR' }, // shouldn't map to revenue (measure)
        { name: 'customer_qty', type: 'number' }, // shouldn't map to customer (dimension)
        { name: 'sales_code', type: 'VARCHAR' }, // shouldn't map to sales (measure)
        { name: 'product_type', type: 'VARCHAR' }, // "type" is not an allowed affix, shouldn't map to product
        { name: 'customer_group', type: 'VARCHAR' }, // "group" is not allowed
        { name: 'category_code', type: 'VARCHAR' } // "category" is not in taxonomy, shouldn't map to anything
      ]
    };

    const registry = detectBusinessSignals(input);
    
    expect(registry.hasSignal('revenue')).toBe(false);
    expect(registry.hasSignal('customer')).toBe(false);
    expect(registry.hasSignal('sales')).toBe(false);
    expect(registry.hasSignal('product')).toBe(false);
  });
});

describe('Taxonomy Expansion (Phase 1)', () => {
  it('correctly maps specific semantic phrases', () => {
    const input = {
      columns: [
        { name: 'profit_net', type: 'number' },
        { name: 'margin_pct', type: 'number' },
        { name: 'expense_misc', type: 'number' },
        { name: 'discount_amt', type: 'number' },
        { name: 'delay_minutes', type: 'number' },
        { name: 'vehicle_plate', type: 'VARCHAR' },
        { name: 'sla_met', type: 'VARCHAR' }
      ]
    };
    
    const registry = detectBusinessSignals(input);
    
    expect(registry.hasSignal('profit')).toBe(true);
    expect(registry.hasSignal('margin')).toBe(true);
    expect(registry.hasSignal('expense')).toBe(true);
    expect(registry.hasSignal('discount')).toBe(true);
    expect(registry.hasSignal('delay')).toBe(true);
    expect(registry.hasSignal('vehicle')).toBe(true);
    expect(registry.hasSignal('sla')).toBe(true);
  });

  it('strictly blocks forbidden single semantic tokens', () => {
    const input = {
      columns: [
        { name: 'net', type: 'number' },
        { name: 'pct', type: 'number' },
        { name: 'misc', type: 'number' },
        { name: 'amt', type: 'number' },
        { name: 'minutes', type: 'number' },
        { name: 'plate', type: 'VARCHAR' },
        { name: 'met', type: 'VARCHAR' }
      ]
    };

    const registry = detectBusinessSignals(input);
    
    expect(registry.signals.length).toBe(0);
  });
});

describe('Taxonomy Expansion (Phase 2)', () => {
  it('correctly maps specific generic time buckets', () => {
    const input = {
      columns: [
        { name: 'period', type: 'VARCHAR' },
        { name: 'month', type: 'number' },
        { name: 'fiscal period', type: 'VARCHAR' }
      ]
    };
    
    const registry = detectBusinessSignals(input);
    
    expect(registry.hasSignal('time_period')).toBe(true);
    expect(registry.signals.length).toBe(1); // since it's the same signal ID
  });

  it('strictly blocks forbidden domain-bleeding dimensions and discrete time', () => {
    const input = {
      columns: [
        { name: 'category', type: 'VARCHAR' },
        { name: 'type', type: 'VARCHAR' },
        { name: 'group', type: 'VARCHAR' },
        { name: 'date', type: 'VARCHAR' },
        { name: 'time', type: 'VARCHAR' },
        { name: 'customer_group', type: 'VARCHAR' },
        { name: 'product_type', type: 'VARCHAR' }
      ]
    };

    const registry = detectBusinessSignals(input);
    
    expect(registry.signals.length).toBe(0);
  });
});

describe('Trust & Mapping Review Overlay', () => {
  it('correctly classifies unrecognized, recognized, conflicting, ambiguous', () => {
    const input = {
      columns: [
        { name: 'revenue_amount', type: 'number' },
        { name: 'revenue_value', type: 'number' },
        { name: 'random_id', type: 'VARCHAR' },
        { name: 'route', type: 'VARCHAR' }
      ]
    };

    const registry = detectBusinessSignals(input);
    const review = registry.mappingReview?.items;
    
    expect(review).toBeDefined();
    
    const unrecognized = review?.find(i => i.physicalColumn === 'random_id');
    expect(unrecognized?.issueType).toBe('unrecognized');
    
    const recognized = review?.find(i => i.physicalColumn === 'route');
    expect(recognized?.issueType).toBe('recognized');
    
    const conflicting1 = review?.find(i => i.physicalColumn === 'revenue_amount');
    const conflicting2 = review?.find(i => i.physicalColumn === 'revenue_value');
    expect(conflicting1?.issueType).toBe('conflicting');
    expect(conflicting2?.issueType).toBe('conflicting');
  });

  it('map_temporary overlay action updates classification and confidence', () => {
    const input = {
      columns: [
        { name: 'random_col', type: 'VARCHAR' }
      ],
      overlayActions: [
        {
          physicalColumn: 'random_col',
          actionType: 'map_temporary' as any,
          targetSignal: 'warehouse'
        }
      ]
    };

    const registry = detectBusinessSignals(input);
    
    // Should now be recognized as 'warehouse'
    expect(registry.hasSignal('warehouse')).toBe(true);
    const signal = registry.getSignal('warehouse');
    expect(signal?.confidenceScore).toBe(100);

    const review = registry.mappingReview?.items;
    const recognized = review?.find(i => i.physicalColumn === 'random_col');
    expect(recognized?.issueType).toBe('recognized');
    expect(recognized?.inferredSignal).toBe('warehouse');
  });

  it('ignore_mismatch overlay action removes the column from mapping completely', () => {
    const input = {
      columns: [
        { name: 'route', type: 'VARCHAR' },
        { name: 'route_id', type: 'VARCHAR' }
      ],
      overlayActions: [
        {
          physicalColumn: 'route_id',
          actionType: 'ignore_mismatch' as any
        }
      ]
    };

    const registry = detectBusinessSignals(input);
    
    // route should now be cleanly recognized since route_id is ignored
    const review = registry.mappingReview?.items;
    expect(review?.length).toBe(1); // route_id is filtered out completely
    
    const recognized = review?.find(i => i.physicalColumn === 'route');
    expect(recognized?.issueType).toBe('recognized');
  });

  it('keep_raw_unchanged overlay action maintains raw source interpretation without mutation', () => {
    // This proves that keep_raw_unchanged doesn't mutate the raw interpretation
    const input = {
      columns: [
        { name: 'random_col', type: 'VARCHAR' }
      ],
      overlayActions: [
        // Assume the UI sends keep_raw_unchanged for this col, it should be ignored by the detector,
        // leaving the raw columns array intact and the column unrecognized as expected.
        {
          physicalColumn: 'random_col',
          actionType: 'keep_raw_unchanged' as any
        }
      ]
    };

    const registry = detectBusinessSignals(input);
    const review = registry.mappingReview?.items;
    
    // Column should just be unrecognized naturally
    const recognized = review?.find(i => i.physicalColumn === 'random_col');
    expect(recognized?.issueType).toBe('unrecognized');
  });
});
