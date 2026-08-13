import type { BusinessSignalRegistry } from './business-signal-detector';

export type PerspectiveId =
  | "operations"
  | "revenue"
  | "inventory"
  | "customer"
  | "performance"
  | "finance";

export interface PerspectiveCandidateEvidence {
  signalId: string;
  canonicalConcept: string;
  contribution: number;
  message: string;
}

export interface PerspectiveCandidate {
  id: PerspectiveId;
  label: string;
  description: string;
  confidenceScore: number;
  supportingSignals: string[];
  evidence: PerspectiveCandidateEvidence[];
}

const PERSPECTIVE_DEFINITIONS: Record<PerspectiveId, { label: string, description: string, mappedSignals: string[] }> = {
  "operations": {
    label: "Operations",
    description: "Understand workflows, delays, bottlenecks and execution performance.",
    mappedSignals: ["driver", "route", "shipment", "delivery_status", "sla", "warehouse"]
  },
  "revenue": {
    label: "Revenue",
    description: "Understand growth, branch performance and revenue trends.",
    mappedSignals: ["revenue", "margin", "discount", "order", "branch", "salesperson"]
  },
  "inventory": {
    label: "Inventory",
    description: "Understand stock movement, aging and replenishment risks.",
    mappedSignals: ["sku", "product", "inventory", "supplier", "stock_movement", "warehouse"]
  },
  "customer": {
    label: "Customer",
    description: "Understand customer behavior and contribution.",
    mappedSignals: ["customer", "segment", "retention", "satisfaction"]
  },
  "performance": {
    label: "Performance",
    description: "Analyze goal achievements and execution efficiency.",
    mappedSignals: ["target", "achievement", "utilization", "productivity"]
  },
  "finance": {
    label: "Finance",
    description: "Analyze profitability, margins, and expenses.",
    mappedSignals: ["cost", "profit", "margin", "expense", "budget"]
  }
};

export function generatePerspectiveCandidates(registry: BusinessSignalRegistry): PerspectiveCandidate[] {
  const candidates: PerspectiveCandidate[] = [];

  for (const [pId, definition] of Object.entries(PERSPECTIVE_DEFINITIONS)) {
    const id = pId as PerspectiveId;
    const supportingSignals: string[] = [];
    const evidence: PerspectiveCandidateEvidence[] = [];
    let sumConfidence = 0;

    for (const signalId of definition.mappedSignals) {
      if (registry.hasSignal(signalId)) {
        const signal = registry.getSignal(signalId)!;
        supportingSignals.push(signalId);
        sumConfidence += signal.confidenceScore;
        
        evidence.push({
          signalId,
          canonicalConcept: signalId,
          contribution: signal.confidenceScore,
          message: `Detected supporting business signal: '${signal.label}'`
        });
      }
    }

    if (supportingSignals.length > 0) {
      const averageConfidence = sumConfidence / supportingSignals.length;
      const lengthBonus = Math.min(20, (supportingSignals.length - 1) * 5);
      
      let confidenceScore = Math.round(averageConfidence + lengthBonus);
      if (confidenceScore > 100) confidenceScore = 100;
      if (confidenceScore < 0) confidenceScore = 0;

      candidates.push({
        id,
        label: definition.label,
        description: definition.description,
        confidenceScore,
        supportingSignals,
        evidence
      });
    }
  }

  // Sort by confidenceScore descending
  return candidates.sort((a, b) => b.confidenceScore - a.confidenceScore);
}
