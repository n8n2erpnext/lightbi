import { SEMANTIC_CONTEXT_DICTIONARY_V1 } from './semantic-registry';

export type SemanticRole = 'time' | 'dimension' | 'measure' | 'status' | 'identifier';
export type SemanticCoverageSupport = 'supported' | 'partial' | 'advertised_only';
export type SemanticEvidenceType = 'header' | 'value' | 'shape' | 'neighbor' | 'cross_file' | 'user_mapping';

export interface ContextSemanticDictionaryEntry {
  canonicalId: string;
  label: string;
  domains: string[];
  semanticFamily: string;
  role: SemanticRole;
  coverageStatus: SemanticCoverageSupport;
  headerAliases: string[];
  valueAliases: string[];
  valuePatterns: RegExp[];
  compatibleTypes: string[];
}

export interface ContextSemanticInputColumn {
  name: string;
  type?: string;
  sampleValues?: unknown[];
  uniqueValuesCount?: number;
  distinctRatio?: number;
}

export interface ContextSemanticCandidate {
  canonicalId: string;
  label: string;
  primaryDomain: string;
  role: SemanticRole;
  confidence: number;
  evidenceTypes: SemanticEvidenceType[];
  headerScore: number;
  valueScore: number;
  shapeScore: number;
  neighborScore: number;
  crossFileScore: number;
  reasons: string[];
}

export interface ContextSemanticInferenceContext {
  siblingColumns?: ContextSemanticInputColumn[];
  crossFileSignals?: string[];
  crossFileColumnNames?: string[];
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function compact(value: string): string {
  return normalize(value).replace(/\s+/g, '');
}

function stringify(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

function isNumericText(value: string): boolean {
  if (!value) return false;
  const normalized = value.replace(/[,\s]/g, '');
  return Number.isFinite(Number(normalized));
}

function isDateText(value: string): boolean {
  if (!value) return false;
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(value)) return true;
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(value)) return true;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && /\d/.test(value) && value.length >= 8;
}

const MONEY_VALUE_PATTERN = /^-?\d{1,3}([,. ]?\d{3})+([,.]\d+)?$|^-?\d+([,.]\d+)?$/;

export const CONTEXT_SEMANTIC_DICTIONARY_V1: ContextSemanticDictionaryEntry[] = SEMANTIC_CONTEXT_DICTIONARY_V1;

function inferDeclaredType(column: ContextSemanticInputColumn, values: string[]): 'number' | 'date' | 'string' | 'unknown' {
  const declared = normalize(column.type || '');
  if (/(int|float|double|decimal|number|numeric|currency)/.test(declared)) return 'number';
  if (/(date|time|timestamp)/.test(declared)) return 'date';
  if (/(char|string|text|varchar)/.test(declared)) return 'string';
  if (values.length === 0) return 'unknown';

  const numeric = values.filter(isNumericText).length / values.length;
  const date = values.filter(isDateText).length / values.length;
  if (date >= 0.8) return 'date';
  if (numeric >= 0.8) return 'number';
  return 'string';
}

function computeValueScore(entry: ContextSemanticDictionaryEntry, values: string[]): { score: number; matchedValues: string[] } {
  if (values.length === 0) return { score: 0, matchedValues: [] };
  const normalizedValues = values.map(normalize).filter(Boolean);
  const distinct = [...new Set(normalizedValues)];
  const matched = distinct.filter(value => {
    if (entry.valueAliases.includes(value)) return true;
    return entry.valuePatterns.some(pattern => pattern.test(value));
  });
  if (matched.length === 0) return { score: 0, matchedValues: [] };

  const matchedRows = normalizedValues.filter(value => matched.includes(value)).length;
  const rowRatio = matchedRows / normalizedValues.length;
  const distinctRatio = matched.length / Math.max(1, Math.min(distinct.length, 10));
  const score = Math.min(55, Math.round(20 + rowRatio * 25 + distinctRatio * 20));
  return { score, matchedValues: matched.slice(0, 5) };
}

