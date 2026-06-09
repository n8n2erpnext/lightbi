import type { RuntimeBoundaryArtifact } from './runtime-boundary-contract';
import type { ExpectedResultContract } from './expected-result-contract';
import { validateExpectedResultContract } from './expected-result-contract';

export type CompiledQueryStatus = "ready" | "warning" | "blocked";

export type QuerySource = {
  datasetId: string;
};

export type QueryJoin = {
  relationshipId: string;
};

export type QueryAggregate = {
  field: string;
  operation: "count" | "sum" | "avg" | "min" | "max";
};

export type QuerySort = {
  field: string;
  direction: "asc" | "desc";
};

export type CompiledQueryContract = {
  id: string;
  status: CompiledQueryStatus;
  boundaryArtifactId: string;
  expectedResultContractId: string;
  sources: QuerySource[];
  joins: QueryJoin[];
  aggregates: QueryAggregate[];
  sorts: QuerySort[];
  warnings: string[];
  sql: string | null;
};

export type CompileSafeQueryInput = {
  artifact: RuntimeBoundaryArtifact;
  expectedResult: ExpectedResultContract;
};

export function compileSafeQuery(input: CompileSafeQueryInput): CompiledQueryContract {
  const { artifact, expectedResult } = input;
  
  let status: CompiledQueryStatus = "ready";
  const warnings: string[] = [];
  
  if (artifact.status === "handoff_blocked") {
    status = "blocked";
    warnings.push("Handoff artifact is blocked.");
  }

  const expectedValidation = validateExpectedResultContract(expectedResult);
  if (!expectedValidation.valid) {
    status = "blocked";
    warnings.push("Expected result contract is invalid.");
  }

  const sources: QuerySource[] = artifact.datasets.map(d => ({ datasetId: d }));
  const joins: QueryJoin[] = artifact.relationships.map(r => ({ relationshipId: r }));
  const aggregates: QueryAggregate[] = [];
  const sorts: QuerySort[] = [];
  
  // Use ExpectedResultContract as primary authority
  if (expectedResult.shape === "ranking") {
    // ranking -> aggregate and sort desc
    expectedResult.measures.forEach(m => {
      aggregates.push({ field: m.id, operation: "sum" });
      sorts.push({ field: m.id, direction: "desc" });
    });
  } else if (expectedResult.shape === "trend") {
    // trend -> aggregate and order by time
    expectedResult.measures.forEach(m => {
      aggregates.push({ field: m.id, operation: "sum" });
    });
    expectedResult.dimensions.forEach(d => {
       sorts.push({ field: d.id, direction: "asc" }); // time dimension ascending
    });
  } else if (expectedResult.shape === "summary") {
    expectedResult.measures.forEach(m => {
      aggregates.push({ field: m.id, operation: "sum" });
    });
  }

  // Cross-check with LogicalPlan intent
  const hasLogicalJoin = artifact.logicalPlan.operations.some(op => op.type === "join");
  if (joins.length > 0 && !hasLogicalJoin) {
    status = status === "blocked" ? "blocked" : "warning";
    warnings.push("Joins specified but logical plan has no join operation.");
  }

  // Generate placeholder SQL
  let sql: string | null = null;
  if (status !== "blocked") {
    const selectFields = [
      ...expectedResult.dimensions.map(d => d.id),
      ...aggregates.map(a => `${a.operation.toUpperCase()}(${a.field}) AS ${a.field}`)
    ].join(", ");

    const fromClauses = sources.map(s => `table_${s.datasetId.replace(/[^a-zA-Z0-9]/g, '_')}`).join(", ");
    let sqlStr = `SELECT ${selectFields}\nFROM ${fromClauses}`;

    if (joins.length > 0) {
      sqlStr += `\n/* JOIN Placeholder for ${joins.map(j => j.relationshipId).join(", ")} */`;
    }

    if (expectedResult.dimensions.length > 0) {
      const groupFields = expectedResult.dimensions.map((_, i) => i + 1).join(", ");
      sqlStr += `\nGROUP BY ${groupFields}`;
    }

    if (sorts.length > 0) {
      const orderFields = sorts.map(s => `${s.field} ${s.direction.toUpperCase()}`).join(", ");
      sqlStr += `\nORDER BY ${orderFields}`;
    }

    sqlStr += `\nLIMIT 100; /* Safe limit applied */`;
    sql = sqlStr;
  }

  const id = `compiled-query:${artifact.id}`;

  return {
    id,
    status,
    boundaryArtifactId: artifact.id,
    expectedResultContractId: expectedResult.id,
    sources,
    joins,
    aggregates,
    sorts,
    warnings,
    sql
  };
}

export type CompiledQueryValidationResult = {
  valid: boolean;
  warnings: string[];
};

export function validateCompiledQuery(contract: CompiledQueryContract): CompiledQueryValidationResult {
  const warnings: string[] = [];
  
  if (!contract.expectedResultContractId) {
    warnings.push("Expected result contract ID is missing.");
  }
  
  if (contract.sources.length === 0) {
    warnings.push("No sources exist.");
  }
  
  if (contract.sources.length > 1 && contract.joins.length === 0) {
    warnings.push("Multi-dataset query requires joins.");
  }
  
  if (contract.status === "blocked") {
    warnings.push("Query is blocked.");
  }
  
  return {
    valid: warnings.length === 0 && contract.status !== "blocked",
    warnings
  };
}

export function summarizeCompiledQuery(contract: CompiledQueryContract): string {
  if (contract.status === "blocked") {
    return "This query cannot be compiled because it is blocked.";
  }
  if (contract.status === "warning") {
    return "LightBI prepared a query contract with warnings. No query has been executed.";
  }
  return "LightBI prepared a safe query contract. No query has been executed.";
}
