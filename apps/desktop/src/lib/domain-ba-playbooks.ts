import { TAXONOMY, getSignalType } from './business-signal-detector';

export type DomainBAId =
  | 'revenue'
  | 'finance'
  | 'inventory'
  | 'operations'
  | 'customer'
  | 'performance';

export type DomainBAIntent =
  | 'compare_periods'
  | 'rank_contributors'
  | 'explain_change'
  | 'profitability'
  | 'risk'
  | 'aging'
  | 'performance'
  | 'coverage';

export type DomainBAAnswerShape = 'brief' | 'table' | 'chart_table' | 'decision_pack';

export interface DomainBAQuestion {
  id: string;
  label: string;
  intent: DomainBAIntent;
  requiredSignals: string[];
  optionalSignals: string[];
  answerShape: DomainBAAnswerShape;
}

export interface DomainMetricDefinition {
  id: string;
  label: string;
  requiredSignals: string[];
  optionalSignals: string[];
  formula: string;
  caveatWhenMissing?: string;
}

export interface DomainDriverModel {
  id: string;
  label: string;
  intent: DomainBAIntent;
  candidateDimensions: string[];
  primaryMetric: string;
  secondaryMetrics: string[];
}

export interface DomainCaveatRule {
  id: string;
  label: string;
  missingSignals: string[];
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface DomainChartRule {
  id: string;
  label: string;
  chartType: 'bar' | 'line' | 'table' | 'scatter';
  requiredSignals: string[];
  reason: string;
}

export interface DomainEvidenceRule {
  id: string;
  label: string;
  source: 'rows' | 'profile' | 'runtime_result';
  requiredSignals: string[];
}

export interface DomainSignalTier {
  tier: 'basic' | 'standard' | 'advanced';
  label: string;
  signals: string[];
  unlocks: string[];
}

export interface DomainBAPlaybook {
  domainId: DomainBAId;
  label: string;
  purpose: string;
  signalTiers: DomainSignalTier[];
  supportedQuestions: DomainBAQuestion[];
  metrics: DomainMetricDefinition[];
  driverModels: DomainDriverModel[];
  caveatRules: DomainCaveatRule[];
  chartRules: DomainChartRule[];
  evidenceRules: DomainEvidenceRule[];
}

export const DOMAIN_BA_PLAYBOOKS: DomainBAPlaybook[] = [
  {
    domainId: 'revenue',
    label: 'Revenue / Sales',
    purpose: 'Explain revenue movement, growth and decline drivers, and commercial concentration risk.',
    signalTiers: [
      {
        tier: 'basic',
        label: 'Basic sales file',
        signals: ['revenue', 'product', 'category', 'customer'],
        unlocks: ['Revenue total', 'Top contributors', 'Growth/decline ranking when two periods exist']
      },
      {
        tier: 'standard',
        label: 'Standard sales performance file',
        signals: ['revenue', 'quantity', 'unit_price', 'discount', 'branch', 'channel', 'time_period'],
        unlocks: ['Volume/price/discount explanations', 'Branch/channel comparison', 'Cleaner monthly review']
      },
      {
        tier: 'advanced',
        label: 'Advanced commercial performance file',
        signals: ['revenue', 'cost', 'profit', 'margin', 'salesperson', 'order', 'returns'],
        unlocks: ['Revenue vs profit tension', 'Low-margin high-revenue risk', 'More decision-safe commercial actions']
      }
    ],
    supportedQuestions: [
      {
        id: 'revenue_period_compare',
        label: 'Did revenue increase or decrease between periods?',
        intent: 'compare_periods',
        requiredSignals: ['revenue'],
        optionalSignals: ['time_period', 'product', 'sku', 'branch', 'customer', 'salesperson', 'discount', 'quantity'],
        answerShape: 'decision_pack'
      },
      {
        id: 'revenue_top_growth_decline',
        label: 'Which segments created growth or decline?',
        intent: 'rank_contributors',
        requiredSignals: ['revenue'],
        optionalSignals: ['product', 'sku', 'branch', 'customer', 'salesperson', 'category'],
        answerShape: 'chart_table'
      },
      {
        id: 'discount_revenue_impact',
        label: 'How do discounts affect revenue?',
        intent: 'explain_change',
        requiredSignals: ['revenue', 'discount'],
        optionalSignals: ['product', 'branch', 'customer'],
        answerShape: 'brief'
      }
    ],
    metrics: [
      {
        id: 'revenue',
        label: 'Revenue',
        requiredSignals: ['revenue'],
        optionalSignals: ['discount', 'quantity', 'unit_price'],
        formula: 'sum(revenue)'
      },
      {
        id: 'revenue_delta',
        label: 'Revenue change',
        requiredSignals: ['revenue'],
        optionalSignals: ['time_period'],
        formula: 'current_period.revenue - previous_period.revenue'
      }
    ],
    driverModels: [
      {
        id: 'revenue_driver_rank',
        label: 'Revenue driver ranking',
        intent: 'rank_contributors',
        candidateDimensions: ['product', 'sku', 'category', 'branch', 'customer', 'salesperson', 'channel'],
        primaryMetric: 'revenue_delta',
        secondaryMetrics: ['revenue', 'discount', 'quantity']
      }
    ],
    caveatRules: [
      {
        id: 'missing_period',
        label: 'No period signal',
        missingSignals: ['time_period'],
        message: 'Period labels are required to compare monthly reports safely.',
        severity: 'warning'
      }
    ],
    chartRules: [
      {
        id: 'revenue_delta_bar',
        label: 'Revenue change by segment',
        chartType: 'bar',
        requiredSignals: ['revenue'],
        reason: 'A ranked bar chart makes growth and decline contributors easy to compare.'
      }
    ],
    evidenceRules: [
      {
        id: 'revenue_driver_rows',
        label: 'Rows behind each revenue driver',
        source: 'rows',
        requiredSignals: ['revenue']
      }
    ]
  },
  {
    domainId: 'finance',
    label: 'Finance / Profitability',
    purpose: 'Explain profit, margin, cost pressure, and why revenue leaders may not be profit leaders.',
    signalTiers: [
      {
        tier: 'basic',
        label: 'Basic value file',
        signals: ['revenue', 'category', 'product', 'customer'],
        unlocks: ['Revenue movement only', 'Profit caveat when cost evidence is missing']
      },
      {
        tier: 'standard',
        label: 'Standard profitability file',
        signals: ['revenue', 'cost', 'profit', 'margin', 'discount'],
        unlocks: ['Gross profit ranking', 'Margin comparison', 'Cost pressure explanation']
      },
      {
        tier: 'advanced',
        label: 'Advanced contribution economics file',
        signals: ['purchase_cost', 'operational_cost', 'storage_cost', 'fee', 'returns', 'supplier', 'warehouse'],
        unlocks: ['Contribution margin', 'Fee/storage pressure', 'High-revenue low-profit diagnosis']
      }
    ],
    supportedQuestions: [
      {
        id: 'profitability_period_compare',
        label: 'Did profit improve or weaken between periods?',
        intent: 'profitability',
        requiredSignals: ['revenue'],
        optionalSignals: ['cost', 'purchase_cost', 'operational_cost', 'expense', 'discount', 'fee', 'storage_cost'],
        answerShape: 'decision_pack'
      },
      {
        id: 'high_revenue_weak_margin',
        label: 'Which high-revenue segments have weak margin?',
        intent: 'risk',
        requiredSignals: ['revenue'],
        optionalSignals: ['cost', 'profit', 'margin', 'product', 'category', 'branch'],
        answerShape: 'chart_table'
      }
    ],
    metrics: [
      {
        id: 'gross_profit',
        label: 'Gross profit',
        requiredSignals: ['revenue', 'cost'],
        optionalSignals: ['purchase_cost', 'operational_cost', 'expense'],
        formula: 'sum(revenue) - sum(cost_like_fields)',
        caveatWhenMissing: 'Cost-like fields are missing, so LightBI must not claim profit.'
      },
      {
        id: 'margin',
        label: 'Margin',
        requiredSignals: ['revenue', 'cost'],
        optionalSignals: ['profit'],
        formula: 'profit / revenue',
        caveatWhenMissing: 'Margin cannot be trusted without cost or profit evidence.'
      }
    ],
    driverModels: [
      {
        id: 'profit_driver_rank',
        label: 'Profit driver ranking',
        intent: 'profitability',
        candidateDimensions: ['product', 'sku', 'category', 'branch', 'customer', 'supplier', 'warehouse'],
        primaryMetric: 'profit_delta',
        secondaryMetrics: ['revenue_delta', 'cost_delta', 'margin_delta']
      }
    ],
    caveatRules: [
      {
        id: 'missing_cost_for_profit',
        label: 'Missing cost evidence',
        missingSignals: ['cost'],
        message: 'Profitability conclusions require cost, profit, or cost-like fee evidence.',
        severity: 'critical'
      }
    ],
    chartRules: [
      {
        id: 'profit_margin_table',
        label: 'Profit and margin driver table',
        chartType: 'table',
        requiredSignals: ['revenue'],
        reason: 'Profitability needs revenue, cost, profit, and margin side by side.'
      }
    ],
    evidenceRules: [
      {
        id: 'profit_driver_rows',
        label: 'Rows behind profit drivers',
        source: 'rows',
        requiredSignals: ['revenue']
      }
    ]
  },
  {
    domainId: 'inventory',
    label: 'Inventory / Stock',
    purpose: 'Explain stock aging, overstock, stock-out risk, movement, warehouse exposure, and inventory value.',
    signalTiers: [
      {
        tier: 'basic',
        label: 'Basic inventory snapshot',
        signals: ['sku', 'product', 'warehouse', 'stock_qty'],
        unlocks: ['Stock concentration', 'Warehouse exposure', 'Simple overstock list']
      },
      {
        tier: 'standard',
        label: 'Standard inventory movement file',
        signals: ['stock_qty', 'stock_movement', 'stock_age', 'time_period', 'supplier'],
        unlocks: ['Aging risk', 'Movement comparison', 'Stuck stock follow-up']
      },
      {
        tier: 'advanced',
        label: 'Advanced inventory value file',
        signals: ['stock_qty', 'cost', 'storage_cost', 'unit_price', 'stockout_rate', 'turnover'],
        unlocks: ['Inventory value exposure', 'Carrying cost pressure', 'Turnover/stock-out decision support']
      }
    ],
    supportedQuestions: [
      {
        id: 'inventory_risk',
        label: 'Which products or warehouses need inventory attention?',
        intent: 'risk',
        requiredSignals: ['inventory'],
        optionalSignals: ['sku', 'product', 'warehouse', 'stock_age', 'stock_movement', 'cost'],
        answerShape: 'decision_pack'
      },
      {
        id: 'inventory_period_compare',
        label: 'Which stock positions changed between periods?',
        intent: 'compare_periods',
        requiredSignals: ['inventory'],
        optionalSignals: ['sku', 'product', 'warehouse', 'stock_movement', 'time_period'],
        answerShape: 'chart_table'
      }
    ],
    metrics: [
      {
        id: 'stock_quantity',
        label: 'Stock quantity',
        requiredSignals: ['inventory'],
        optionalSignals: ['stock_qty', 'stock_movement'],
        formula: 'sum(stock quantity)'
      },
      {
        id: 'stock_value',
        label: 'Inventory value exposure',
        requiredSignals: ['inventory', 'cost'],
        optionalSignals: ['warehouse', 'sku'],
        formula: 'sum(stock quantity * cost or declared value)',
        caveatWhenMissing: 'Inventory value cannot be estimated without cost or value evidence.'
      }
    ],
    driverModels: [
      {
        id: 'inventory_risk_rank',
        label: 'Inventory risk ranking',
        intent: 'risk',
        candidateDimensions: ['sku', 'product', 'warehouse', 'supplier', 'category'],
        primaryMetric: 'stock_quantity',
        secondaryMetrics: ['stock_age', 'stock_movement', 'stock_value']
      }
    ],
    caveatRules: [
      {
        id: 'missing_item_or_location',
        label: 'Missing item or location',
        missingSignals: ['sku', 'warehouse'],
        message: 'Inventory action is weaker without item and location evidence.',
        severity: 'warning'
      }
    ],
    chartRules: [
      {
        id: 'inventory_risk_bar',
        label: 'Inventory risk by item or location',
        chartType: 'bar',
        requiredSignals: ['inventory'],
        reason: 'A ranked bar chart exposes concentrated inventory risk.'
      }
    ],
    evidenceRules: [
      {
        id: 'inventory_export_rows',
        label: 'Rows behind inventory risks',
        source: 'rows',
        requiredSignals: ['inventory']
      }
    ]
  },
  {
    domainId: 'operations',
    label: 'Operations / Logistics',
    purpose: 'Explain route, driver, warehouse, SLA, and process bottleneck performance.',
    signalTiers: [
      {
        tier: 'basic',
        label: 'Basic operations activity file',
        signals: ['shipment', 'route', 'driver', 'warehouse', 'delivery_status'],
        unlocks: ['Activity ranking', 'Route/driver workload', 'Follow-up row export']
      },
      {
        tier: 'standard',
        label: 'Standard SLA operations file',
        signals: ['shipment', 'route', 'duration', 'delay', 'sla', 'time_period'],
        unlocks: ['Delay ranking', 'SLA breach analysis', 'Bottleneck identification']
      },
      {
        tier: 'advanced',
        label: 'Advanced logistics cost/service file',
        signals: ['transportation_cost', 'fuel_cost', 'storage_cost', 'vehicle', 'order_accuracy', 'on_time_rate'],
        unlocks: ['Service vs cost trade-off', 'Route economics', 'Operational exception prioritization']
      }
    ],
    supportedQuestions: [
      {
        id: 'logistics_bottleneck',
        label: 'Where does the operation slow down?',
        intent: 'performance',
        requiredSignals: ['route'],
        optionalSignals: ['driver', 'warehouse', 'sla', 'delay', 'delivery_status', 'shipment'],
        answerShape: 'decision_pack'
      }
    ],
    metrics: [
      {
        id: 'shipment_count',
        label: 'Shipment count',
        requiredSignals: ['shipment'],
        optionalSignals: ['route', 'driver', 'warehouse'],
        formula: 'count(shipment)'
      },
      {
        id: 'delay',
        label: 'Delay or SLA breach',
        requiredSignals: ['delay'],
        optionalSignals: ['sla', 'delivery_status'],
        formula: 'sum(delay) or count(SLA breach)'
      }
    ],
    driverModels: [
      {
        id: 'logistics_delay_rank',
        label: 'Delay driver ranking',
        intent: 'performance',
        candidateDimensions: ['route', 'driver', 'warehouse', 'vehicle', 'branch'],
        primaryMetric: 'delay',
        secondaryMetrics: ['shipment_count']
      }
    ],
    caveatRules: [
      {
        id: 'missing_delay_signal',
        label: 'Missing delay signal',
        missingSignals: ['delay', 'sla'],
        message: 'LightBI can rank activity, but cannot claim lateness without delay or SLA evidence.',
        severity: 'warning'
      }
    ],
    chartRules: [
      {
        id: 'logistics_delay_bar',
        label: 'Delay by route or driver',
        chartType: 'bar',
        requiredSignals: ['route'],
        reason: 'A ranked bar chart identifies operational bottlenecks.'
      }
    ],
    evidenceRules: [
      {
        id: 'logistics_followup_rows',
        label: 'Rows behind logistics follow-up list',
        source: 'rows',
        requiredSignals: ['route']
      }
    ]
  },
  {
    domainId: 'customer',
    label: 'Customer',
    purpose: 'Explain customer contribution, concentration, retention, and high-value low-margin risk.',
    signalTiers: [
      {
        tier: 'basic',
        label: 'Basic customer value file',
        signals: ['customer', 'revenue', 'order'],
        unlocks: ['Customer contribution ranking', 'Concentration risk']
      },
      {
        tier: 'standard',
        label: 'Standard customer performance file',
        signals: ['customer', 'segment', 'revenue', 'profit', 'time_period'],
        unlocks: ['Growing/shrinking customers', 'Segment contribution', 'High-value customer review']
      },
      {
        tier: 'advanced',
        label: 'Advanced customer economics file',
        signals: ['customer', 'retention', 'churn', 'acquisition_cost', 'discount', 'support_cost', 'margin'],
        unlocks: ['Retention/churn diagnosis', 'Customer profitability', 'High-service low-margin risk']
      }
    ],
    supportedQuestions: [
      {
        id: 'customer_contribution',
        label: 'Which customers contribute the most value?',
        intent: 'rank_contributors',
        requiredSignals: ['customer'],
        optionalSignals: ['revenue', 'profit', 'margin', 'segment', 'order'],
        answerShape: 'chart_table'
      }
    ],
    metrics: [
      {
        id: 'customer_value',
        label: 'Customer value',
        requiredSignals: ['customer'],
        optionalSignals: ['revenue', 'profit', 'order_count'],
        formula: 'sum(value by customer)'
      }
    ],
    driverModels: [
      {
        id: 'customer_value_rank',
        label: 'Customer value ranking',
        intent: 'rank_contributors',
        candidateDimensions: ['customer', 'segment', 'branch'],
        primaryMetric: 'revenue',
        secondaryMetrics: ['profit', 'margin', 'order_count']
      }
    ],
    caveatRules: [
      {
        id: 'missing_customer_value',
        label: 'Missing customer value',
        missingSignals: ['revenue', 'profit'],
        message: 'Customer ranking needs revenue, profit, order count, or another value signal.',
        severity: 'warning'
      }
    ],
    chartRules: [
      {
        id: 'customer_contribution_bar',
        label: 'Customer contribution',
        chartType: 'bar',
        requiredSignals: ['customer'],
        reason: 'Contribution ranking shows concentration and dependency risk.'
      }
    ],
    evidenceRules: [
      {
        id: 'customer_rows',
        label: 'Rows behind customer contribution',
        source: 'rows',
        requiredSignals: ['customer']
      }
    ]
  },
  {
    domainId: 'performance',
    label: 'Performance / KPI',
    purpose: 'Explain target achievement, gaps, top/bottom performers, and operational performance risk.',
    signalTiers: [
      {
        tier: 'basic',
        label: 'Basic KPI file',
        signals: ['kpi', 'actual', 'branch', 'employee'],
        unlocks: ['Top/bottom ranking', 'Current performance snapshot']
      },
      {
        tier: 'standard',
        label: 'Standard target performance file',
        signals: ['target', 'actual', 'achievement', 'time_period', 'team'],
        unlocks: ['Target gap', 'Achievement rate', 'Period comparison']
      },
      {
        tier: 'advanced',
        label: 'Advanced performance management file',
        signals: ['target', 'actual', 'revenue', 'cost', 'quality_score', 'sla', 'capacity'],
        unlocks: ['Performance vs cost/quality trade-off', 'Capacity caveats', 'Decision-safe performance actions']
      }
    ],
    supportedQuestions: [
      {
        id: 'target_vs_actual',
        label: 'Who or what is above or below target?',
        intent: 'performance',
        requiredSignals: ['target'],
        optionalSignals: ['actual', 'achievement', 'department', 'branch', 'employee'],
        answerShape: 'decision_pack'
      }
    ],
    metrics: [
      {
        id: 'performance_gap',
        label: 'Performance gap',
        requiredSignals: ['target', 'actual'],
        optionalSignals: ['achievement'],
        formula: 'actual - target',
        caveatWhenMissing: 'Target-vs-actual conclusions need both target and actual/achievement evidence.'
      }
    ],
    driverModels: [
      {
        id: 'performance_gap_rank',
        label: 'Performance gap ranking',
        intent: 'performance',
        candidateDimensions: ['department', 'branch', 'employee', 'team', 'kpi'],
        primaryMetric: 'performance_gap',
        secondaryMetrics: ['target', 'actual', 'achievement']
      }
    ],
    caveatRules: [
      {
        id: 'missing_target_or_actual',
        label: 'Missing target or actual',
        missingSignals: ['target', 'actual'],
        message: 'Performance decisions need target and actual or achievement values.',
        severity: 'critical'
      }
    ],
    chartRules: [
      {
        id: 'performance_gap_bar',
        label: 'Performance gap by segment',
        chartType: 'bar',
        requiredSignals: ['target', 'actual'],
        reason: 'A gap chart highlights who exceeds or misses target.'
      }
    ],
    evidenceRules: [
      {
        id: 'performance_rows',
        label: 'Rows behind performance gaps',
        source: 'rows',
        requiredSignals: ['target']
      }
    ]
  }
];

export function listDomainBAPlaybooks(): DomainBAPlaybook[] {
  return DOMAIN_BA_PLAYBOOKS;
}

export function getDomainBAPlaybook(domainId: DomainBAId): DomainBAPlaybook | undefined {
  return DOMAIN_BA_PLAYBOOKS.find(playbook => playbook.domainId === domainId);
}

export function listKnownSignalsForDomain(domainId: DomainBAId): string[] {
  return Object.entries(TAXONOMY)
    .filter(([, value]) => value.domain === domainId || (domainId === 'finance' && value.domain === 'revenue'))
    .map(([signal]) => signal);
}

export function listSignalsByTier(domainId: DomainBAId): DomainSignalTier[] {
  return getDomainBAPlaybook(domainId)?.signalTiers ?? [];
}

export function getPlaybookSignalRole(signalId: string): ReturnType<typeof getSignalType> {
  return getSignalType(signalId);
}