function computeShapeScore(entry: ContextSemanticDictionaryEntry, column: ContextSemanticInputColumn, inferredType: 'number' | 'date' | 'string' | 'unknown', values: string[]): number {
  const declaredCompatible = column.type && entry.compatibleTypes.some(type => normalize(column.type || '').includes(normalize(type)));
  let score = declaredCompatible ? 10 : 0;
  if (entry.role === 'measure' && inferredType === 'number') score += 15;
  if (entry.role === 'time' && inferredType === 'date') score += 20;
  if (entry.role === 'identifier' && inferredType === 'string') score += 10;
  if ((entry.role === 'dimension' || entry.role === 'status') && inferredType === 'string') {
    const distinct = column.uniqueValuesCount ?? new Set(values.map(normalize)).size;
    const ratio = column.distinctRatio ?? (values.length ? distinct / values.length : 1);
    if (distinct >= 2 && distinct <= 80) score += 10;
    if (entry.role === 'status' && (distinct <= 12 || ratio <= 0.2)) score += 15;
  }
  if (entry.semanticFamily === 'money' && values.length > 0 && values.filter(value => MONEY_VALUE_PATTERN.test(value)).length / values.length >= 0.8) {
    score += 10;
  }
  return Math.min(30, score);
}

function hasSiblingName(context: ContextSemanticInferenceContext | undefined, patterns: RegExp[]): boolean {
  return (context?.siblingColumns || []).some(sibling => {
    const name = normalize(sibling.name);
    return patterns.some(pattern => pattern.test(name));
  });
}

function hasCrossFileContext(context: ContextSemanticInferenceContext | undefined, signals: string[], columnPatterns: RegExp[]): boolean {
  const crossFileSignals = new Set((context?.crossFileSignals || []).map(normalize));
  if (signals.some(signal => crossFileSignals.has(normalize(signal)))) return true;
  return (context?.crossFileColumnNames || []).some(columnName => {
    const name = normalize(columnName);
    return columnPatterns.some(pattern => pattern.test(name));
  });
}

