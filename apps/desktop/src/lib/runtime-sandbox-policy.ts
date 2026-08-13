import type { CompiledQueryContract } from './safe-sql-compiler';
import type { RuntimeBoundaryArtifact } from './runtime-boundary-contract';
import type { ExpectedResultContract } from './expected-result-contract';
import { validateExpectedResultContract } from './expected-result-contract';

export type SandboxDecision = "allow" | "warn" | "block";

export type SandboxPolicy = {
  maxDatasets: number;
  maxRelationships: number;
  maxRowsPreview: number;
  maxExecutionMs: number;
  maxMemoryMB: number;
};

export type SandboxExecutionRequest = {
  id: string;
  compiledQueryId: string;
  boundaryArtifactId: string;
  expectedResultId: string;
  datasetCount: number;
  relationshipCount: number;
  policy: SandboxPolicy;
};

export type SandboxEvaluationResult = {
  decision: SandboxDecision;
  canExecute: boolean;
  reasons: string[];
  warnings: string[];
};

export const DEFAULT_SANDBOX_POLICY: SandboxPolicy = {
  maxDatasets: 3,
  maxRelationships: 2,
  maxRowsPreview: 100,
  maxExecutionMs: 15000,
  maxMemoryMB: 1024
};

export type CreateSandboxExecutionRequestInput = {
  compiledQuery: CompiledQueryContract;
  boundaryArtifact: RuntimeBoundaryArtifact;
  expectedResult: ExpectedResultContract;
  policy?: SandboxPolicy;
};

export function createSandboxExecutionRequest(input: CreateSandboxExecutionRequestInput): SandboxExecutionRequest {
  const { compiledQuery, boundaryArtifact, expectedResult, policy = DEFAULT_SANDBOX_POLICY } = input;

  return {
    id: `sandbox-req:${compiledQuery.id}`,
    compiledQueryId: compiledQuery.id,
    boundaryArtifactId: boundaryArtifact.id,
    expectedResultId: expectedResult.id,
    datasetCount: compiledQuery.sources.length,
    relationshipCount: compiledQuery.joins.length,
    policy
  };
}

export type EvaluateSandboxPolicyInput = {
  request: SandboxExecutionRequest;
  compiledQuery: CompiledQueryContract;
  boundaryArtifact: RuntimeBoundaryArtifact;
  expectedResult: ExpectedResultContract;
};

export function evaluateSandboxPolicy(input: EvaluateSandboxPolicyInput): SandboxEvaluationResult {
  const { request, compiledQuery, boundaryArtifact, expectedResult } = input;
  const policy = request.policy;

  const reasons: string[] = [];
  const warnings: string[] = [];
  let decision: SandboxDecision = "allow";

  // BLOCK conditions
  if (boundaryArtifact.status === "handoff_blocked") {
    decision = "block";
    reasons.push("Boundary artifact is blocked.");
  }

  if (compiledQuery.status === "blocked") {
    decision = "block";
    reasons.push("Compiled query is blocked.");
  }

  const expectedResultValid = validateExpectedResultContract(expectedResult);
  if (!expectedResultValid.valid) {
    decision = "block";
    reasons.push("Expected result is invalid.");
  }

  if (request.datasetCount > policy.maxDatasets * 2) {
    decision = "block";
    reasons.push(`Dataset count (${request.datasetCount}) severely exceeds policy max (${policy.maxDatasets * 2}).`);
  }

  // WARN conditions (if not already blocked)
  if (decision !== "block") {
    if (request.datasetCount > policy.maxDatasets) {
      decision = "warn";
      warnings.push(`Dataset count (${request.datasetCount}) exceeds policy max (${policy.maxDatasets}).`);
    }

    if (request.relationshipCount > policy.maxRelationships) {
      decision = "warn";
      warnings.push(`Relationship count (${request.relationshipCount}) exceeds policy max (${policy.maxRelationships}).`);
    }

    if (expectedResult.confidence === "LOW") {
      decision = "warn";
      warnings.push("Expected result confidence is LOW.");
    }
  }

  return {
    decision,
    canExecute: decision !== "block",
    reasons,
    warnings
  };
}

export function summarizeSandboxEvaluation(result: SandboxEvaluationResult): string {
  if (result.decision === "block") {
    return "Runtime sandbox blocked execution.";
  }
  if (result.decision === "warn") {
    return "Runtime sandbox detected complexity risks.";
  }
  return "Runtime sandbox considers this analysis safe.";
}
