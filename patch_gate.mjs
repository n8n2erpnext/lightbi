import fs from 'fs';

const filePath = '/home/ubuntu/n8n2erpnext/LightBI/apps/desktop/src/lib/numeric-health-gate.ts';
let content = fs.readFileSync(filePath, 'utf8');

const oldInterface = `export interface NumericHealthResult {
  columnName: string;
  isSafeForSum: boolean;
  parseSuccessRate: number;
  needsCleansing: boolean;
}`;

const newInterface = `export interface NumericHealthResult {
  columnName: string;
  isSafeForSum: boolean;
  parseSuccessRate: number;
  needsCleansing: boolean;
  // Phase B fields
  scannedRows: number;
  totalRows: number;
  scanCoverage: number;
  estimatedDropRate: number;
  warningMessage?: string;
}`;

content = content.replace(oldInterface, newInterface);

const oldSignature = `export function evaluateNumericHealth(columnName: string, sampleValues: any[]): NumericHealthResult {
  if (!sampleValues || sampleValues.length === 0) {
    return { columnName, isSafeForSum: false, parseSuccessRate: 0, needsCleansing: false };
  }`;

const newSignature = `export function evaluateNumericHealth(columnName: string, sampleValues: any[], totalRows?: number): NumericHealthResult {
  if (!sampleValues || sampleValues.length === 0) {
    return { 
      columnName, 
      isSafeForSum: false, 
      parseSuccessRate: 0, 
      needsCleansing: false,
      scannedRows: 0,
      totalRows: totalRows || 0,
      scanCoverage: 0,
      estimatedDropRate: 0
    };
  }`;

content = content.replace(oldSignature, newSignature);

const oldReturn = `  const parseSuccessRate = validSampleCount > 0 ? successCount / validSampleCount : 0;
  const isSafeForSum = parseSuccessRate >= 0.95;

  return {
    columnName,
    isSafeForSum,
    parseSuccessRate,
    needsCleansing: detectedCleansing
  };
}`;

const newReturn = `  const parseSuccessRate = validSampleCount > 0 ? successCount / validSampleCount : 0;
  const isSafeForSum = parseSuccessRate >= 0.80;
  const scannedRows = sampleValues.length;
  const actualTotalRows = totalRows || scannedRows;
  const scanCoverage = scannedRows > 0 ? scannedRows / actualTotalRows : 0;
  const estimatedDropRate = validSampleCount > 0 ? (validSampleCount - successCount) / validSampleCount : 0;
  
  let warningMessage: string | undefined = undefined;
  if (estimatedDropRate > 0.05) {
    warningMessage = \`High drop rate (\${(estimatedDropRate * 100).toFixed(1)}%). SUM may exclude dirty rows.\`;
  }

  return {
    columnName,
    isSafeForSum,
    parseSuccessRate,
    needsCleansing: detectedCleansing,
    scannedRows,
    totalRows: actualTotalRows,
    scanCoverage,
    estimatedDropRate,
    warningMessage
  };
}`;

content = content.replace(oldReturn, newReturn);

fs.writeFileSync(filePath, content);
console.log("numeric-health-gate.ts patched!");