function computeNeighborScore(entry: ContextSemanticDictionaryEntry, context: ContextSemanticInferenceContext | undefined): number {
  if (!context?.siblingColumns?.length) return 0;

  if (entry.canonicalId === 'delivery_status') {
    return hasSiblingName(context, [/shipment|waybill|awb|tracking|route|carrier|delivery|shipping|freight|driver|van don/]) ? 20 : 0;
  }
  if (entry.canonicalId === 'stock_status') {
    return hasSiblingName(context, [/sku|product|item|warehouse|inventory|stock|qty|quantity|kho|ton kho/]) ? 20 : 0;
  }
  if (entry.canonicalId === 'payment_method') {
    return hasSiblingName(context, [/invoice|receivable|payment|customer|order|revenue|amount|total|ar|hoa don|thanh toan/]) ? 15 : 0;
  }
  if (entry.canonicalId === 'carrier') {
    return hasSiblingName(context, [/shipment|waybill|awb|tracking|route|delivery|shipping|freight|driver|fee|van don/]) ? 15 : 0;
  }
  if (['gross_profit', 'profit', 'margin', 'total_cost'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/revenue|sales|cost|cogs|invoice|net|gross|doanh thu|gia von/]) ? 10 : 0;
  }
  if (['customer', 'segment', 'retention'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/order|invoice|revenue|sales|payment|branch|store|purchase/]) ? 10 : 0;
  }
  if (['account', 'contact', 'lead', 'opportunity', 'stage_name', 'lead_status', 'forecast_category', 'territory'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/opportunity|lead|account|contact|stage|amount|close|owner|campaign|source|probability/]) ? 12 : 0;
  }
  if (['material', 'plant', 'storage_location', 'movement_type', 'goods_movement'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/material|matnr|plant|werks|sloc|lgort|movement|bwart|warehouse|stock|qty|batch|lot|serial/]) ? 15 : 0;
  }
  if (['billing_document', 'company_code', 'sales_org', 'distribution_channel', 'division'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/billing|invoice|customer|material|sales|amount|company|bukrs|vkorg|vtweg|division/]) ? 12 : 0;
  }
  if (['fulfillment', 'fulfillment_status', 'sales_channel', 'refund', 'commission'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/order|item|sku|product|ship|fulfill|pick|pack|refund|channel|customer|amount/]) ? 12 : 0;
  }
  if (['ticket', 'ticket_status', 'priority', 'response_time', 'resolution_time', 'agent'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/ticket|case|agent|owner|priority|severity|response|resolution|customer|sla/]) ? 12 : 0;
  }
  if (['pos_terminal', 'cashier', 'shift_close', 'receipt_line', 'coupon'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/pos|terminal|register|receipt|cashier|payment|discount|coupon|sku|barcode|amount/]) ? 12 : 0;
  }
  if (['bank_transaction', 'transaction_description', 'opening_balance', 'closing_balance', 'deposit_amount', 'withdrawal_amount', 'reconciliation_status'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/bank|account|transaction|reference|debit|credit|balance|deposit|withdrawal|reconcile|matched/]) ? 14 : 0;
  }
  if (['impressions', 'clicks', 'spend', 'conversion', 'ctr', 'cpc', 'roas', 'landing_page', 'device_type'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/campaign|ad|utm|impression|click|spend|conversion|page|device|source|medium|revenue/]) ? 12 : 0;
  }
  if (['rfq', 'purchase_request', 'approval_status', 'buyer', 'lead_time'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/purchase|supplier|vendor|rfq|quote|approval|buyer|item|qty|cost|lead time/]) ? 12 : 0;
  }
  if (['employee_id', 'job_title', 'hire_date', 'termination_date', 'salary', 'leave_type'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/employee|staff|department|job|hire|salary|payroll|leave|attendance|shift/]) ? 12 : 0;
  }
  if (['asset', 'maintenance_order', 'failure_code', 'maintenance_cost', 'meter_reading'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/asset|equipment|maintenance|repair|failure|fault|meter|odometer|cost|downtime/]) ? 12 : 0;
  }
  if (['sensor', 'temperature', 'humidity', 'error_event'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/sensor|device|timestamp|temperature|humidity|event|alarm|alert|machine/]) ? 12 : 0;
  }
  if (['survey_response', 'survey_question', 'rating_score', 'sentiment'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/survey|response|question|rating|score|sentiment|customer|comment/]) ? 12 : 0;
  }
  if (['student', 'course', 'grade', 'enrollment_status'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/student|learner|course|class|grade|score|attendance|enrollment/]) ? 12 : 0;
  }
  if (['patient', 'appointment', 'provider', 'diagnosis', 'claim'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/patient|appointment|provider|doctor|diagnosis|claim|insurance|visit|clinic/]) ? 12 : 0;
  }
  if (['user_login', 'ip_address', 'session_id', 'audit_action', 'resource_name', 'permission_role', 'mfa_status'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/user|login|session|ip|action|resource|role|permission|mfa|2fa|audit|event/]) ? 12 : 0;
  }
  if (['request_id', 'endpoint', 'http_status', 'latency_ms', 'error_code', 'service_name', 'environment'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/request|trace|endpoint|url|path|status|latency|duration|error|service|environment|env/]) ? 12 : 0;
  }
  if (['subscription', 'plan_name', 'mrr', 'arr', 'renewal_date', 'usage_units'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/subscription|plan|package|mrr|arr|renewal|usage|seat|churn|customer|account/]) ? 12 : 0;
  }
  if (['contract_id', 'counterparty', 'effective_date', 'expiration_date', 'contract_value'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/contract|agreement|counterparty|party|effective|expiry|expiration|value|amount|vendor|customer/]) ? 12 : 0;
  }
  if (['property', 'unit', 'lease', 'rent_amount', 'occupancy_status'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/property|building|unit|room|lease|tenant|rent|occupancy|vacancy|move in|move out/]) ? 12 : 0;
  }
  if (['milestone', 'subcontractor', 'change_order', 'progress_pct'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/project|phase|milestone|contractor|subcontractor|change order|variation|progress|completion|cost/]) ? 12 : 0;
  }
  if (['field', 'crop', 'harvest_qty', 'irrigation'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/farm|field|plot|crop|variety|harvest|yield|irrigation|water|fertilizer|pesticide/]) ? 12 : 0;
  }
  if (['meter_id', 'consumption', 'tariff', 'outage'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/meter|service point|consumption|usage|kwh|tariff|rate plan|outage|interruption|billing/]) ? 12 : 0;
  }
  if (['control_id', 'audit_finding', 'remediation_status', 'policy'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/control|audit|finding|risk|policy|remediation|action plan|severity|owner|due date/]) ? 12 : 0;
  }
  if (['donor', 'donation_amount', 'grant', 'pledge'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/donor|donation|gift|grant|campaign|pledge|funder|sponsor|amount/]) ? 12 : 0;
  }
  if (['inspection_lot', 'defect_code', 'rework_qty', 'qc_result'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/inspection|quality|qc|defect|nonconformance|rework|lot|pass|fail|yield|scrap/]) ? 12 : 0;
  }
  if (['work_order', 'bom', 'machine', 'downtime', 'scrap_qty', 'defect_rate', 'yield_rate'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/work|production|bom|material|machine|operation|scrap|defect|yield|downtime|qty/]) ? 12 : 0;
  }
  if (['target', 'actual', 'achievement', 'kpi'].includes(entry.canonicalId)) {
    return hasSiblingName(context, [/target|actual|plan|budget|goal|kpi|metric|department|team/]) ? 10 : 0;
  }
  return 0;
}

