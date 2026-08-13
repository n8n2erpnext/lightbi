import type { CompiledQueryContract } from './safe-sql-compiler';
import type { ExpectedResultContract } from './expected-result-contract';
import type { SandboxExecutionRequest, SandboxEvaluationResult } from './runtime-sandbox-policy';

export type PreviewResultStatus = "ready" | "warning" | "blocked";

export type PreviewResultColumnRole = "dimension" | "measure" | "unknown";

export type PreviewResultColumn = {
  id: string;
  label: string;
  role: PreviewResultColumnRole;
  inferredFromExpectedId?: string;
};

export type PreviewResultRow = Record<string, string | number | boolean | null>;

export type PreviewResultContract = {
  id: string;
  compiledQueryId: string;
  expectedResultId: string;
  sandboxRequestId: string;
  status: PreviewResultStatus;
  columns: PreviewResultColumn[];
  rows: PreviewResultRow[];
  rowCountEstimate?: number;
  truncated: boolean;
  warnings: string[];
};

export type CreatePreviewResultContractInput = {
  compiledQuery: CompiledQueryContract;
  expectedResult: ExpectedResultContract;
  sandboxRequest: SandboxExecutionRequest;
  sandboxEvaluation: SandboxEvaluationResult;
};

export function createPreviewResultContract(input: CreatePreviewResultContractInput): PreviewResultContract {
  const { compiledQuery, expectedResult, sandboxRequest, sandboxEvaluation } = input;

  let status: PreviewResultStatus = "ready";
  const columns: PreviewResultColumn[] = [];
  const warnings: string[] = [...sandboxEvaluation.warnings];

  if (!sandboxEvaluation.canExecute) {
    status = "blocked";
  } else if (sandboxEvaluation.decision === "warn") {
    status = "warning";
  }

  if (status !== "blocked") {
    expectedResult.dimensions.forEach(d => {
      columns.push({
        id: d.id,
        label: d.label,
        role: "dimension",
        inferredFromExpectedId: d.id
      });
    });

    expectedResult.measures.forEach(m => {
      columns.push({
        id: m.id,
        label: m.label,
        role: "measure",
        inferredFromExpectedId: m.id
      });
    });
  }

  warnings.push("Preview result contract only. No data has been executed.");

  return {
    id: `preview-result:${compiledQuery.id}`,
    compiledQueryId: compiledQuery.id,
    expectedResultId: expectedResult.id,
    sandboxRequestId: sandboxRequest.id,
    status,
    columns,
    rows: [],
    truncated: false,
    warnings
  };
}

export type ValidatePreviewResultContractResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export function validatePreviewResultContract(
  contract: PreviewResultContract,
  expectedResult: ExpectedResultContract
): ValidatePreviewResultContractResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (contract.expectedResultId !== expectedResult.id) {
    errors.push("Contract expectedResultId mismatches expectedResult.id");
  }

  if (contract.status !== "blocked") {
    expectedResult.dimensions.forEach(d => {
      const found = contract.columns.find(c => c.inferredFromExpectedId === d.id && c.role === "dimension");
      if (!found) {
        errors.push(`Expected dimension missing from columns: ${d.id}`);
      }
    });

    expectedResult.measures.forEach(m => {
      const found = contract.columns.find(c => c.inferredFromExpectedId === m.id && c.role === "measure");
      if (!found) {
        errors.push(`Expected measure missing from columns: ${m.id}`);
      }
    });

    contract.columns.forEach(c => {
      if (c.role !== "dimension" && c.role !== "measure") {
         errors.push(`Column ${c.id} has invalid role: ${c.role}`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function summarizePreviewResultContract(contract: PreviewResultContract): string {
  if (contract.status === "blocked") {
    return "Preview result cannot be prepared because sandbox validation blocked execution.";
  }
  if (contract.status === "warning") {
    return "LightBI prepared the preview structure with sandbox warnings.";
  }
  return "LightBI prepared the expected preview result structure. No data has been executed yet.";
}
