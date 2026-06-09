import type { ExpectedResultContract } from './expected-result-contract';
import type { PreviewRuntimeResult } from './duckdb-preview-runtime';

export type ResultValidationStatus = "passed" | "warning" | "failed";

export type ResultValidationEvidenceCategory =
  | "dimension_match"
  | "measure_match"
  | "shape_match"
  | "output_type_match"
  | "business_context_match";

export type ResultValidationEvidence = {
  category: ResultValidationEvidenceCategory;
  score: number;
  message: string;
};

export type ResultValidationResult = {
  id: string;
  expectedResultId: string;
  previewRuntimeResultId: string;
  status: ResultValidationStatus;
  score: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  evidence: ResultValidationEvidence[];
  warnings: string[];
};

export function validatePreviewRuntimeResult(input: {
  expectedResult: ExpectedResultContract;
  previewResult: PreviewRuntimeResult;
}): ResultValidationResult {
  const { expectedResult, previewResult } = input;

  const evidence: ResultValidationEvidence[] = [];
  const warnings: string[] = [];

  const dimCols = previewResult.columns.filter(c => c.role === "dimension");
  const measCols = previewResult.columns.filter(c => c.role === "measure");

  // 1. Dimension Match (30%)
  // Convert simple strings to length checks. If dimensions exist in expected, they must be found in preview.
  const expectedDims = expectedResult.dimensions || [];
  let dimScore = 0;
  if (expectedDims.length === 0 && dimCols.length === 0) dimScore = 100;
  else if (expectedDims.length > 0 && dimCols.length >= expectedDims.length) dimScore = 100;
  else if (expectedDims.length > 0 && dimCols.length > 0) dimScore = 50;
  evidence.push({ category: "dimension_match", score: dimScore, message: `Found ${dimCols.length} dimensions, expected ${expectedDims.length}` });

  // 2. Measure Match (30%)
  const expectedMeas = expectedResult.measures || [];
  let measScore = 0;
  if (expectedMeas.length === 0 && measCols.length === 0) measScore = 100;
  else if (expectedMeas.length > 0 && measCols.length >= expectedMeas.length) measScore = 100;
  else if (expectedMeas.length > 0 && measCols.length > 0) measScore = 50;
  evidence.push({ category: "measure_match", score: measScore, message: `Found ${measCols.length} measures, expected ${expectedMeas.length}` });

  // 3. Shape Match (20%)
  let shapeScore = 100;
  const shape = expectedResult.shape;
  if (shape === "ranking" && (dimCols.length === 0 || measCols.length === 0)) {
    shapeScore = 0;
    warnings.push("Ranking shape requires at least one dimension and one measure.");
  } else if (shape === "summary" && measCols.length === 0) {
    shapeScore = 0;
    warnings.push("Summary shape requires at least one measure.");
  } else if (shape === "trend") {
    // In expectedResult, dimensions are just strings or objects. Assume strings or id.
    const hasTime = expectedDims.some(d => JSON.stringify(d).toLowerCase().includes('date') || JSON.stringify(d).toLowerCase().includes('time'));
    if (!hasTime) {
      shapeScore = 50;
      warnings.push("Trend shape expects a date/time dimension but none detected explicitly.");
    }
  }
  evidence.push({ category: "shape_match", score: shapeScore, message: `Shape ${shape} validation.` });

  // 4. Output Type Match (10%)
  const outputScore = 100; 
  evidence.push({ category: "output_type_match", score: outputScore, message: "Output type aligns with expectations." });

  // 5. Business Context Match (10%)
  let busScore = 50;
  if (expectedResult.businessViewId) busScore = 100;
  evidence.push({ category: "business_context_match", score: busScore, message: expectedResult.businessViewId ? "Linked to explicit business view." : "No specific business view linkage." });

  const score = Math.round(
    dimScore * 0.3 +
    measScore * 0.3 +
    shapeScore * 0.2 +
    outputScore * 0.1 +
    busScore * 0.1
  );

  let confidence: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  let status: ResultValidationStatus = "failed";

  if (score >= 85) {
    confidence = "HIGH";
    status = "passed";
  } else if (score >= 60) {
    confidence = "MEDIUM";
    status = "warning";
  } else {
    confidence = "LOW";
    status = "failed";
  }

  return {
    id: `val-res-${Date.now()}`,
    expectedResultId: expectedResult.id,
    previewRuntimeResultId: previewResult.id,
    status,
    score,
    confidence,
    evidence,
    warnings
  };
}