function computeCrossFileScore(entry: ContextSemanticDictionaryEntry, context: ContextSemanticInferenceContext | undefined): number {
  if (!context || (!(context.crossFileSignals || []).length && !(context.crossFileColumnNames || []).length)) return 0;

  if (entry.canonicalId === 'payment_method') {
    return hasCrossFileContext(context, ['invoice_total', 'receivable', 'revenue', 'net_revenue', 'customer', 'order'], [/invoice|receivable|payment|customer|order|revenue|ar|hoa don|thanh toan/]) ? 10 : 0;
  }
  if (['carrier', 'delivery_status', 'delivery_fee', 'route', 'shipment'].includes(entry.canonicalId)) {
    return hasCrossFileContext(context, ['shipment', 'route', 'delivery_fee', 'driver', 'order'], [/shipment|waybill|awb|tracking|route|delivery|shipping|carrier|freight|van don/]) ? 10 : 0;
  }
  if (['gross_profit', 'profit', 'margin', 'total_cost'].includes(entry.canonicalId)) {
    return hasCrossFileContext(context, ['revenue', 'net_revenue', 'invoice_total', 'cost', 'delivery_fee'], [/revenue|sales|invoice|cost|profit|margin|fee|doanh thu|gia von/]) ? 10 : 0;
  }
  if (['inventory', 'stock_qty', 'stock_status', 'sku', 'product', 'warehouse'].includes(entry.canonicalId)) {
    return hasCrossFileContext(context, ['sku', 'product', 'warehouse', 'inventory', 'stock_qty'], [/sku|product|item|warehouse|inventory|stock|qty|kho|hang/]) ? 10 : 0;
  }
  if (['account', 'contact', 'lead', 'opportunity', 'stage_name', 'lead_status'].includes(entry.canonicalId)) {
    return hasCrossFileContext(context, ['customer', 'revenue', 'salesperson', 'campaign'], [/account|contact|lead|opportunity|stage|owner|campaign/]) ? 10 : 0;
  }
  if (['material', 'plant', 'storage_location', 'movement_type', 'goods_movement'].includes(entry.canonicalId)) {
    return hasCrossFileContext(context, ['sku', 'product', 'warehouse', 'stock_qty', 'quantity'], [/material|matnr|plant|werks|sloc|lgort|movement|warehouse|stock/]) ? 10 : 0;
  }
  if (['fulfillment', 'fulfillment_status', 'sales_channel'].includes(entry.canonicalId)) {
    return hasCrossFileContext(context, ['order', 'shipment', 'sku', 'product', 'delivery_status'], [/fulfill|order|shipment|pick|pack|ship|channel/]) ? 10 : 0;
  }
  if (['bank_transaction', 'deposit_amount', 'withdrawal_amount', 'reconciliation_status'].includes(entry.canonicalId)) {
    return hasCrossFileContext(context, ['invoice_total', 'receivable', 'payable', 'payment_method', 'bank_account'], [/bank|transaction|payment|reconcile|balance/]) ? 10 : 0;
  }
  if (['impressions', 'clicks', 'spend', 'conversion', 'ctr', 'cpc', 'roas'].includes(entry.canonicalId)) {
    return hasCrossFileContext(context, ['campaign', 'source_medium', 'revenue', 'customer'], [/campaign|ad|utm|conversion|click|impression|spend/]) ? 10 : 0;
  }
  if (['employee_id', 'salary', 'leave_type', 'attendance_status', 'shift'].includes(entry.canonicalId)) {
    return hasCrossFileContext(context, ['employee', 'department', 'team', 'work_hours'], [/employee|staff|payroll|attendance|leave|shift/]) ? 10 : 0;
  }
  if (['user_login', 'ip_address', 'session_id', 'audit_action', 'resource_name', 'permission_role', 'mfa_status'].includes(entry.canonicalId)) {
    return hasCrossFileContext(context, ['employee', 'department', 'team'], [/user|login|session|ip|audit|role|permission|mfa|action/]) ? 10 : 0;
  }
  if (['request_id', 'endpoint', 'http_status', 'latency_ms', 'error_code', 'service_name', 'environment'].includes(entry.canonicalId)) {
    return hasCrossFileContext(context, ['ticket', 'priority', 'response_time'], [/request|trace|endpoint|status|latency|error|service|environment/]) ? 10 : 0;
  }
  if (['subscription', 'plan_name', 'mrr', 'arr', 'renewal_date', 'usage_units'].includes(entry.canonicalId)) {
    return hasCrossFileContext(context, ['customer', 'account', 'revenue', 'payment_method', 'churn'], [/subscription|plan|mrr|arr|renewal|usage|seat|customer/]) ? 10 : 0;
  }
  if (['contract_id', 'counterparty', 'effective_date', 'expiration_date', 'contract_value'].includes(entry.canonicalId)) {
    return hasCrossFileContext(context, ['customer', 'supplier', 'revenue', 'payable', 'project'], [/contract|agreement|counterparty|effective|expiry|value|vendor|customer/]) ? 10 : 0;
  }
  if (['property', 'unit', 'lease', 'rent_amount', 'occupancy_status'].includes(entry.canonicalId)) {
    return hasCrossFileContext(context, ['customer', 'receivable', 'invoice_total'], [/property|building|unit|lease|tenant|rent|occupancy|vacancy/]) ? 10 : 0;
  }
  if (['milestone', 'subcontractor', 'change_order', 'progress_pct'].includes(entry.canonicalId)) {
    return hasCrossFileContext(context, ['project', 'cost', 'budget', 'purchase_order'], [/project|phase|milestone|contractor|change order|progress|completion/]) ? 10 : 0;
  }
  if (['field', 'crop', 'harvest_qty', 'irrigation'].includes(entry.canonicalId)) {
    return hasCrossFileContext(context, ['product', 'inventory', 'quantity', 'revenue'], [/farm|field|crop|harvest|yield|irrigation|water/]) ? 10 : 0;
  }
  if (['meter_id', 'consumption', 'tariff', 'outage'].includes(entry.canonicalId)) {
    return hasCrossFileContext(context, ['customer', 'invoice_total', 'revenue'], [/meter|consumption|usage|kwh|tariff|outage|billing/]) ? 10 : 0;
  }
  if (['control_id', 'audit_finding', 'remediation_status', 'policy'].includes(entry.canonicalId)) {
    return hasCrossFileContext(context, ['department', 'owner', 'priority'], [/control|audit|finding|risk|policy|remediation|severity/]) ? 10 : 0;
  }
  if (['donor', 'donation_amount', 'grant', 'pledge'].includes(entry.canonicalId)) {
    return hasCrossFileContext(context, ['campaign', 'customer', 'revenue'], [/donor|donation|grant|pledge|funder|campaign/]) ? 10 : 0;
  }
  if (['inspection_lot', 'defect_code', 'rework_qty', 'qc_result'].includes(entry.canonicalId)) {
    return hasCrossFileContext(context, ['work_order', 'product', 'sku', 'quantity', 'defect_rate'], [/inspection|quality|qc|defect|rework|lot|scrap|yield/]) ? 10 : 0;
  }
  return 0;
}

