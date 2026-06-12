import type { RuntimePlanPreview } from './runtime-planner-preview';

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

function quoteLowercaseIdent(ident: string): string {
  // Safe DuckDB quoting, forcing lowercase to match canonical projection bottleneck
  return `"${ident.toLowerCase().replace(/"/g, '""')}"`;
}

function quoteExactIdent(ident: string): string {
  // Safe DuckDB quoting preserving exact case for SELECT AS aliases
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
        
        const gbDimsLower = op.dimensions.map(quoteLowercaseIdent);
        const gbDimsAlias = op.dimensions.map(d => `${quoteLowercaseIdent(d)} AS ${quoteExactIdent(d)}`);
        
        const gbMeasures = op.measures.map(m => {
          const lowerM = quoteLowercaseIdent(m);
          const exactM = quoteExactIdent(m);
          if (op.measureAggregations && op.measureAggregations[m] === "SUM") {
            // Align perfectly with numeric-health-gate.ts (stripping , . đ VNĐ $ and spaces)
            const cleansed = `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${lowerM}, ',', ''), '.', ''), 'đ', ''), 'VNĐ', ''), '$', ''), ' ', '')`;
            return `SUM(TRY_CAST(${cleansed} AS DOUBLE)) AS ${exactM}, SUM(CASE WHEN ${lowerM} IS NOT NULL AND TRY_CAST(${cleansed} AS DOUBLE) IS NULL THEN 1 ELSE 0 END) AS "__malformed_${m}"`;
          }
          return `CAST(COUNT(${lowerM}) AS INTEGER) AS ${exactM}`;
        });
        
        selectClause = [...gbDimsAlias, ...gbMeasures].join(', ');
        if (!selectClause) {
          preview.status = "blocked";
          preview.blockedReasons.push("Missing dimensions or measures for group_by operation.");
          return preview;
        }
        
        if (gbDimsLower.length > 0) {
          whereClause = `\nWHERE ` + gbDimsLower.map(d => `${d} IS NOT NULL`).join(' AND ');
          groupByClause = `\nGROUP BY ${gbDimsLower.join(', ')}`;
        }
        break;
      case "trend":
        if (hasMainOp) break;
        hasMainOp = true;
        
        if (!op.timeDimension) {
          preview.status = "blocked";
          preview.blockedReasons.push("Missing time dimension for trend operation.");
          return preview;
        }
        
        const tDimLower = quoteLowercaseIdent(op.timeDimension);
        const tDimExact = quoteExactIdent(op.timeDimension);
        const tDimExpr = `CAST(${tDimLower} AS TIMESTAMP)`;
        const tMeasures = op.measures.map(m => {
          const lowerM = quoteLowercaseIdent(m);
          const exactM = quoteExactIdent(m);
          if (op.measureAggregations && op.measureAggregations[m] === "SUM") {
            // Align perfectly with numeric-health-gate.ts (stripping , . đ VNĐ $ and spaces)
            const cleansed = `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${lowerM}, ',', ''), '.', ''), 'đ', ''), 'VNĐ', ''), '$', ''), ' ', '')`;
            return `SUM(TRY_CAST(${cleansed} AS DOUBLE)) AS ${exactM}, SUM(CASE WHEN ${lowerM} IS NOT NULL AND TRY_CAST(${cleansed} AS DOUBLE) IS NULL THEN 1 ELSE 0 END) AS "__malformed_${m}"`;
          }
          return `CAST(COUNT(${lowerM}) AS INTEGER) AS ${exactM}`;
        });
        
        // Safe DuckDB dialect for trend: explicitly filter out NULL dates
        selectClause = [`${tDimExpr} AS ${tDimExact}`, ...tMeasures].join(', ');
        whereClause = `\nWHERE ${tDimLower} IS NOT NULL`;
        groupByClause = `\nGROUP BY ${tDimExpr}`;
        orderByClause = `\nORDER BY ${tDimExpr}`;
        break;
      case "distribution":
        if (hasMainOp) break;
        hasMainOp = true;
        
        const dDimLower = quoteLowercaseIdent(op.dimension);
        const dDimExact = quoteExactIdent(op.dimension);
        selectClause = `${dDimLower} AS ${dDimExact}, CAST(COUNT(*) AS INTEGER) AS "row_count"`;
        whereClause = `\nWHERE ${dDimLower} IS NOT NULL`;
        groupByClause = `\nGROUP BY ${dDimLower}`;
        break;
      case "relationship":
        if (hasMainOp) break;
        hasMainOp = true;
        
        const rMeasuresLower = op.measures.map(quoteLowercaseIdent);
        const rMeasuresAlias = op.measures.map(m => `${quoteLowercaseIdent(m)} AS ${quoteExactIdent(m)}`);
        selectClause = rMeasuresAlias.join(', ');
        if (!selectClause) {
          preview.status = "blocked";
          preview.blockedReasons.push("Missing measures for relationship operation.");
          return preview;
        }
        whereClause = `\nWHERE ` + rMeasuresLower.map(m => `${m} IS NOT NULL`).join('\n  AND ');
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
