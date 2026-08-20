import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { SEMANTIC_SIGNAL_REGISTRY_V1 } from '../semantic-registry';
import { aggregateContextualEvidence } from './contextual-evidence-aggregator';
import { profilePhysicalSource } from './profiler';
import { generateSemanticCandidateArtifact } from './semantic-candidate-engine';
import { resolveSemanticShadow } from './semantic-resolver';

type ExpectedMapping = Record<string, string>;

function resolveFixture(sourceId: string, rows: unknown[][]) {
  const physical = profilePhysicalSource({
    schemaVersion: 'lightbi.physical-source-input.v1',
    source: {
      sourceId,
      kind: 'database',
      label: 'cross-domain-sql-corpus',
      hash: { algorithm: 'sha256', value: createHash('sha256').update(JSON.stringify(rows)).digest('hex') },
    },
    rawRows: rows,
  });
  const candidates = generateSemanticCandidateArtifact(physical, { registry: SEMANTIC_SIGNAL_REGISTRY_V1 });
  const context = aggregateContextualEvidence(physical, candidates);
  return resolveSemanticShadow(physical, candidates, context);
}

function expectMappings(sourceId: string, rows: unknown[][], expected: ExpectedMapping) {
  const artifact = resolveFixture(sourceId, rows);
  for (const [physicalColumn, canonicalSignal] of Object.entries(expected)) {
    const column = artifact.columns.find((item) => item.physicalColumn === physicalColumn);
    const diagnostic = JSON.stringify(column?.candidateTraces ?? []);
    expect(column, `Missing physical column ${physicalColumn}`).toBeDefined();
    expect(['ambiguous', 'probable', 'confirmed'], diagnostic).toContain(column?.finalState);
    expect(column?.candidateTraces.some((candidate) => candidate.candidateId === canonicalSignal), diagnostic).toBe(true);
    if (column?.finalState !== 'ambiguous') {
      expect(column?.selectedCandidateId, diagnostic).toBe(canonicalSignal);
    }
  }
}