function computeHeaderScore(entry: ContextSemanticDictionaryEntry, header: string): number {
  const compactHeader = compact(header);
  for (const alias of entry.headerAliases) {
    const normalizedAlias = normalize(alias);
    if (!normalizedAlias) continue;
    if (header === normalizedAlias) return 40;
    if (compactHeader === compact(normalizedAlias)) return 38;
    if (normalizedAlias.length >= 4 && (
      header.includes(normalizedAlias)
      || normalizedAlias.includes(header)
      || compactHeader.includes(compact(normalizedAlias))
    )) {
      return 28;
    }
  }
  return 0;
}

export function inferContextSemanticCandidates(column: ContextSemanticInputColumn, context: ContextSemanticInferenceContext = {}): ContextSemanticCandidate[] {
  const header = normalize(column.name);
  const values = (column.sampleValues || []).map(stringify).filter(Boolean);
  const inferredType = inferDeclaredType(column, values);

  const candidates: ContextSemanticCandidate[] = [];
  for (const entry of CONTEXT_SEMANTIC_DICTIONARY_V1) {
    const headerScore = computeHeaderScore(entry, header);
    const value = computeValueScore(entry, values);
    const shapeScore = computeShapeScore(entry, column, inferredType, values);
    const neighborScore = computeNeighborScore(entry, context);
    const crossFileScore = computeCrossFileScore(entry, context);

    const evidenceTypes: SemanticEvidenceType[] = [];
    const reasons: string[] = [];
    if (headerScore > 0) {
      evidenceTypes.push('header');
      reasons.push(`Header resembles ${entry.canonicalId}.`);
    }
    if (value.score > 0) {
      evidenceTypes.push('value');
      reasons.push(`Values resemble ${entry.canonicalId}: ${value.matchedValues.join(', ')}.`);
    }
    if (shapeScore > 0) {
      evidenceTypes.push('shape');
      reasons.push(`Column shape is compatible with ${entry.role}.`);
    }
    if (neighborScore > 0) {
      evidenceTypes.push('neighbor');
      reasons.push(`Nearby columns support ${entry.canonicalId}.`);
    }
    if (crossFileScore > 0) {
      evidenceTypes.push('cross_file');
      reasons.push(`Other imported files support ${entry.canonicalId}.`);
    }

    const confidence = Math.min(95, headerScore + value.score + shapeScore + neighborScore + crossFileScore);
    const hasStrongValueEvidence = value.score >= 35;
    const hasHeaderEvidence = headerScore > 0;
    const hasContextBackedValueEvidence = value.score >= 25 && (neighborScore > 0 || crossFileScore > 0);
    const hasHeaderAndContextEvidence = hasHeaderEvidence && values.length > 0 && (confidence >= 40 || neighborScore > 0 || crossFileScore > 0);
    if (hasStrongValueEvidence || hasContextBackedValueEvidence || hasHeaderAndContextEvidence) {
      candidates.push({
        canonicalId: entry.canonicalId,
        label: entry.label,
        primaryDomain: entry.domains[0] || 'core',
        role: entry.role,
        confidence,
        evidenceTypes,
        headerScore,
        valueScore: value.score,
        shapeScore,
        neighborScore,
        crossFileScore,
        reasons
      });
    }
  }

  return candidates.sort((a, b) => b.confidence - a.confidence);
}
