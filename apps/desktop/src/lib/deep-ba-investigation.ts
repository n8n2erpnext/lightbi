import { DOMAIN_BA_PLAYBOOKS, type DomainBAId } from './domain-ba-playbooks';
import type {
  DeepBABasis,
  DeepBAConfidence,
  DeepBADecomposition,
  DeepBAEvidenceRow,
  DeepBAFinding,
  DeepBAInvestigation,
  SingleSourceBAOverview,
} from './single-source-ba-overview';
import type { BAAnalysisAuthorityContextV1 } from './understanding-core/ba-analysis-authority-context';

type Row = Record<string, unknown>;
type SemanticField = { canonicalId?: string; physicalColumn?: string; confidence?: number; semanticSource?: 'registry' | 'micro_brain'; resolutionState?: 'confirmed' | 'probable' };

const DOMAIN_MAP: Record<SingleSourceBAOverview['mode'], DomainBAId> = {
  commercial: 'revenue', finance: 'finance', inventory: 'inventory', operations: 'operations',
  customer: 'customer', performance: 'performance', general: 'performance',
};

const DECOMPOSITIONS: Record<DomainBAId, Array<{ id: string; label: string; signals: Array<[string, string]> }>> = {
  revenue: [
    { id: 'revenue_bridge', label: 'Revenue bridge: volume × price − discount + mix', signals: [['quantity', 'Volume'], ['unitPrice', 'Price'], ['discount', 'Discount'], ['product', 'Product mix']] },
  ],
  inventory: [
    { id: 'inventory_health', label: 'Inventory health', signals: [['stock', 'On-hand stock'], ['stockAge', 'Aging / dead stock'], ['stockoutRate', 'Stock-out risk'], ['turnover', 'Turnover']] },
    { id: 'inventory_flow', label: 'Inbound / outbound balance', signals: [['receivedQty', 'Inbound'], ['outboundQty', 'Outbound'], ['warehouse', 'Warehouse']] },
    { id: 'inventory_value', label: 'Inventory value concentration', signals: [['stock', 'Quantity'], ['cost', 'Cost / value'], ['product', 'Product']] },
  ],
  operations: [
    { id: 'service_delivery', label: 'Service and exception bridge', signals: [['deliveryStatus', 'Delivery status'], ['waitingTime', 'Lead time / delay'], ['route', 'Route'], ['carrier', 'Carrier']] },
    { id: 'schedule_adherence', label: 'Schedule adherence evidence', signals: [['eta', 'ETA / promised time'], ['actualTime', 'Actual completion time'], ['onTimeStatus', 'On-time status'], ['route', 'Route']] },
    { id: 'cost_per_shipment', label: 'Logistics unit economics', signals: [['deliveryFee', 'Transport cost'], ['shipment', 'Shipment identity'], ['warehouse', 'Hub / warehouse']] },
  ],
  finance: [
    { id: 'margin_bridge', label: 'Margin bridge', signals: [['revenue', 'Revenue'], ['cost', 'Cost'], ['profit', 'Profit'], ['discount', 'Discount']] },
    { id: 'working_capital', label: 'Working-capital bridge', signals: [['receivable', 'Accounts receivable'], ['payable', 'Accounts payable'], ['stock', 'Inventory'], ['date', 'Aging / period']] },
  ],
  customer: [
    { id: 'customer_value', label: 'Customer value and retention', signals: [['customer', 'Customer'], ['revenue', 'Revenue'], ['margin', 'Margin'], ['retention', 'Retention / churn']] },
  ],
  performance: [
    { id: 'performance_gap', label: 'Target and execution gap', signals: [['target', 'Target'], ['actual', 'Actual'], ['outcome', 'Outcome'], ['date', 'Period']] },
  ],
};

function scalar(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return String(value);
}

function evidenceRows(rows: Row[], fields: string[], predicate?: (row: Row) => boolean): DeepBAEvidenceRow[] {
  const result: DeepBAEvidenceRow[] = [];
  for (let index = 0; index < rows.length && result.length < 5; index += 1) {
    const row = rows[index];
    if (predicate && !predicate(row)) continue;
    const values = Object.fromEntries(fields.filter(field => field in row).map(field => [field, scalar(row[field])]));
    if (Object.keys(values).length === 0) continue;
    result.push({ rowIndex: index, label: `Row ${index + 1}`, values });
  }
  return result;
}

function confidence(fields: string[], semanticFields: SemanticField[], representative: boolean): DeepBAConfidence {
  const matched = fields.map(field => semanticFields.find(candidate => candidate.physicalColumn === field)).filter((value): value is SemanticField => Boolean(value));
  const scores = matched.map(field => field.confidence).filter((value): value is number => typeof value === 'number').map(value => value > 1 ? value / 100 : value);
  let score = scores.length ? Math.min(...scores) : 0.7;
  if (matched.some(field => field.semanticSource === 'micro_brain' || field.resolutionState === 'probable')) score = Math.min(score, 0.79);
  if (!representative && score >= 0.8) return 'high';
  if (score >= 0.55) return 'medium';
  return 'low';
}

