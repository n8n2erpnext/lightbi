import type {
  BusinessCapability,
  BusinessContext,
  SemanticCapabilityMatrix,
  UniversalSignal,
} from './contracts';

type Rule = { pattern: RegExp; weight: number };

const CONTEXT_RULES: Record<Exclude<BusinessContext, 'generic_business'>, Rule[]> = {
  healthcare: [
    { pattern: /^entity\.(patient|doctor)$/, weight: 5 },
    { pattern: /^item\.medicine$/, weight: 5 },
    { pattern: /^(entity\.facility|document\.prescription|indicator\.health)$/, weight: 4 },
    { pattern: /^(engagement\.survey|quality\.healthcare)/, weight: 2 },
  ],
  education: [
    { pattern: /^entity\.student$/, weight: 5 },
    { pattern: /^(entity\.school|entity\.teacher|item\.course|indicator\.assessment)/, weight: 4 },
  ],
  workforce: [
    { pattern: /^entity\.(employee|department|team|manager)$/, weight: 4 },
    { pattern: /^(engagement\.churn|indicator\.performance|quantity\.work_hours)/, weight: 3 },
  ],
  logistics: [
    { pattern: /^document\.shipment$/, weight: 5 },
    { pattern: /^entity\.(driver|vehicle|carrier)$/, weight: 4 },
    { pattern: /^(location\.route|status\.delivery|money\.fee)$/, weight: 3 },
  ],
  financial_services: [
    { pattern: /^entity\.(merchant|card)$/, weight: 5 },
    { pattern: /^money\.(credit|debt|balance|transaction|limit|income)/, weight: 4 },
  ],
  digital: [
    { pattern: /^(document\.session|document\.post|engagement\.(campaign|impressions|clicks|ctr|likes|shares))/, weight: 4 },
  ],
  commerce: [
    { pattern: /^document\.(order|invoice|sales_order)$/, weight: 4 },
    { pattern: /^money\.(revenue|sales|payment)/, weight: 4 },
    { pattern: /^(entity\.customer|item\.(product|sku)|location\.store)$/, weight: 3 },
  ],
};

function matchingEvidence(signals: UniversalSignal[], rules: Rule[]): { score: number; evidence: string[] } {
  const evidence = signals.filter((signal) => rules.some((rule) => rule.pattern.test(signal.id)));
  return {
    score: evidence.reduce((sum, signal) => sum + Math.max(...rules.filter((rule) => rule.pattern.test(signal.id)).map((rule) => rule.weight)), 0),
    evidence: [...new Set(evidence.map((signal) => `${signal.id}:${signal.physicalColumn}`))],
  };
}

function has(signals: UniversalSignal[], pattern: RegExp): boolean {
  return signals.some((signal) => pattern.test(signal.id));
}

function capability(
  signals: UniversalSignal[],
  id: BusinessCapability,
  evidencePatterns: RegExp[],
  ready: boolean,
  missingEvidence: string[],
): SemanticCapabilityMatrix['capabilities'][number] {
  const evidence = signals.filter((signal) => evidencePatterns.some((pattern) => pattern.test(signal.id)));
  return {
    capability: id,
    state: ready ? 'ready' : evidence.length > 0 ? 'evidence_only' : 'unavailable',
    score: evidence.reduce((sum, signal) => sum + signal.confidence, 0),
    evidence: [...new Set(evidence.map((signal) => `${signal.id}:${signal.physicalColumn}`))],
    missingEvidence: ready ? [] : missingEvidence,
  };
}

export function projectSemanticCapabilityMatrix(signals: UniversalSignal[]): SemanticCapabilityMatrix {
  const contexts: SemanticCapabilityMatrix['contexts'] = (Object.entries(CONTEXT_RULES) as Array<[Exclude<BusinessContext, 'generic_business'>, Rule[]]>)
    .map(([context, rules]) => ({ context, ...matchingEvidence(signals, rules) }))
    .filter((entry) => entry.score >= 3)
    .sort((left, right) => right.score - left.score || left.context.localeCompare(right.context));
  if (contexts.length === 0) contexts.push({ context: 'generic_business', score: 1, evidence: [] });

  const hasCustomerEntity = has(signals, /^entity\.(customer|patient|student|person)$/);
  const hasCustomerDimension = has(signals, /^(entity\.(gender|person_age)|location\.(city|state_province|region|country|postal_code)|engagement\.segment)$/);
  const hasItem = has(signals, /^item\.(product|sku|medicine|category|brand|service)$/);
  const hasStock = has(signals, /^(inventory\.|quantity\.(units|received|issued|ordered|returned)|status\.stock)/);
  const hasRevenue = has(signals, /^money\.(revenue|sales|receivable|payment|refund_or_change)$/);
  const hasCommercialDimension = has(signals, /^(document\.(order|invoice|sales_order)|entity\.customer|item\.|location\.store)/);
  const hasOperationalEntity = has(signals, /^(document\.(shipment|order)|entity\.(driver|vehicle|carrier|employee)|location\.|status\.|time\.)/);
  const hasOperationalMetric = has(signals, /^(quantity\.|time\.duration|indicator\.|status\.)/);
  const hasFinance = has(signals, /^money\./);
  const hasPerformanceDimension = has(signals, /^(entity\.(employee|team|driver|carrier|doctor|teacher)|item\.|location\.|engagement\.|status\.)/);
  const hasPerformanceMetric = has(signals, /^(indicator\.|engagement\.(rating|survey|outcome|impressions|clicks|ctr|likes|shares)|quantity\.work_hours|money\.(revenue|profit|margin|cost))/);

  return {
    contexts,
    capabilities: [
      capability(signals, 'customer', [/^entity\.(customer|patient|student|person|gender|person_age)/, /^location\./, /^engagement\./], hasCustomerEntity && hasCustomerDimension, ['customer_or_patient_entity', 'profile_or_segmentation_dimension']),
      capability(signals, 'inventory', [/^item\./, /^inventory\./, /^quantity\./, /^status\.stock/], hasItem && hasStock, ['item_or_medicine', 'stock_or_movement_measure']),
      capability(signals, 'revenue', [/^money\./, /^document\.(order|invoice|sales_order)/, /^entity\.customer/, /^item\./, /^location\.store/], hasRevenue && hasCommercialDimension, ['revenue_or_receivable_measure', 'commercial_dimension']),
      capability(signals, 'operations', [/^document\./, /^entity\.(driver|vehicle|carrier|employee)/, /^location\./, /^status\./, /^time\./, /^quantity\./], hasOperationalEntity && hasOperationalMetric, ['operational_entity_or_process', 'operational_measure_or_status']),
      capability(signals, 'finance', [/^money\./, /^document\.(invoice|receipt|journal)/, /^entity\.merchant/], hasFinance, ['financial_measure']),
      capability(signals, 'performance', [/^indicator\./, /^engagement\./, /^entity\./, /^item\./, /^location\./, /^status\./, /^quantity\.work_hours/, /^money\./], hasPerformanceDimension && hasPerformanceMetric, ['comparison_dimension', 'performance_or_outcome_measure']),
    ],
  };
}
