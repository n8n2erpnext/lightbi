import type { DatasetUnderstanding } from './dataset-understanding-contract';
import type { AISafeBriefing, AISemanticField } from './ai-briefing-contract';
import { getSignalType } from './business-signal-detector';
import type { SemanticCoverageItem } from './semantic-coverage';
import type { DatasetUnderstandingResult, DirtySignal } from './understanding-next/contracts';

function normalizeBriefingGrain(grain: DatasetUnderstandingResult['profile']['grain']): DatasetUnderstanding['grain'] {
  if (grain === 'master_data') return 'entity';
  if (grain === 'transaction') return 'transaction';
  return grain;
}

export function generateAIBriefing(understanding: DatasetUnderstanding): AISafeBriefing {
  const semanticFields: AISemanticField[] = (understanding.detectedConcepts || []).map(concept => {
    let role: "dimension" | "measure" | "time" | "unknown" = "unknown";
    const baseType = getSignalType(concept.canonicalConcept);
    
    if (concept.canonicalConcept === "unrecognized" || concept.canonicalConcept === "unknown") {
      role = "unknown";
    } else if (concept.canonicalConcept.endsWith("_id")) {
      role = "dimension";
    } else if (baseType === "dimension" || baseType === "measure" || baseType === "time") {
      role = baseType;
    }

    return {
      canonicalId: concept.canonicalConcept,
      label: concept.displayName || concept.canonicalConcept,
      domain: concept.businessDomain || 'general',
      role,
      confidence: concept.confidenceScore
    };
  });
  const seenSemanticColumns = new Set(
    semanticFields.map(field => (field.physicalColumn || field.label || field.canonicalId).toLowerCase())
  );

  for (const item of understanding.semanticCoverage?.items ?? []) {
    if (item.status !== 'unknown_business_like' && item.status !== 'partial') continue;
    const key = item.physicalColumn.toLowerCase();
    if (seenSemanticColumns.has(key)) continue;
    seenSemanticColumns.add(key);
    semanticFields.push(semanticCoverageItemToField(item));
  }

  const caveatsSet = new Set<string>();
  if (understanding.caveats) {
    understanding.caveats.forEach(c => caveatsSet.add(c));
  }
  if (understanding.readiness?.caveats) {
    understanding.readiness.caveats.forEach(c => caveatsSet.add(c));
  }
  for (const item of understanding.semanticCoverage?.items ?? []) {
    if (item.status === 'unknown_business_like') {
      caveatsSet.add(`Unmapped business-like column kept for review: ${item.physicalColumn}.`);
    } else if (item.status === 'partial') {
      caveatsSet.add(`Partially mapped business column needs review: ${item.physicalColumn}.`);
    }
  }

  const safeActionHints: string[] = [];
  if ((understanding.semanticCoverage?.summary.unknownBusinessLike ?? 0) > 0) {
    safeActionHints.push('Review unmapped business-like fields before final BA/AI narrative.');
  }
  if (understanding.opportunities) {
    for (const opp of understanding.opportunities) {
      if (opp.confidence === 'high' || opp.confidence === 'medium') {
        if (safeActionHints.length < 5) {
          safeActionHints.push(`Can ${opp.label}`);
        }
      }
    }
  }

  return {
    datasetId: understanding.datasetId || 'unknown_dataset',
    generatedAt: new Date().toISOString(),
    grain: understanding.grain ?? 'unknown',
    grainEvidence: understanding.grainEvidence || '',
    readinessTier: understanding.readiness?.tier || 'exploratory_only',
    readinessScore: understanding.readiness?.score || 0,
    semanticFields,
    caveats: Array.from(caveatsSet),
    safeActionHints,
    semanticCoverage: understanding.semanticCoverage
      ? {
          ...understanding.semanticCoverage.summary,
          unknownBusinessLikeColumns: understanding.semanticCoverage.items
            .filter(item => item.status === 'unknown_business_like')
            .map(item => item.physicalColumn),
          partialColumns: understanding.semanticCoverage.items
            .filter(item => item.status === 'partial')
            .map(item => item.physicalColumn)
        }
      : undefined
  };
}