function finding(
  id: string, title: string, statement: string, rows: Row[], fields: string[], semanticFields: SemanticField[],
  representative: boolean, basis: DeepBABasis = 'evidence_backed', predicate?: (row: Row) => boolean,
): DeepBAFinding {
  return { id, title, statement, basis, confidence: confidence(fields, semanticFields, representative), evidenceFields: fields, evidenceRows: evidenceRows(rows, fields, predicate) };
}

const DECOMPOSITION_SIGNAL_ALIASES: Record<string, string[]> = {
  stock: ['stock', 'stock_qty', 'inventory', 'inventory_qty'],
  margin: ['margin', 'margin_pct', 'gross_margin_pct'],
  cost: ['cost', 'total_cost', 'cost_of_goods_sold', 'operational_cost'],
  profit: ['profit', 'gross_profit'],
  date: ['date', 'report_date', 'order_date', 'transaction_date', 'time_period'],
};

function resolveSignal(signal: string, overview: SingleSourceBAOverview, semanticFields: SemanticField[]): string | undefined {
  if (overview.bindings[signal]) return overview.bindings[signal];
  const normalized = signal.toLowerCase().replace(/[^a-z0-9]/g, '');
  const accepted = new Set([signal, ...(DECOMPOSITION_SIGNAL_ALIASES[signal] ?? [])].map(value => value.toLowerCase().replace(/[^a-z0-9]/g, '')));
  return semanticFields.find(field => {
    if (!field.physicalColumn) return false;
    const canonical = (field.canonicalId ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return accepted.has(canonical) || canonical.endsWith(normalized);
  })?.physicalColumn;
}

function decomposition(domain: DomainBAId, overview: SingleSourceBAOverview, semanticFields: SemanticField[]): DeepBADecomposition[] {
  return DECOMPOSITIONS[domain].map(model => {
    const components = model.signals.map(([signal, label]) => {
      const field = resolveSignal(signal, overview, semanticFields);
      return { label, field, status: field ? 'observed' as const : 'missing' as const, note: field ? `Observed in ${field}` : `Missing ${signal}` };
    });
    const observed = components.filter(component => component.status === 'observed').length;
    return {
      id: model.id, label: model.label,
      status: observed === components.length ? 'supported' : observed > 0 ? 'partial' : 'unavailable',
      components,
      caveat: observed === components.length ? undefined : 'This decomposition is not treated as causal until all required components and a valid comparison basis are present.',
    };
  });
}

export function buildDeepBAInvestigation(rows: Row[], overview: SingleSourceBAOverview, semanticFields: SemanticField[], selectedPerspective?: string | null, analysisAuthority: BAAnalysisAuthorityContextV1 | null = null): DeepBAInvestigation {
  const perspectiveDomain = selectedPerspective && DOMAIN_BA_PLAYBOOKS.some(item => item.domainId === selectedPerspective)
    ? selectedPerspective as DomainBAId
    : null;
  const domain = perspectiveDomain ?? DOMAIN_MAP[overview.mode];
  const playbook = DOMAIN_BA_PLAYBOOKS.find(item => item.domainId === domain)!;
  const selectedMeasure = overview.bindings.selectedMeasure;
  const selectedDimensions = Object.entries(overview.bindings).filter(([key]) => key.startsWith('selectedDimension')).map(([, value]) => value);
  const primaryFields = [...new Set([selectedMeasure, ...selectedDimensions].filter((value): value is string => Boolean(value)))];
  const whatHappened = overview.findings.slice(0, 3).map((statement, index) => finding(`happened_${index}`, index === 0 ? 'Observed result' : 'Observed change', statement, rows, primaryFields, semanticFields, overview.isRepresentativeSample));
  const whereItHappened = overview.breakdowns.slice(0, 3).flatMap((breakdown, index) => {
    const top = breakdown.top[0];
    if (!top) return [];
    const fields = [...new Set([breakdown.physicalColumn, selectedMeasure].filter((value): value is string => Boolean(value)))];
    return [finding(`where_${index}`, `Largest contribution by ${breakdown.label}`, `${top.label} leads this breakdown with ${(top.share * 100).toFixed(1)}% across ${top.rowCount} rows.`, rows, fields, semanticFields, overview.isRepresentativeSample, 'evidence_backed', row => String(row[breakdown.physicalColumn] ?? '').trim() === top.label)];
  });
  const decompositions = decomposition(domain, overview, semanticFields);
  const whyItMayHaveHappened = decompositions.filter(item => item.status !== 'unavailable').map((item, index) => {
    const fields = item.components.filter(component => component.field).map(component => component.field!);
    const missing = item.components.filter(component => !component.field).map(component => component.label);
    const statement = missing.length
      ? `${item.label} is only partially testable. Verify ${missing.join(', ')} before attributing the result to these drivers.`
      : `${item.label} has the required fields for decomposition; compare component contributions before making a causal claim.`;
    return finding(`why_${index}`, item.label, statement, rows, fields, semanticFields, overview.isRepresentativeSample, missing.length ? 'needs_verification' : 'hypothesis');
  });
  const unusual: DeepBAFinding[] = [];
  if (overview.outlierCount > 0) unusual.push(finding('unusual_outliers', 'Numeric outliers', `${overview.outlierCount} rows are above the IQR threshold and should be reviewed individually.`, rows, primaryFields, semanticFields, overview.isRepresentativeSample));
  if ((overview.concentration?.share ?? 0) >= 0.4) unusual.push(finding('unusual_concentration', 'Concentration risk', `${overview.concentration!.label} represents ${(overview.concentration!.share * 100).toFixed(1)}% of the analyzed scope.`, rows, primaryFields, semanticFields, overview.isRepresentativeSample));
  const priorities = [...whereItHappened, ...unusual].map(item => {
    const contribution = item.id.startsWith('where_') ? overview.breakdowns[Number(item.id.split('_')[1])]?.top[0]?.share ?? 0 : overview.concentration?.share ?? 0;
    const confidenceWeight = item.confidence === 'high' ? 1 : item.confidence === 'medium' ? 0.7 : 0.4;
    return { ...item, contribution, businessImpact: contribution >= 0.4 ? 'high' as const : contribution >= 0.2 ? 'medium' as const : 'low' as const, priorityScore: Math.round(contribution * confidenceWeight * 100) };
  }).sort((left, right) => (right.priorityScore ?? 0) - (left.priorityScore ?? 0)).slice(0, 5);
  const comparisons: DeepBAInvestigation['comparisons'] = [
    { kind: 'period', label: 'Previous period', status: overview.trend.length > 1 ? 'available' : 'unavailable', statement: overview.trend.length > 1 ? `Compared ${overview.trend[0].period} with ${overview.trend.at(-1)!.period}.` : 'No reliable previous-period comparison is available.' },
    { kind: 'peer', label: 'Peer groups', status: overview.breakdowns.some(item => item.top.length > 1) ? 'available' : 'unavailable', statement: overview.breakdowns.some(item => item.top.length > 1) ? 'Comparable groups exist in the selected dimension.' : 'The selected scope has no comparable peer groups.' },
    { kind: 'baseline', label: 'Baseline', status: 'unavailable', statement: 'No governed baseline is declared in the source.' },
    { kind: 'target', label: 'Target', status: resolveSignal('target', overview, semanticFields) ? 'available' : 'unavailable', statement: resolveSignal('target', overview, semanticFields) ? 'A target field is available for validation.' : 'No target field is available.' },
  ];
  const missingSignals = [...new Set(decompositions.flatMap(item => item.components.filter(component => !component.field).map(component => component.label)))];
  const followUpQuestions = priorities.slice(0, 3).map(item => ({ question: `Which records and sub-groups explain ${item.title.toLowerCase()}?`, rationale: item.statement, evidenceFields: item.evidenceFields }));
  if (comparisons[0].status === 'unavailable') followUpQuestions.push({ question: 'How does this scope compare with the previous equivalent period?', rationale: 'A point-in-time result cannot establish direction of change.', evidenceFields: primaryFields });
  if (missingSignals.length) followUpQuestions.push({ question: `Can we add ${missingSignals.slice(0, 3).join(', ')} to test the driver hypothesis?`, rationale: 'The domain decomposition is currently partial.', evidenceFields: [] });
  const actions = overview.recommendedActions.slice(0, 3).map((action, index) => ({
    priority: index === 0 ? 'high' as const : index === 1 ? 'medium' as const : 'low' as const,
    basis: index === 0 && priorities[0]?.confidence === 'high' ? 'evidence_backed' as const : 'needs_verification' as const,
    title: index === 0 ? 'Inspect the highest-priority driver' : `Follow-up ${index + 1}`,
    action,
    verification: index === 0 ? 'Open the attached evidence rows and confirm business context before acting.' : 'Validate with an owner, comparison period, or target before execution.',
  }));
  const unknowns = [
    ...missingSignals.length ? [{ label: `${playbook.label} decomposition is incomplete`, missingSignals, impact: 'LightBI will not present the missing components as causes.' }] : [],
    ...comparisons.filter(item => item.status === 'unavailable').map(item => ({ label: `${item.label} unavailable`, missingSignals: [item.kind], impact: item.statement })),
    ...overview.limitations.map((limitation, index) => ({ label: `Evidence limitation ${index + 1}`, missingSignals: [], impact: limitation })),
  ];
  return { domain, ...(analysisAuthority ? { analysisAuthority } : {}), whatHappened, whereItHappened, whyItMayHaveHappened, unusual, priorities, decompositions, comparisons, followUpQuestions: followUpQuestions.slice(0, 5), actions, unknowns };
}
