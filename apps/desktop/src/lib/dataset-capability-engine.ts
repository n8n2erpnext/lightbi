import type { DatasetGrain } from './dataset-understanding-contract';
import type { BusinessSignal } from './business-signal-detector';
import { getSignalType } from './business-signal-detector';

export type CapabilityType =
  | "trend_over_time"
  | "group_by_dimension"
  | "distribution"
  | "relationship"
  | "table_preview";

export interface DatasetCapability {
  type: CapabilityType;
  supportingSignals: string[];
  available: boolean;
}

export interface AnalysisOpportunity {
  id: string;
  label: string;
  description: string;
  requiredCapabilities: CapabilityType[];
  grain: DatasetGrain;
  confidence: "high" | "medium" | "low";
}

export function detectCapabilities(signals: BusinessSignal[]): DatasetCapability[] {
  const capabilities: DatasetCapability[] = [];
  
  const measures = signals.filter(s => getSignalType(s.canonicalId) === 'measure').map(s => s.canonicalId);
  const dimensions = signals.filter(s => getSignalType(s.canonicalId) === 'dimension').map(s => s.canonicalId);
  const times = signals.filter(s => getSignalType(s.canonicalId) === 'time').map(s => s.canonicalId);

  // 1. trend_over_time -> có ít nhất 1 time signal + 1 measure signal
  if (times.length > 0 && measures.length > 0) {
    capabilities.push({
      type: "trend_over_time",
      supportingSignals: [...times, ...measures],
      available: true
    });
  }

  // 2. group_by_dimension -> có ít nhất 1 dimension signal + 1 measure signal
  if (dimensions.length > 0 && measures.length > 0) {
    capabilities.push({
      type: "group_by_dimension",
      supportingSignals: [...dimensions, ...measures],
      available: true
    });
  }

  // 3. distribution -> có ít nhất 1 measure HOẶC 1 dimension signal
  if (measures.length > 0 || dimensions.length > 0) {
    capabilities.push({
      type: "distribution",
      supportingSignals: [...measures, ...dimensions],
      available: true
    });
  }

  // 4. relationship -> có ≥ 2 measures HOẶC ≥ 2 dimensions
  if (measures.length >= 2 || dimensions.length >= 2) {
    capabilities.push({
      type: "relationship",
      supportingSignals: [...measures, ...dimensions],
      available: true
    });
  }

  // 5. table_preview -> luôn available
  capabilities.push({
    type: "table_preview",
    supportingSignals: [],
    available: true
  });

  return capabilities;
}

export function generateOpportunities(capabilities: DatasetCapability[], grain: DatasetGrain): AnalysisOpportunity[] {
  const opportunities: AnalysisOpportunity[] = [];
  
  const hasType = (type: CapabilityType) => capabilities.some(c => c.type === type && c.available);

  if (grain === "event" && hasType("trend_over_time") && hasType("group_by_dimension")) {
    opportunities.push({
      id: "event_activity_trend",
      label: "Investigate activity by dimension over time",
      description: "Analyze event-level activity grouped by key dimensions over time.",
      requiredCapabilities: ["trend_over_time", "group_by_dimension"],
      grain: "event",
      confidence: "high"
    });
  }

  if (grain === "snapshot" && hasType("distribution")) {
    opportunities.push({
      id: "snapshot_distribution",
      label: "Review distribution and aging",
      description: "Analyze the current state distribution and aging profile.",
      requiredCapabilities: ["distribution"],
      grain: "snapshot",
      confidence: "medium"
    });
  }

  if (grain === "entity" && hasType("group_by_dimension")) {
    opportunities.push({
      id: "entity_performance",
      label: "Analyze performance by segment",
      description: "Analyze entity performance grouped by relevant segments.",
      requiredCapabilities: ["group_by_dimension"],
      grain: "entity",
      confidence: "medium"
    });
  }

  if (grain === "summary" && hasType("trend_over_time")) {
    opportunities.push({
      id: "summary_trend",
      label: "Track performance over time",
      description: "Monitor summary level performance metrics over time.",
      requiredCapabilities: ["trend_over_time"],
      grain: "summary",
      confidence: "high"
    });
  }

  if (grain === "unknown" && hasType("table_preview")) {
    opportunities.push({
      id: "explore_structure",
      label: "Explore dataset structure and sample rows",
      description: "Preview the data to understand its basic structure.",
      requiredCapabilities: ["table_preview"],
      grain: "unknown",
      confidence: "low"
    });
  }

  return opportunities;
}
