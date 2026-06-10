import type { RuntimePlanPreview, LogicalRuntimeOperation } from './runtime-planner-preview';

export interface SafeSqlPreview {
  id: string;
  sourcePlanId: string;
  status: "ready" | "blocked";
  dialect: "duckdb";
  sql: string | null;
  parameters: Record<string, unknown>;
  referencedColumns: string[];
  warnings: string[];
  blockedReasons: string[];
  source: "runtime_plan_preview";
}

function quoteIdent(ident: string): string {
  // Safe DuckDB quoting
  return `"${ident.replace(/"/g, '""')}"`;
}

export function createSafeSqlPreview(plan: RuntimePlanPreview): SafeSqlPreview {
  const preview: SafeSqlPreview = {
    id: `sql_${plan.id}`,
    sourcePlanId: plan.id,
    status: plan.status,
    dialect: "duckdb",
    sql: null,
    parameters: {},
    referencedColumns: [...plan.requiredColumns],
    warnings: [...plan.warnings],
    blockedReasons: [...plan.blockedReasons],
    source: "runtime_plan_preview"
  };

  if (plan.status === "blocked") {
    return preview;
  }

  // Parse logical operations
  let selectClause = "";
  let whereClause = "";
  let groupByClause = "";
  let orderByClause = "";
  let limitClause = "";
  
  let hasMainOp = false;

  for (const op of plan.logicalOperations) {
    switch (op.type) {
      case "scan":
        // Handled implicitly by FROM __LIGHTBI_PREVIEW_TABLE__
        break;
      case "limit":
        limitClause = `\nLIMIT ${op.rows}`;
        break;
      case "group_by":
        if (hasMainOp) break;
        hasMainOp = true;
        
        const gbDims = op.dimensions.map(quoteIdent);
        const gbMeasures = op.measures.map(m => `COUNT(${quoteIdent(m)}) AS ${quoteIdent(m + '_count')}`);
        
        selectClause = [...gbDims, ...gbMeasures].join(', ');
        groupByClause = `\nGROUP BY ${gbDims.join(', ')}`;
        break;
      case "trend":
        if (hasMainOp) break;
        hasMainOp = true;
        
        const tDim = quoteIdent(op.timeDimension);
        const tMeasures = op.measures.map(m => `COUNT(${quoteIdent(m)}) AS ${quoteIdent(m + '_count')}`);
        
        selectClause = [tDim, ...tMeasures].join(', ');
        groupByClause = `\nGROUP BY ${tDim}`;
        orderByClause = `\nORDER BY ${tDim}`;
        break;
      case "distribution":
        if (hasMainOp) break;
        hasMainOp = true;
        
        const dDim = quoteIdent(op.dimension);
        selectClause = `${dDim}, COUNT(*) AS "row_count"`;
        groupByClause = `\nGROUP BY ${dDim}`;
        break;
      case "relationship":
        if (hasMainOp) break;
        hasMainOp = true;
        
        const rMeasures = op.measures.map(quoteIdent);
        selectClause = rMeasures.join(', ');
        whereClause = `\nWHERE ` + rMeasures.map(m => `${m} IS NOT NULL`).join('\n  AND ');
        break;
      default:
        preview.status = "blocked";
        preview.blockedReasons.push(`Unsupported operation type`);
        return preview;
    }
  }

  if (preview.status === "ready" && selectClause) {
    preview.sql = `SELECT ${selectClause}\nFROM __LIGHTBI_PREVIEW_TABLE__${whereClause}${groupByClause}${orderByClause}${limitClause};`;
  }

  return preview;
}
