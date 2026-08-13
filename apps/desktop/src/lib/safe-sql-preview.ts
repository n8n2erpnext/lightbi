import type { RuntimePlanPreview } from './runtime-planner-preview';
import { isPeriodLikeDimension } from './time-dimension';

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

function quoteSqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function duckdbTimestampExpr(quotedIdent: string): string {
  const numericValue = `TRY_CAST(CAST(${quotedIdent} AS VARCHAR) AS DOUBLE)`;
  return `CASE WHEN ${numericValue} BETWEEN 20000 AND 80000 THEN CAST(DATE '1899-12-30' + CAST(FLOOR(${numericValue}) AS INTEGER) AS TIMESTAMP) ELSE TRY_CAST(CAST(${quotedIdent} AS VARCHAR) AS TIMESTAMP) END`;
}

function normalizedNumericTextExpr(quotedIdent: string): string {
  return `REPLACE(REPLACE(REPLACE(REPLACE(TRIM(CAST(${quotedIdent} AS VARCHAR)), 'đ', ''), 'VNĐ', ''), '$', ''), ' ', '')`;
}

function numericCastExpr(quotedIdent: string): string {
  const normalized = normalizedNumericTextExpr(quotedIdent);
  const commaThousands = `REPLACE(${normalized}, ',', '')`;
  const vietnameseDecimal = `REPLACE(REPLACE(${normalized}, '.', ''), ',', '.')`;
  return `COALESCE(TRY_CAST(${normalized} AS DOUBLE), TRY_CAST(${commaThousands} AS DOUBLE), TRY_CAST(${vietnameseDecimal} AS DOUBLE))`;
}

function periodLabelExpr(quotedIdent: string): string {
  return `TRIM(CAST(${quotedIdent} AS VARCHAR))`;
}

