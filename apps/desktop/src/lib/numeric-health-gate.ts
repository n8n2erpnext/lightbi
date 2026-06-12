export interface NumericHealthResult {
  columnName: string;
  isSafeForSum: boolean;
  parseSuccessRate: number;
  needsCleansing: boolean;
}

export function evaluateNumericHealth(columnName: string, sampleValues: any[]): NumericHealthResult {
  if (!sampleValues || sampleValues.length === 0) {
    return { columnName, isSafeForSum: false, parseSuccessRate: 0, needsCleansing: false };
  }

  let successCount = 0;
  let validSampleCount = 0;
  let detectedCleansing = false;

  for (const rawVal of sampleValues) {
    // True nulls or undefined do not count against the parse rate for SUM 
    // because DuckDB safely ignores them in aggregations.
    if (rawVal === null || rawVal === undefined) {
      continue;
    }

    validSampleCount++;
    
    // If it's already a JS number, it's perfect.
    if (typeof rawVal === 'number' && !isNaN(rawVal)) {
      successCount++;
      continue;
    }

    let strVal = String(rawVal).trim();

    // Empty strings or spaces count as failure/garbage
    if (strVal === "") {
      continue;
    }

    let cleansed = strVal;
    
    // 1. Strip currency symbols for evaluation
    let numStr = cleansed.replace(/[đ$€£]/g, '').replace(/VNĐ/ig, '').trim();

    // 2. Hard-block Decimal Ambiguity and Mixed Separators
    const hasDot = numStr.includes('.');
    const hasComma = numStr.includes(',');

    if (hasDot && hasComma) {
      continue; // Block: Mixed separators are too ambiguous to safely strip
    }

    if (hasDot) {
      const parts = numStr.split('.');
      // If any part after the first is not exactly 3 digits, it's acting as a decimal or is malformed.
      // Since our SQL pipeline blindly strips '.', this would destroy the decimal place and inflate the number.
      if (!parts.slice(1).every(p => /^\d{3}$/.test(p))) {
        continue;
      }
    }

    if (hasComma) {
      const parts = numStr.split(',');
      if (!parts.slice(1).every(p => /^\d{3}$/.test(p))) {
        continue;
      }
    }

    // 3. Mark for cleansing if safe separators or currency are present
    if (/[đ$€£]|VNĐ/i.test(cleansed) || hasDot || hasComma) {
      detectedCleansing = true;
    }

    // 4. Cleanse string to test if it's fundamentally a number
    cleansed = numStr.replace(/[,.]/g, '');

    // 5. Test if it's a valid integer format
    // Matches integers (e.g., 1000, -50). Decimals are blocked above.
    const numericRegex = /^-?\d+$/;
    if (numericRegex.test(cleansed)) {
      successCount++;
    }
  }

  const parseSuccessRate = validSampleCount > 0 ? successCount / validSampleCount : 0;
  const isSafeForSum = parseSuccessRate >= 0.95;

  return {
    columnName,
    isSafeForSum,
    parseSuccessRate,
    needsCleansing: detectedCleansing
  };
}