function semanticCoverageItemToField(item: SemanticCoverageItem): AISemanticField {
  return {
    canonicalId: `${item.status}:${item.physicalColumn}`,
    label: item.physicalColumn,
    domain: 'unmapped',
    role: semanticCoverageRole(item),
    confidence: item.confidence,
    coverageStatus: item.status,
    physicalColumn: item.physicalColumn,
    sampleValues: item.topValues,
    reason: item.reason
  };
}

function semanticCoverageRole(item: SemanticCoverageItem): AISemanticField['role'] {
  if (item.dataType === 'number') return 'measure';
  if (item.dataType === 'date') return 'time';
  if (item.dataType === 'string' || item.dataType === 'boolean') return 'dimension';
  return 'unknown';
}

export function generateAIBriefingFromUnderstandingNext(
  understanding: DatasetUnderstandingResult
): AISafeBriefing {
  const semanticFields: AISemanticField[] = understanding.signals
    .filter(signal => signal.role !== "technical")
    .slice(0, 30)
    .map(signal => ({
      canonicalId: signal.canonicalId,
      label: signal.physicalColumn || signal.label,
      domain: signal.domain,
      role:
        signal.role === "time" || signal.role === "measure" || signal.role === "dimension"
          ? signal.role
          : signal.role === "status" || signal.role === "identifier"
            ? "dimension"
            : "unknown",
      confidence: signal.confidence,
      physicalColumn: signal.physicalColumn,
    }));

  const caveats = [
    ...understanding.quality.blockedReasons,
    ...understanding.quality.dirtySignals
      .filter(signal => signal.severity !== "info")
      .map(signal => signal.column ? `${signal.message}: ${signal.column}` : signal.message)
  ];

  const readiness = scoreUnderstandingNextReadiness(understanding);

  return {
    datasetId: understanding.source.fileNames[0] ?? "local_dataset",
    generatedAt: new Date().toISOString(),
    grain: normalizeBriefingGrain(understanding.profile.grain),
    grainEvidence: [
      `${understanding.profile.documentType.replace(/_/g, " ")}`,
      understanding.profile.detectedDomains.length > 0
        ? `domains: ${understanding.profile.detectedDomains.join(", ")}`
        : "no domain signals"
    ].join(" · "),
    readinessTier: readiness.tier,
    readinessScore: readiness.score,
    semanticFields,
    caveats,
    safeActionHints: understanding.availableActions
      .slice(0, 5)
      .map(action => `Can run ${action.label}`)
  };
}

function scoreUnderstandingNextReadiness(
  understanding: DatasetUnderstandingResult
): { tier: "decision_support" | "caution" | "exploratory_only"; score: number } {
  if (understanding.quality.headerStatus === "failed") {
    return { tier: "exploratory_only", score: 25 };
  }

  const dataQuality = scoreDataQuality(understanding);
  const understandingConfidence = scoreUnderstandingConfidence(understanding);
  const semanticCoverage = scoreSemanticCoverage(understanding);
  const executionReliability = scoreExecutionReliability(understanding);

  let score = Math.round(
    dataQuality * 0.4 +
    understandingConfidence * 0.25 +
    semanticCoverage * 0.2 +
    executionReliability * 0.15
  );

  score -= dirtySignalPenalty(understanding.quality.dirtySignals);
  score -= Math.min(20, understanding.quality.blockedReasons.length * 10);

  if (!understanding.columns?.length) {
    score = Math.min(score, 84);
  }

  if (understanding.quality.dirtySignals.some(signal => signal.severity === "blocking")) {
    score = Math.min(score, 60);
  } else if (understanding.quality.dirtySignals.some(signal => signal.severity === "warning")) {
    score = Math.min(score, 89);
  }

  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
  const tier = boundedScore >= 85
      ? "caution"
      : "exploratory_only";

  return {
    tier: boundedScore >= 90 ? "decision_support" : tier,
    score: boundedScore
  };
}