function periodOrderExpr(valueExpr: string): string {
  const normalized = `LOWER(${valueExpr})`;
  return `CASE ${normalized} WHEN 'jan' THEN 1 WHEN 'january' THEN 1 WHEN 'feb' THEN 2 WHEN 'february' THEN 2 WHEN 'mar' THEN 3 WHEN 'march' THEN 3 WHEN 'apr' THEN 4 WHEN 'april' THEN 4 WHEN 'may' THEN 5 WHEN 'jun' THEN 6 WHEN 'june' THEN 6 WHEN 'jul' THEN 7 WHEN 'july' THEN 7 WHEN 'aug' THEN 8 WHEN 'august' THEN 8 WHEN 'sep' THEN 9 WHEN 'sept' THEN 9 WHEN 'september' THEN 9 WHEN 'oct' THEN 10 WHEN 'october' THEN 10 WHEN 'nov' THEN 11 WHEN 'november' THEN 11 WHEN 'dec' THEN 12 WHEN 'december' THEN 12 ELSE COALESCE(TRY_CAST(${valueExpr} AS INTEGER), 9999) END`;
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
      case "table_preview":
        if (hasMainOp) break;
        hasMainOp = true;
        preview.sql = `SELECT * FROM __LIGHTBI_PREVIEW_TABLE__ LIMIT 100;`;
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
            const numericValue = numericCastExpr(lowerM);
            const malformedAlias = quoteExactIdent('__malformed_' + m);
            return `SUM(${numericValue}) AS ${exactM}, SUM(CASE WHEN ${lowerM} IS NOT NULL AND ${numericValue} IS NULL THEN 1 ELSE 0 END) AS ${malformedAlias}`;
          }
          if (op.measureAggregations && op.measureAggregations[m] === "AVG") {
            const numericValue = numericCastExpr(lowerM);
            const malformedAlias = quoteExactIdent('__malformed_' + m);
            return `AVG(${numericValue}) AS ${exactM}, SUM(CASE WHEN ${lowerM} IS NOT NULL AND ${numericValue} IS NULL THEN 1 ELSE 0 END) AS ${malformedAlias}`;
          }
          if (m === "record_count" || m === "row_count") {
            return `CAST(COUNT(*) AS INTEGER) AS ${exactM}`;
          }
          return `CAST(COUNT(${lowerM}) AS INTEGER) AS ${exactM}`;
        });
        const gbDerivedMeasures = (op.derivedMeasures ?? []).flatMap(measure => {
          if (measure.type !== "positive_rate") return [];
          const source = quoteLowercaseIdent(measure.sourceColumn);
          const normalizedSource = `LOWER(TRIM(CAST(${source} AS VARCHAR)))`;
          const positives = measure.positiveValues.map(value => quoteSqlLiteral(value.toLowerCase())).join(', ');
          const positiveExpr = `SUM(CASE WHEN ${normalizedSource} IN (${positives}) THEN 1 ELSE 0 END)`;
          const totalExpr = `COUNT(*)`;
          return [
            `CAST(${positiveExpr} AS INTEGER) AS ${quoteExactIdent(measure.numeratorLabel)}`,
            `CAST(${totalExpr} AS INTEGER) AS ${quoteExactIdent(measure.denominatorLabel)}`,
            `ROUND(CAST(${positiveExpr} AS DOUBLE) / NULLIF(${totalExpr}, 0), 4) AS ${quoteExactIdent(measure.label)}`
          ];
        });
        
        selectClause = [...gbDimsAlias, ...gbMeasures, ...gbDerivedMeasures].join(', ');
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
        const isPeriodDimension = isPeriodLikeDimension(op.timeDimension);
        const tDimValueExpr = isPeriodDimension ? periodLabelExpr(tDimLower) : duckdbTimestampExpr(tDimLower);
        const tDimBucketExpr = isPeriodDimension ? tDimValueExpr : `STRFTIME(CAST(${tDimValueExpr} AS DATE), '%Y-%m-%d')`;
        const tDimOrderExpr = isPeriodDimension ? periodOrderExpr(tDimValueExpr) : tDimBucketExpr;
        const tMeasures = op.measures.map(m => {
          const lowerM = quoteLowercaseIdent(m);
          const exactM = quoteExactIdent(m);
          if (op.measureAggregations && op.measureAggregations[m] === "SUM") {
            // Align perfectly with numeric-health-gate.ts (stripping , . đ VNĐ $ and spaces)
            const numericValue = numericCastExpr(lowerM);
            const malformedAlias = quoteExactIdent('__malformed_' + m);
            return `SUM(${numericValue}) AS ${exactM}, SUM(CASE WHEN ${lowerM} IS NOT NULL AND ${numericValue} IS NULL THEN 1 ELSE 0 END) AS ${malformedAlias}`;
          }
          if (op.measureAggregations && op.measureAggregations[m] === "AVG") {
            const numericValue = numericCastExpr(lowerM);
            const malformedAlias = quoteExactIdent('__malformed_' + m);
            return `AVG(${numericValue}) AS ${exactM}, SUM(CASE WHEN ${lowerM} IS NOT NULL AND ${numericValue} IS NULL THEN 1 ELSE 0 END) AS ${malformedAlias}`;
          }
          if (m === "record_count" || m === "row_count") {
            return `CAST(COUNT(*) AS INTEGER) AS ${exactM}`;
          }
          return `CAST(COUNT(${lowerM}) AS INTEGER) AS ${exactM}`;
        });
        
        // Safe DuckDB dialect for trend: explicitly filter out NULL dates
        selectClause = [`${tDimBucketExpr} AS ${tDimExact}`, ...tMeasures].join(', ');
        whereClause = isPeriodDimension
          ? `\nWHERE ${tDimLower} IS NOT NULL AND ${tDimValueExpr} <> ''`
          : `\nWHERE ${tDimLower} IS NOT NULL AND ${tDimValueExpr} IS NOT NULL`;
        groupByClause = `\nGROUP BY ${tDimBucketExpr}`;
        orderByClause = `\nORDER BY ${tDimOrderExpr}, ${tDimBucketExpr}`;
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
