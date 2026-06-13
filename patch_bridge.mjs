import fs from 'fs';

const filePath = '/home/ubuntu/n8n2erpnext/LightBI/apps/desktop/src/lib/guarded-sum-bridge.ts';
let content = fs.readFileSync(filePath, 'utf8');

const oldExtract = `function extractSampleValues(measure: string, rawRows: any[]): any[] {
  if (rawRows.length === 0) return [];
  
  // Find the actual key in the raw row that matches the measure (case-insensitive)
  const firstRow = rawRows[0];
  const exactKey = Object.keys(firstRow).find(k => k.toLowerCase() === measure.toLowerCase());
  
  if (!exactKey) {
    // If not found, just return empty to fail the gate safely
    return [];
  }

  // Sample up to 500 rows for performance
  const limit = Math.min(rawRows.length, 500);
  const samples = [];
  for (let i = 0; i < limit; i++) {
    samples.push(rawRows[i][exactKey]);
  }
  
  return samples;
}`;

const newExtract = `function extractSampleValues(measure: string, rawRows: any[]): any[] {
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
}`;

content = content.replace(oldExtract, newExtract);

const oldLogic = `      for (const measure of op.measures) {
        const samples = extractSampleValues(measure, rawRows);
        const health = evaluateNumericHealth(measure, samples);
        
        if (health.isSafeForSum) {
          measureAggregations[measure] = "SUM";
          if (health.needsCleansing || health.parseSuccessRate < 1.0) {
            const dropRate = ((1 - health.parseSuccessRate) * 100).toFixed(1);
            newWarnings.push(\`Measure '\${measure}' underwent silent cleansing (drop rate: \${dropRate}% or stripped chars) to enable SUM.\`);
          }
        } else {
          measureAggregations[measure] = "COUNT";
        }
      }`;

const newLogic = `      for (const measure of op.measures) {
        const samples = extractSampleValues(measure, rawRows);
        const health = evaluateNumericHealth(measure, samples, rawRows.length);
        
        if (health.isSafeForSum) {
          measureAggregations[measure] = "SUM";
          if (health.needsCleansing || health.parseSuccessRate < 1.0) {
            newWarnings.push(\`Measure '\${measure}' underwent silent cleansing (drop rate: \${(health.estimatedDropRate * 100).toFixed(1)}% or stripped chars) to enable SUM.\`);
          }
          if (health.warningMessage) {
            newWarnings.push(\`Measure '\${measure}': \${health.warningMessage}\`);
          }
        } else {
          measureAggregations[measure] = "COUNT";
        }
      }`;

content = content.replace(oldLogic, newLogic);

fs.writeFileSync(filePath, content);
console.log("guarded-sum-bridge.ts patched!");
