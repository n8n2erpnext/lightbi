import type { AISafeBriefing, AISemanticField } from "./ai-briefing-contract";
import type { CanonicalConsumerBuildResultV1 } from "./understanding-core/canonical-consumer-boundary";

function briefingGrain(value: string): AISafeBriefing["grain"] {
  if (value === "document") return "transaction";
  if (value === "event") return "event";
  if (value === "snapshot") return "snapshot";
  if (value === "master") return "entity";
  if (value === "summary") return "summary";
  return "unknown";
}

export function generateCanonicalAIBriefing(artifact: CanonicalConsumerBuildResultV1): AISafeBriefing {
  if (artifact.status !== "valid") {
    return {
      datasetId: artifact.datasetStateIdentity,
      generatedAt: new Date().toISOString(),
      grain: "unknown",
      grainEvidence: "Canonical artifact invalid",
      readinessTier: "exploratory_only",
      readinessScore: 0,
      semanticFields: [],
      caveats: [...artifact.blockers, ...artifact.caveats],
      safeActionHints: [],
    };
  }
  const physicalByIndex = new Map(artifact.canonicalSource.physical.sourceProfile.columns.map((column) => [column.sourceColumnIndex, column.physicalColumnName]));
  const semanticFields: AISemanticField[] = artifact.canonicalSource.semantic.columns.flatMap((column) => {
    if (!column.selectedCandidateId || !["confirmed", "probable"].includes(column.finalState)) return [];
    const trace = column.candidateTraces.find((candidate) => candidate.candidateId === column.selectedCandidateId);
    return [{
      canonicalId: column.selectedCandidateId,
      label: physicalByIndex.get(column.sourceColumnIndex) ?? column.physicalColumn,
      domain: "canonical",
      role: column.selectedCandidateId.includes("date") || column.selectedCandidateId.includes("period") ? "time" : "unknown",
      confidence: column.finalState === "confirmed" ? 100 : 75,
      physicalColumn: column.physicalColumn,
      reason: trace?.ruleIds.join(", "),
    }];
  });
  const trustRatios = artifact.canonicalSource.readiness.trustDimensions.map((item) => item.measurableRatio?.ratio).filter((value): value is number => value !== null && value !== undefined);
  const readinessScore = trustRatios.length ? Math.round((trustRatios.reduce((sum, value) => sum + value, 0) / trustRatios.length) * 100) : 0;
  return {
    datasetId: artifact.canonicalSource.physical.sourceProfile.source.label,
    generatedAt: new Date().toISOString(),
    grain: briefingGrain(artifact.canonicalSource.grain.signature.structuralForm.value),
    grainEvidence: `${artifact.canonicalSource.grain.signature.structuralForm.value}:${artifact.canonicalSource.grain.signature.structuralForm.state}`,
    readinessTier: readinessScore >= 90 ? "decision_support" : readinessScore >= 70 ? "caution" : "exploratory_only",
    readinessScore,
    semanticFields,
    caveats: [...artifact.blockers, ...artifact.caveats],
    safeActionHints: artifact.questionGeneration.defaultQuestions.map((question) => question.title),
  };
}
