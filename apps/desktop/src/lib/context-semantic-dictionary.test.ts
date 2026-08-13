import { describe, expect, it } from 'vitest';
import { CONTEXT_SEMANTIC_DICTIONARY_V1, inferContextSemanticCandidates } from './context-semantic-dictionary';
import { TAXONOMY, detectBusinessSignals } from './business-signal-detector';

describe('context semantic dictionary', () => {
  it('covers every supported BA runtime domain', () => {
    const coveredDomains = new Set(CONTEXT_SEMANTIC_DICTIONARY_V1.flatMap(entry => entry.domains));
    expect([...coveredDomains]).toEqual(expect.arrayContaining([
      'operations',
      'revenue',
      'inventory',
      'customer',
      'performance',
      'finance'
    ]));
  });

  it('keeps dictionary canonical IDs aligned with the runtime taxonomy', () => {
    const taxonomySignals = new Set(Object.keys(TAXONOMY));
    const missingSignals = CONTEXT_SEMANTIC_DICTIONARY_V1
      .map(entry => entry.canonicalId)
      .filter(canonicalId => !taxonomySignals.has(canonicalId));

    expect(missingSignals).toEqual([]);
  });

  it('infers payment method from values when the header is generic', () => {
    const registry = detectBusinessSignals({
      columns: [{
        name: 'Type',
        type: 'string',
        sampleValues: ['Tiền mặt', 'Trả góp', 'Chuyển khoản', 'Tiền mặt'],
        uniqueValuesCount: 3,
        distinctRatio: 0.75
      }]
    });

    expect(registry.hasSignal('payment_method')).toBe(true);
    const signal = registry.getSignal('payment_method');
    expect(signal?.supportingEvidence.some(evidence => evidence.breakdown.valueSupport && evidence.breakdown.valueSupport > 0)).toBe(true);
    expect(['recognized', 'partial']).toContain(registry.semanticCoverage?.items[0]?.status);
    expect(registry.semanticCoverage?.items[0]?.inferredSignal).toBe('payment_method');
  });

  it('infers delivery status from categorical values when the header is unclear', () => {
    const registry = detectBusinessSignals({
      columns: [{
        name: 'Mode',
        type: 'string',
        sampleValues: ['Đã giao', 'Hoàn tất', 'Giao lại', 'Đang giao'],
        uniqueValuesCount: 4,
        distinctRatio: 1
      }]
    });

    expect(registry.hasSignal('delivery_status')).toBe(true);
    expect(registry.semanticCoverage?.items[0]?.inferredSignal).toBe('delivery_status');
  });

  it('infers carrier from logistics provider values without depending on the sample filename', () => {
    const candidates = inferContextSemanticCandidates({
      name: 'Provider',
      type: 'string',
      sampleValues: ['Nội bộ', 'GHN', 'Ahamove', 'Xe thuê ngoài'],
      uniqueValuesCount: 4,
      distinctRatio: 1
    });

    expect(candidates[0]?.canonicalId).toBe('carrier');

    const registry = detectBusinessSignals({
      columns: [{
        name: 'Provider',
        type: 'string',
        sampleValues: ['Nội bộ', 'GHN', 'Ahamove', 'Xe thuê ngoài'],
        uniqueValuesCount: 4,
        distinctRatio: 1
      }]
    });
    expect(registry.hasSignal('carrier')).toBe(true);
  });

  it('marks header/value disagreement as partial instead of blindly trusting the header', () => {
    const registry = detectBusinessSignals({
      columns: [{
        name: 'Customer',
        type: 'string',
        sampleValues: ['Tiền mặt', 'Trả góp', 'Chuyển khoản', 'Tiền mặt'],
        uniqueValuesCount: 3,
        distinctRatio: 0.75
      }]
    });

    expect(registry.hasSignal('customer')).toBe(true);
    expect(registry.hasSignal('payment_method')).toBe(true);
    const coverageItem = registry.semanticCoverage?.items.find(item => item.physicalColumn === 'Customer');
    expect(coverageItem?.status).toBe('partial');
    expect(coverageItem?.reason).toContain('business signal');
  });

  it('keeps unknown business-like categorical columns visible for review', () => {
    const registry = detectBusinessSignals({
      columns: [{
        name: 'DecisionMode',
        type: 'string',
        sampleValues: ['Internal', 'External', 'External', 'Internal'],
        uniqueValuesCount: 2,
        distinctRatio: 0.5
      }]
    });

    const coverageItem = registry.semanticCoverage?.items.find(item => item.physicalColumn === 'DecisionMode');
    expect(coverageItem?.status).toBe('unknown_business_like');
  });

  it('infers inventory status from values without needing a perfect header', () => {
    const registry = detectBusinessSignals({
      columns: [{
        name: 'State',
        type: 'string',
        sampleValues: ['In stock', 'Low stock', 'Out of stock', 'Overstock'],
        uniqueValuesCount: 4,
        distinctRatio: 1
      }]
    });

    expect(registry.hasSignal('stock_status')).toBe(true);
    expect(registry.semanticCoverage?.items[0]?.inferredSignal).toBe('stock_status');
  });

  it('uses neighbor evidence to disambiguate generic delivery status columns', () => {
    const registry = detectBusinessSignals({
      columns: [
        {
          name: 'State',
          type: 'string',
          sampleValues: ['Completed', 'Retry', 'Pending', 'Delivered'],
          uniqueValuesCount: 4,
          distinctRatio: 1
        },
        {
          name: 'ShipmentID',
          type: 'string',
          sampleValues: ['SHP001', 'SHP002'],
          uniqueValuesCount: 2,
          distinctRatio: 1
        },
        {
          name: 'DeliveryFee',
          type: 'number',
          sampleValues: [25000, 32000],
          uniqueValuesCount: 2,
          distinctRatio: 1
        }
      ]
    });

    const signal = registry.getSignal('delivery_status');
    expect(signal).toBeDefined();
    expect(signal?.supportingEvidence.some(evidence => evidence.columnName === 'State' && (evidence.breakdown.neighborSupport ?? 0) > 0)).toBe(true);
  });

  it('uses neighbor evidence to disambiguate generic inventory status columns', () => {
    const registry = detectBusinessSignals({
      columns: [
        {
          name: 'State',
          type: 'string',
          sampleValues: ['Low stock', 'Out of stock', 'In stock', 'Overstock'],
          uniqueValuesCount: 4,
          distinctRatio: 1
        },
        {
          name: 'SKU',
          type: 'string',
          sampleValues: ['SKU001', 'SKU002'],
          uniqueValuesCount: 2,
          distinctRatio: 1
        },
        {
          name: 'Warehouse',
          type: 'string',
          sampleValues: ['WH01', 'WH02'],
          uniqueValuesCount: 2,
          distinctRatio: 1
        }
      ]
    });

    const signal = registry.getSignal('stock_status');
    expect(signal).toBeDefined();
    expect(signal?.supportingEvidence.some(evidence => evidence.columnName === 'State' && (evidence.breakdown.neighborSupport ?? 0) > 0)).toBe(true);
  });

  it('uses cross-file context as supporting evidence, not as a standalone hallucination', () => {
    const registry = detectBusinessSignals({
      columns: [{
        name: 'Tender',
        type: 'string',
        sampleValues: ['Cash', 'Installment', 'Card', 'Bank transfer'],
        uniqueValuesCount: 4,
        distinctRatio: 1
      }],
      semanticContext: {
        crossFileSignals: ['invoice_total', 'receivable', 'customer'],
        crossFileColumnNames: ['InvoiceNo', 'AR_Debit', 'CustomerID']
      }
    });

    const signal = registry.getSignal('payment_method');
    expect(signal).toBeDefined();
    expect(signal?.supportingEvidence.some(evidence => (evidence.breakdown.crossFileSupport ?? 0) > 0)).toBe(true);

    const weakRegistry = detectBusinessSignals({
      columns: [{
        name: 'DecisionMode',
        type: 'string',
        sampleValues: ['Internal', 'External', 'External', 'Internal'],
        uniqueValuesCount: 2,
        distinctRatio: 0.5
      }],
      semanticContext: {
        crossFileSignals: ['invoice_total', 'receivable']
      }
    });
    expect(weakRegistry.hasSignal('payment_method')).toBe(false);
  });

  it('infers performance achievement from outcome values', () => {
    const registry = detectBusinessSignals({
      columns: [{
        name: 'Outcome',
        type: 'string',
        sampleValues: ['Achieved', 'Missed', 'Met', 'Not achieved'],
        uniqueValuesCount: 4,
        distinctRatio: 1
      }]
    });

    expect(registry.hasSignal('achievement')).toBe(true);
    expect(registry.semanticCoverage?.items[0]?.inferredSignal).toBe('achievement');
  });

  it('recognizes compact enterprise headers such as SalesOrderNo and TripID', () => {
    const orderCandidates = inferContextSemanticCandidates({
      name: 'SalesOrderNo',
      type: 'string',
      sampleValues: ['SO-001', 'SO-002'],
      uniqueValuesCount: 2,
      distinctRatio: 1
    });
    const tripCandidates = inferContextSemanticCandidates({
      name: 'TripID',
      type: 'string',
      sampleValues: ['TRIP-001', 'TRIP-002'],
      uniqueValuesCount: 2,
      distinctRatio: 1
    });

    expect(orderCandidates.map(candidate => candidate.canonicalId)).toContain('sales_order');
    expect(tripCandidates.map(candidate => candidate.canonicalId)).toContain('trip');
  });

  it('recognizes Salesforce-style sales and service exports', () => {
    const registry = detectBusinessSignals({
      columns: [
        { name: 'AccountId', type: 'string', sampleValues: ['ACC001', 'ACC002'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'OpportunityId', type: 'string', sampleValues: ['OPP001', 'OPP002'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'StageName', type: 'string', sampleValues: ['Prospecting', 'Closed Won'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'CloseDate', type: 'date', sampleValues: ['2026-06-01', '2026-06-30'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'Amount', type: 'number', sampleValues: [1000, 2000], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'CaseNumber', type: 'string', sampleValues: ['CASE-1', 'CASE-2'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'Priority', type: 'string', sampleValues: ['High', 'Critical'], uniqueValuesCount: 2, distinctRatio: 1 }
      ]
    });

    expect(registry.hasSignal('account')).toBe(true);
    expect(registry.hasSignal('opportunity')).toBe(true);
    expect(registry.hasSignal('stage_name')).toBe(true);
    expect(registry.hasSignal('close_date')).toBe(true);
    expect(registry.hasSignal('ticket')).toBe(true);
    expect(registry.hasSignal('priority')).toBe(true);
  });

  it('recognizes SAP-style material, plant, movement, and billing fields', () => {
    const registry = detectBusinessSignals({
      columns: [
        { name: 'MATNR', type: 'string', sampleValues: ['MAT-001', 'MAT-002'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'WERKS', type: 'string', sampleValues: ['PL01', 'PL02'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'LGORT', type: 'string', sampleValues: ['S001', 'S002'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'BWART', type: 'string', sampleValues: ['101', '601'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'VBELN', type: 'string', sampleValues: ['BILL-001', 'BILL-002'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'BUKRS', type: 'string', sampleValues: ['1000', '2000'], uniqueValuesCount: 2, distinctRatio: 1 }
      ]
    });

    expect(registry.hasSignal('material')).toBe(true);
    expect(registry.hasSignal('plant')).toBe(true);
    expect(registry.hasSignal('storage_location')).toBe(true);
    expect(registry.hasSignal('movement_type')).toBe(true);
    expect(registry.hasSignal('billing_document')).toBe(true);
    expect(registry.hasSignal('company_code')).toBe(true);
  });

  it('recognizes ecommerce and fulfillment exports from common platform headers', () => {
    const registry = detectBusinessSignals({
      columns: [
        { name: 'FulfillmentStatus', type: 'string', sampleValues: ['fulfilled', 'partially fulfilled'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'SalesChannel', type: 'string', sampleValues: ['Shopify', 'Marketplace'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'RefundAmount', type: 'number', sampleValues: [0, 12000], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'Commission', type: 'number', sampleValues: [1000, 2000], uniqueValuesCount: 2, distinctRatio: 1 }
      ]
    });

    expect(registry.hasSignal('fulfillment_status')).toBe(true);
    expect(registry.hasSignal('sales_channel')).toBe(true);
    expect(registry.hasSignal('refund')).toBe(true);
    expect(registry.hasSignal('commission')).toBe(true);
  });

  it('recognizes POS and cashier settlement exports', () => {
    const registry = detectBusinessSignals({
      columns: [
        { name: 'POSTerminal', type: 'string', sampleValues: ['POS-01', 'POS-02'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'CashierName', type: 'string', sampleValues: ['NV001', 'NV002'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'CashCount', type: 'number', sampleValues: [1000000, 1200000], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'CouponCode', type: 'string', sampleValues: ['PROMO10', 'PROMO20'], uniqueValuesCount: 2, distinctRatio: 1 }
      ]
    });

    expect(registry.hasSignal('pos_terminal')).toBe(true);
    expect(registry.hasSignal('cashier')).toBe(true);
    expect(registry.hasSignal('shift_close')).toBe(true);
    expect(registry.hasSignal('coupon')).toBe(true);
  });

  it('recognizes bank statement and reconciliation exports', () => {
    const registry = detectBusinessSignals({
      columns: [
        { name: 'TransactionID', type: 'string', sampleValues: ['TXN001', 'TXN002'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'Narration', type: 'string', sampleValues: ['Customer payment', 'Supplier transfer'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'Deposit', type: 'number', sampleValues: [1000000, 0], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'Withdrawal', type: 'number', sampleValues: [0, 500000], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'RunningBalance', type: 'number', sampleValues: [1000000, 500000], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'ReconciliationStatus', type: 'string', sampleValues: ['Matched', 'Unmatched'], uniqueValuesCount: 2, distinctRatio: 1 }
      ]
    });

    expect(registry.hasSignal('bank_transaction')).toBe(true);
    expect(registry.hasSignal('transaction_description')).toBe(true);
    expect(registry.hasSignal('deposit_amount')).toBe(true);
    expect(registry.hasSignal('withdrawal_amount')).toBe(true);
    expect(registry.hasSignal('closing_balance')).toBe(true);
    expect(registry.hasSignal('reconciliation_status')).toBe(true);
  });

  it('recognizes marketing ads and web analytics exports', () => {
    const registry = detectBusinessSignals({
      columns: [
        { name: 'Campaign', type: 'string', sampleValues: ['Brand Search', 'Remarketing'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'Impressions', type: 'number', sampleValues: [1000, 2000], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'Clicks', type: 'number', sampleValues: [50, 90], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'AmountSpent', type: 'number', sampleValues: [500000, 750000], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'Conversions', type: 'number', sampleValues: [4, 8], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'LandingPage', type: 'string', sampleValues: ['/promo', '/checkout'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'DeviceType', type: 'string', sampleValues: ['Mobile', 'Desktop'], uniqueValuesCount: 2, distinctRatio: 1 }
      ]
    });

    expect(registry.hasSignal('campaign')).toBe(true);
    expect(registry.hasSignal('impressions')).toBe(true);
    expect(registry.hasSignal('clicks')).toBe(true);
    expect(registry.hasSignal('spend')).toBe(true);
    expect(registry.hasSignal('conversion')).toBe(true);
    expect(registry.hasSignal('landing_page')).toBe(true);
    expect(registry.hasSignal('device_type')).toBe(true);
  });

  it('recognizes HR payroll and attendance exports', () => {
    const registry = detectBusinessSignals({
      columns: [
        { name: 'EmployeeID', type: 'string', sampleValues: ['EMP001', 'EMP002'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'JobTitle', type: 'string', sampleValues: ['Sales Rep', 'Driver'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'HireDate', type: 'date', sampleValues: ['2024-01-01', '2025-02-01'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'GrossPay', type: 'number', sampleValues: [1000, 1200], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'LeaveType', type: 'string', sampleValues: ['Annual leave', 'Sick leave'], uniqueValuesCount: 2, distinctRatio: 1 }
      ]
    });

    expect(registry.hasSignal('employee_id')).toBe(true);
    expect(registry.hasSignal('job_title')).toBe(true);
    expect(registry.hasSignal('hire_date')).toBe(true);
    expect(registry.hasSignal('salary')).toBe(true);
    expect(registry.hasSignal('leave_type')).toBe(true);
  });

  it('recognizes maintenance, IoT, survey, education, and healthcare-like exports', () => {
    const registry = detectBusinessSignals({
      columns: [
        { name: 'AssetID', type: 'string', sampleValues: ['ASSET-1', 'ASSET-2'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'FailureCode', type: 'string', sampleValues: ['ERR01', 'ERR02'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'SensorID', type: 'string', sampleValues: ['SENSOR-1', 'SENSOR-2'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'Temperature', type: 'number', sampleValues: [28, 32], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'SurveyQuestion', type: 'string', sampleValues: ['How satisfied?', 'Would recommend?'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'RatingScore', type: 'number', sampleValues: [4, 5], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'StudentID', type: 'string', sampleValues: ['STU001', 'STU002'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'CourseName', type: 'string', sampleValues: ['Math', 'English'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'PatientID', type: 'string', sampleValues: ['PAT001', 'PAT002'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'AppointmentID', type: 'string', sampleValues: ['APT001', 'APT002'], uniqueValuesCount: 2, distinctRatio: 1 }
      ]
    });

    expect(registry.hasSignal('asset')).toBe(true);
    expect(registry.hasSignal('failure_code')).toBe(true);
    expect(registry.hasSignal('sensor')).toBe(true);
    expect(registry.hasSignal('temperature')).toBe(true);
    expect(registry.hasSignal('survey_question')).toBe(true);
    expect(registry.hasSignal('rating_score')).toBe(true);
    expect(registry.hasSignal('student')).toBe(true);
    expect(registry.hasSignal('course')).toBe(true);
    expect(registry.hasSignal('patient')).toBe(true);
    expect(registry.hasSignal('appointment')).toBe(true);
  });

  it('recognizes access audit and application log exports', () => {
    const registry = detectBusinessSignals({
      columns: [
        { name: 'UserName', type: 'string', sampleValues: ['user.admin', 'user.ops'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'ClientIP', type: 'string', sampleValues: ['10.0.0.1', '10.0.0.2'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'SessionID', type: 'string', sampleValues: ['SESS-001', 'SESS-002'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'AuditAction', type: 'string', sampleValues: ['login', 'export'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'Resource', type: 'string', sampleValues: ['Invoice', 'Customer'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'MFAStatus', type: 'string', sampleValues: ['enabled', 'disabled'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'RequestID', type: 'string', sampleValues: ['REQ-001', 'REQ-002'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'Endpoint', type: 'string', sampleValues: ['/api/orders', '/api/invoices'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'HTTPStatus', type: 'string', sampleValues: ['200', '500'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'LatencyMS', type: 'number', sampleValues: [123, 880], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'ServiceName', type: 'string', sampleValues: ['billing-api', 'order-api'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'Environment', type: 'string', sampleValues: ['prod', 'uat'], uniqueValuesCount: 2, distinctRatio: 1 }
      ]
    });

    expect(registry.hasSignal('user_login')).toBe(true);
    expect(registry.hasSignal('ip_address')).toBe(true);
    expect(registry.hasSignal('session_id')).toBe(true);
    expect(registry.hasSignal('audit_action')).toBe(true);
    expect(registry.hasSignal('resource_name')).toBe(true);
    expect(registry.hasSignal('mfa_status')).toBe(true);
    expect(registry.hasSignal('request_id')).toBe(true);
    expect(registry.hasSignal('endpoint')).toBe(true);
    expect(registry.hasSignal('http_status')).toBe(true);
    expect(registry.hasSignal('latency_ms')).toBe(true);
    expect(registry.hasSignal('service_name')).toBe(true);
    expect(registry.hasSignal('environment')).toBe(true);
  });

  it('recognizes subscription, legal contract, property, and construction exports', () => {
    const registry = detectBusinessSignals({
      columns: [
        { name: 'SubscriptionID', type: 'string', sampleValues: ['SUB-001', 'SUB-002'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'PlanName', type: 'string', sampleValues: ['Premium', 'Enterprise'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'MRR', type: 'number', sampleValues: [1000, 2000], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'RenewalDate', type: 'date', sampleValues: ['2026-08-01', '2026-09-01'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'UsageUnits', type: 'number', sampleValues: [50, 75], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'ContractNo', type: 'string', sampleValues: ['CT-001', 'CT-002'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'Counterparty', type: 'string', sampleValues: ['Vendor A', 'Customer B'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'ContractValue', type: 'number', sampleValues: [500000, 800000], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'PropertyID', type: 'string', sampleValues: ['BLD-01', 'BLD-02'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'LeaseID', type: 'string', sampleValues: ['LEASE-1', 'LEASE-2'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'RentAmount', type: 'number', sampleValues: [10000, 12000], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'OccupancyStatus', type: 'string', sampleValues: ['occupied', 'vacant'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'Milestone', type: 'string', sampleValues: ['Foundation', 'Handover'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'Subcontractor', type: 'string', sampleValues: ['Crew A', 'Crew B'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'ProgressPct', type: 'number', sampleValues: [45, 90], uniqueValuesCount: 2, distinctRatio: 1 }
      ]
    });

    expect(registry.hasSignal('subscription')).toBe(true);
    expect(registry.hasSignal('plan_name')).toBe(true);
    expect(registry.hasSignal('mrr')).toBe(true);
    expect(registry.hasSignal('renewal_date')).toBe(true);
    expect(registry.hasSignal('usage_units')).toBe(true);
    expect(registry.hasSignal('contract_id')).toBe(true);
    expect(registry.hasSignal('counterparty')).toBe(true);
    expect(registry.hasSignal('contract_value')).toBe(true);
    expect(registry.hasSignal('property')).toBe(true);
    expect(registry.hasSignal('lease')).toBe(true);
    expect(registry.hasSignal('rent_amount')).toBe(true);
    expect(registry.hasSignal('occupancy_status')).toBe(true);
    expect(registry.hasSignal('milestone')).toBe(true);
    expect(registry.hasSignal('subcontractor')).toBe(true);
    expect(registry.hasSignal('progress_pct')).toBe(true);
  });

  it('recognizes agriculture, utility, risk, nonprofit, and QC exports', () => {
    const registry = detectBusinessSignals({
      columns: [
        { name: 'FarmField', type: 'string', sampleValues: ['FIELD-1', 'FIELD-2'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'Crop', type: 'string', sampleValues: ['Rice', 'Coffee'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'HarvestQty', type: 'number', sampleValues: [1200, 980], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'Irrigation', type: 'number', sampleValues: [500, 650], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'MeterID', type: 'string', sampleValues: ['MTR-001', 'MTR-002'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'Consumption', type: 'number', sampleValues: [300, 450], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'Tariff', type: 'string', sampleValues: ['TOU', 'Flat'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'Outage', type: 'string', sampleValues: ['planned', 'resolved'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'ControlID', type: 'string', sampleValues: ['CTRL-01', 'CTRL-02'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'AuditFinding', type: 'string', sampleValues: ['Missing approval', 'Late review'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'RemediationStatus', type: 'string', sampleValues: ['open', 'closed'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'DonorID', type: 'string', sampleValues: ['DON-1', 'DON-2'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'DonationAmount', type: 'number', sampleValues: [1000, 2000], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'GrantID', type: 'string', sampleValues: ['GRANT-1', 'GRANT-2'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'InspectionLot', type: 'string', sampleValues: ['QC-LOT-1', 'QC-LOT-2'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'DefectCode', type: 'string', sampleValues: ['D01', 'D02'], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'ReworkQty', type: 'number', sampleValues: [1, 3], uniqueValuesCount: 2, distinctRatio: 1 },
        { name: 'QCResult', type: 'string', sampleValues: ['pass', 'fail'], uniqueValuesCount: 2, distinctRatio: 1 }
      ]
    });

    expect(registry.hasSignal('field')).toBe(true);
    expect(registry.hasSignal('crop')).toBe(true);
    expect(registry.hasSignal('harvest_qty')).toBe(true);
    expect(registry.hasSignal('irrigation')).toBe(true);
    expect(registry.hasSignal('meter_id')).toBe(true);
    expect(registry.hasSignal('consumption')).toBe(true);
    expect(registry.hasSignal('tariff')).toBe(true);
    expect(registry.hasSignal('outage')).toBe(true);
    expect(registry.hasSignal('control_id')).toBe(true);
    expect(registry.hasSignal('audit_finding')).toBe(true);
    expect(registry.hasSignal('remediation_status')).toBe(true);
    expect(registry.hasSignal('donor')).toBe(true);
    expect(registry.hasSignal('donation_amount')).toBe(true);
    expect(registry.hasSignal('grant')).toBe(true);
    expect(registry.hasSignal('inspection_lot')).toBe(true);
    expect(registry.hasSignal('defect_code')).toBe(true);
    expect(registry.hasSignal('rework_qty')).toBe(true);
    expect(registry.hasSignal('qc_result')).toBe(true);
  });
});