describe('cross-domain SQL semantic corpus', () => {
  it('recognizes retail transactions without relying on a dataset name', () => {
    expectMappings('retail-transactions', [
      ['order_number', 'order_date', 'customer_key', 'store_location', 'product_name', 'quantity', 'unit_price_usd', 'discount', 'sales'],
      ['SO-1001', '2026-01-05', 101, 'North', 'Item A', 2, 120, 0.1, 216],
      ['SO-1002', '2026-01-06', 102, 'South', 'Item B', 1, 80, 0, 80],
    ], {
      order_number: 'order',
      order_date: 'time_period',
      customer_key: 'customer',
      store_location: 'branch',
      product_name: 'product',
      quantity: 'quantity',
      unit_price_usd: 'unit_price',
      discount: 'discount',
      sales: 'sales',
    });
  });

  it('recognizes logistics movement, location, SLA, and responsible-actor context', () => {
    expectMappings('logistics-shipments', [
      ['booking_id', 'booking_date', 'vehicle_registration', 'origin_location', 'destination_location', 'planned_eta', 'actual_eta', 'ontime', 'transportation_distance_km', 'driver_name', 'shipping_carrier'],
      ['BK-1', '2026-01-05', '51A-00001', 'Hub A', 'Hub B', '2026-01-06', '2026-01-06', 'On time', 125, 'Driver A', 'Carrier A'],
      ['BK-2', '2026-01-06', '51A-00002', 'Hub B', 'Hub C', '2026-01-07', '2026-01-08', 'Late', 98, 'Driver B', 'Carrier B'],
    ], {
      booking_date: 'time_period',
      vehicle_registration: 'vehicle',
      origin_location: 'origin_location',
      destination_location: 'destination_location',
      planned_eta: 'eta',
      actual_eta: 'actual_time',
      ontime: 'on_time_status',
      transportation_distance_km: 'distance',
      driver_name: 'driver',
      shipping_carrier: 'carrier',
    });
  });

  it('recognizes workforce performance and churn context', () => {
    expectMappings('workforce-performance', [
      ['employee_id', 'department', 'job_role', 'salary', 'tenure', 'performance_rating', 'training_hours', 'overtime_hours', 'satisfaction_level', 'work_life_balance', 'churn'],
      ['EMP-1', 'Sales', 'Analyst', 1200, 24, 4, 12, 3, 0.8, 4, 0],
      ['EMP-2', 'Operations', 'Coordinator', 1100, 18, 3, 8, 6, 0.6, 3, 1],
    ], {
      employee_id: 'employee_id',
      department: 'department',
      job_role: 'job_title',
      salary: 'salary',
      tenure: 'duration',
      performance_rating: 'rating_score',
      training_hours: 'work_hours',
      overtime_hours: 'work_hours',
      satisfaction_level: 'satisfaction',
      work_life_balance: 'quality_score',
      churn: 'churn',
    });
  });

  it('recognizes customer journey and sales-pipeline context', () => {
    expectMappings('customer-pipeline', [
      ['organization', 'country', 'industry', 'owner', 'lead_acquisition_date', 'product', 'pipeline_stage', 'deal_value', 'probability', 'expected_close_date', 'actual_close_date'],
      ['Account A', 'VN', 'Retail', 'Owner A', '2026-01-01', 'Plan A', 'Proposal', 5000, 0.6, '2026-02-01', '2026-02-03'],
      ['Account B', 'VN', 'Logistics', 'Owner B', '2026-01-03', 'Plan B', 'Won', 7000, 1, '2026-02-10', '2026-02-09'],
    ], {
      organization: 'account',
      country: 'country',
      owner: 'owner',
      lead_acquisition_date: 'time_period',
      product: 'product',
      pipeline_stage: 'pipeline_stage',
      deal_value: 'expected_revenue',
      probability: 'probability',
      expected_close_date: 'close_date',
      actual_close_date: 'close_date',
    });
  });

  it('recognizes education and service-quality evidence as customer/performance signals', () => {
    expectMappings('education-quality', [
      ['student_id', 'school_id', 'teacher_id', 'course_name', 'assessment_date', 'standard_score', 'grade_at_assessment', 'completed_surveys', 'response_rate_pct'],
      ['STU-1', 'SCH-1', 'EMP-1', 'Math', '2026-01-15', 87, 'A', 120, 0.75],
      ['STU-2', 'SCH-1', 'EMP-2', 'Math', '2026-01-15', 74, 'B', 100, 0.68],
    ], {
      student_id: 'student',
      teacher_id: 'employee_id',
      course_name: 'course',
      assessment_date: 'time_period',
      standard_score: 'rating_score',
      completed_surveys: 'survey_count',
      response_rate_pct: 'response_rate',
    });
  });

  it('recognizes digital engagement and web-funnel context', () => {
    expectMappings('digital-engagement', [
      ['post_id', 'platform', 'content_type', 'region', 'engagement', 'views', 'impressions', 'clicks', 'click_through_rate', 'post_published_at', 'website_session_id', 'utm_source', 'utm_campaign', 'device_type'],
      ['POST-1', 'Web', 'Video', 'North', 120, 1000, 1400, 90, 0.064, '2026-01-05', 'SESSION-1', 'search', 'launch', 'mobile'],
      ['POST-2', 'Social', 'Image', 'South', 80, 700, 900, 40, 0.044, '2026-01-06', 'SESSION-2', 'social', 'brand', 'desktop'],
    ], {
      post_id: 'record_id',
      platform: 'channel',
      region: 'territory',
      engagement: 'engagement',
      views: 'impressions',
      impressions: 'impressions',
      clicks: 'clicks',
      click_through_rate: 'ctr',
      post_published_at: 'time_period',
      website_session_id: 'session_id',
      utm_source: 'source_medium',
      utm_campaign: 'campaign',
      device_type: 'device_type',
    });
  });
});