function scoreDataQuality(understanding: DatasetUnderstandingResult): number {
  const header = headerQuality(understanding.quality.headerStatus);
  const columns = understanding.columns ?? [];
  if (columns.length === 0) return Math.min(header, 65);

  const rowCount = Math.max(1, understanding.source.sampleRowCount || understanding.source.parsedRowCount || 1);
  const completeness = average(columns.map(column => (column.health.nonEmptyCount / rowCount) * 100));
  const consistency = average(columns.map(column => {
    if (column.health.inferredType === "mixed") return 35;
    if (column.health.inferredType === "empty") return 0;
    return 100;
  }));
  const uniqueness = Math.max(
    0,
    ...columns.map(column => Math.min(100, (column.health.distinctCount / rowCount) * 100))
  );
  const identifierSignals = understanding.signals.filter(signal => signal.role === "identifier");
  const keyQuality = identifierSignals.length
    ? Math.max(...identifierSignals.map(signal => signal.confidence))
    : Math.max(
        0,
        ...columns.map(column => {
          const completenessRatio = column.health.nonEmptyCount / rowCount;
          const distinctRatio = column.health.distinctCount / rowCount;
          return Math.min(100, distinctRatio * 100 - (1 - completenessRatio) * 50);
        })
      );

  return clampScore(
    completeness * 0.3 +
    consistency * 0.2 +
    uniqueness * 0.25 +
    keyQuality * 0.25
  );
}

function scoreUnderstandingConfidence(understanding: DatasetUnderstandingResult): number {
  const usableSignals = understanding.signals.filter(signal => signal.role !== "technical");
  const confidence = usableSignals.length
    ? average(usableSignals.map(signal => signal.confidence))
    : 0;
  const signalDensity = understanding.source.sourceColumnCount > 0
    ? Math.min(100, (usableSignals.length / understanding.source.sourceColumnCount) * 100)
    : 0;
  const profileConfidence =
    (understanding.profile.grain !== "unknown" ? 50 : 0) +
    (understanding.profile.detectedDomains.length > 0 ? 50 : 0);

  return clampScore(confidence * 0.55 + signalDensity * 0.2 + profileConfidence * 0.25);
}

function scoreSemanticCoverage(understanding: DatasetUnderstandingResult): number {
  const roles = new Set(understanding.signals.filter(signal => signal.role !== "technical").map(signal => signal.role));
  let score = 0;
  if (roles.has("measure")) score += 30;
  if (roles.has("dimension") || roles.has("status") || roles.has("identifier")) score += 30;
  if (roles.has("time")) score += 20;
  if (understanding.profile.grain !== "unknown") score += 10;
  if (understanding.profile.detectedDomains.length > 0) score += 10;
  return clampScore(score);
}

function scoreExecutionReliability(understanding: DatasetUnderstandingResult): number {
  const executableActions = understanding.availableActions.filter(action => action.executionScope !== "not_supported");
  const bestFit = Math.max(0, ...understanding.recommendedQuestions.map(question => question.fitScore));
  const actionCoverage = understanding.recommendedQuestions.length > 0
    ? (executableActions.length / understanding.recommendedQuestions.length) * 100
    : executableActions.length > 0 ? 70 : 0;
  const fullFileBonus = executableActions.some(action => action.executionScope === "full_local_file") ? 10 : 0;
  const unavailablePenalty = Math.min(25, understanding.unavailableActions.length * 5);
  return clampScore(bestFit * 0.45 + actionCoverage * 0.45 + fullFileBonus - unavailablePenalty);
}

function headerQuality(status: DatasetUnderstandingResult["quality"]["headerStatus"]): number {
  switch (status) {
    case "clean":
      return 100;
    case "recovered":
      return 85;
    case "ambiguous":
      return 55;
    case "failed":
      return 0;
  }
}

function dirtySignalPenalty(signals: DirtySignal[]): number {
  return Math.min(
    30,
    signals.reduce((sum, signal) => {
      switch (signal.severity) {
        case "blocking":
          return sum + 10;
        case "warning":
          return sum + 5;
        case "info":
          return sum + 1;
      }
    }, 0)
  );
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
