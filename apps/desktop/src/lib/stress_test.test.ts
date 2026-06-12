import { evaluateNumericHealth } from '../lib/numeric-health-gate';
import { enhancePlanWithGuardedSum } from '../lib/guarded-sum-bridge';

const basePlan = {
  id: 'p1',
  sourceIntentId: 'i1',
  status: 'ready' as any,
  executionMode: 'preview_only' as any,
  logicalOperations: [{ type: 'group_by', dimensions: ['dim'], measures: ['val'] }] as any,
  requiredColumns: [],
  expectedOutput: { shape: 'bar_chart', dimensions: [], measures: [] } as any,
  warnings: [],
  blockedReasons: [],
  source: 'runtime_intent' as any
};

const cases = {
  "Clean Int": ["1000", "2000", "3000"],
  "Clean Decimal": ["1000.50", "2000.75", "3000.00"],
  "EU Format (Comma as decimal)": ["1.000,50", "2.000,75"],
  "US Format (Comma as thousands)": ["1,000.50", "2,000.75"],
  "VND Currency": ["1.000.000đ", "2.000.000 VNĐ"],
  "USD Currency": ["$1,000", "$2,000"],
  "Garbage Mixed": ["N/A", "abc", "", "   "],
  "Late Row Anomaly": [
    ...Array(500).fill("100"), // First 500 are clean
    "N/A", "Invalid", "Dirty_String" // Late rows are dirty
  ]
};

// DuckDB SQL Simulation
function simulateDuckDBSum(values: any[], measureAgg: string) {
  if (measureAgg !== 'SUM') return { sum: null, note: "Downgraded to COUNT" };
  
  let total = 0;
  let nullCount = 0;
  for (const v of values) {
    if (v === null || v === undefined) {
      nullCount++;
      continue;
    }
    // Simulate EXACT DuckDB SQL behavior generated in safe-sql-preview.ts
    // REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(lowerM, ',', ''), '.', ''), 'đ', ''), 'VNĐ', ''), '$', ''), ' ', '')
    let cleansed = String(v).replace(/,/g, '').replace(/\./g, '').replace(/đ/gi, '').replace(/VNĐ/gi, '').replace(/\$/g, '').replace(/ /g, '');
    let parsed = Number(cleansed);
    if (isNaN(parsed)) {
      nullCount++;
    } else {
      total += parsed;
    }
  }
  return { sum: total, dropped: nullCount };
}

import { describe, it } from 'vitest';

describe('Guarded SUM Stress Test', () => {
  it('runs the stress test scenarios', () => {
    console.log("--- GUARDED SUM STRESS TEST PHASE 1 ---");

    for (const [name, rowsData] of Object.entries(cases)) {
      const rawRows = rowsData.map(val => ({ val }));
      
      // 1. Health Gate (Only samples first 500 rows like real implementation)
      const samples = rawRows.slice(0, 500).map(r => r.val);
      const health = evaluateNumericHealth('val', samples);
      
      // 2. Enhance Plan
      const plan = JSON.parse(JSON.stringify(basePlan));
      const enhanced = enhancePlanWithGuardedSum(plan, rawRows);
      const gbOp = enhanced.logicalOperations[0];
      const agg = gbOp.measureAggregations['val'];
      const warnings = enhanced.warnings;

      // 3. SQL Simulation
      const sqlResult = simulateDuckDBSum(rowsData, agg);

      console.log(`\n[CASE] ${name}`);
      console.log(`- Gate: isSafeForSum=${health.isSafeForSum}, needsCleansing=${health.needsCleansing}, parseRate=${health.parseSuccessRate.toFixed(2)}`);
      console.log(`- Path: ${agg}`);
      console.log(`- Warnings: ${warnings.length > 0 ? warnings[0] : 'None'}`);
      console.log(`- Actual SQL SUM: ${sqlResult.sum !== null ? sqlResult.sum : 'N/A'} (dropped ${sqlResult.dropped} rows)`);
      
      if (name.includes("EU Format") && agg === 'SUM' && sqlResult.sum !== null && sqlResult.sum > 100000) {
         console.log(`  => 🚨 FALSE TRUST: Value multiplied by 100 due to decimal destruction! expected ~3000, got ${sqlResult.sum}`);
      }
      if (name.includes("US Format") && agg === 'SUM' && sqlResult.sum !== null && sqlResult.sum > 100000) {
         console.log(`  => 🚨 FALSE TRUST: Value multiplied by 100 due to decimal destruction! expected ~3000, got ${sqlResult.sum}`);
      }
      if (name === "Late Row Anomaly" && agg === 'SUM' && sqlResult.dropped > 0) {
         console.log(`  => 🚨 SILENT DROP: Tail rows silently evaluated to NULL in DuckDB, missed by JS Sample (only saw 500 rows). Warning present: ${warnings.length > 0 ? 'YES' : 'NO'}`);
      }
    }
  });
});
