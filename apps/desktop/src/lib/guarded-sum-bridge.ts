import type { RuntimePlanPreview, LogicalRuntimeOperation } from './runtime-planner-preview';
import { evaluateNumericHealth } from './numeric-health-gate';

/**
 * Iterates over the raw rows to extract sample values for a specific canonical field.
 * This is a lightweight extraction assuming the raw keys might match the canonical keys,
 * or at least we find the matching key from the first row if there's casing differences.
 */
function extractSampleValues(measure: string, rawRows: any[]): any[] {
  if (rawRows.length === 0) return [];
  const firstRow = rawRows[0];
  const exactKey = Object.keys(firstRow).find(k => k.toLowerCase() === measure.toLowerCase());
  if (!exactKey) return [];

  const samples = [];
  if (rawRows.length <= 2000) {
    for (let i = 0; i < rawRows.length; i++) {
      samples.push(rawRows[i][exactKey]);
    }
  } else {
    // Head 1000
    for (let i = 0; i < 1000; i++) {
      samples.push(rawRows[i][exactKey]);
    }
    // Tail 1000
    for (let i = rawRows.length - 1000; i < rawRows.length; i++) {
      samples.push(rawRows[i][exactKey]);
    }
  }
  return samples;
}

/**
 * Enhances a RuntimePlanPreview with guarded SUM aggregations.
 * Evaluates each measure in group_by and trend operations against the Numeric Health Gate.
 * If the measure passes the 80% trust threshold, it is marked for SUM.
 * Otherwise, it defaults to COUNT.
 */
export function enhancePlanWithGuardedSum(plan: RuntimePlanPreview, rawRows: any[]): RuntimePlanPreview {
  // If no rows, we can't evaluate health, so we can't promote anything to SUM.
  if (!rawRows || rawRows.length === 0) {
    return plan;
  }

  const newWarnings = [...plan.warnings];

  const enhancedOperations: LogicalRuntimeOperation[] = plan.logicalOperations.map(op => {
    if (op.type === 'group_by' || op.type === 'trend') {
      const measureAggregations: Record<string, "SUM" | "COUNT" | "AVG"> = {};
      
      for (const measure of op.measures) {
        const explicitAggregation = op.measureAggregations?.[measure];
        if (explicitAggregation === "SUM" || explicitAggregation === "AVG") {
          measureAggregations[measure] = explicitAggregation;
          continue;
        }
        if (explicitAggregation === "COUNT") {
          measureAggregations[measure] = "COUNT";
          continue;
        }

        const samples = extractSampleValues(measure, rawRows);
        const health = evaluateNumericHealth(measure, samples, rawRows.length);
        
        if (health.isSafeForSum) {
          measureAggregations[measure] = "SUM";
          if (health.needsCleansing || health.parseSuccessRate < 1.0) {
            newWarnings.push(`Measure '${measure}' underwent silent cleansing (drop rate: ${(health.estimatedDropRate * 100).toFixed(1)}% or stripped chars) to enable SUM.`);
          }
          if (health.warningMessage) {
            newWarnings.push(`Measure '${measure}': ${health.warningMessage}`);
          }
        } else {
          measureAggregations[measure] = "COUNT";
        }
      }

      return {
        ...op,
        measureAggregations
      };
    }
    return op;
  });

  return {
    ...plan,
    logicalOperations: enhancedOperations,
    warnings: newWarnings
  };
}
