export type DataType = "string" | "number" | "date" | "boolean" | "unknown";

export interface ColumnProfile {
  name: string;
  dataType: DataType;
  distinctCount: number;
  nullPercent: number;
  topValues: string[];
  isIdentifier: boolean;
  isCategorical: boolean;
}

/**
 * Profiles an array of data rows to extract schema and cardinality metadata.
 * @param columns Array of column names to profile
 * @param dataRows Array of objects representing the data sample
 * @param totalRows The total number of rows in the dataset
 */
export function profileColumns(
  columns: string[],
  dataRows: Record<string, any>[],
  totalRows: number
): Record<string, ColumnProfile> {
  const profiles: Record<string, ColumnProfile> = {};

  if (columns.length === 0 || dataRows.length === 0) {
    return profiles;
  }

  // Sample up to 1000 rows for performance
  const sample = dataRows.slice(0, 1000);
  const sampleSize = sample.length;

  columns.forEach(col => {
    let nullCount = 0;
    let numberCount = 0;
    let dateCount = 0;
    let booleanCount = 0;
    let stringCount = 0;
    
    const valueCounts = new Map<string, number>();

    for (const row of sample) {
      const val = row[col];
      
      // Null Check
      if (val === null || val === undefined || val === "") {
        nullCount++;
        continue;
      }

      // Type Check
      const type = typeof val;
      if (type === "number") {
        numberCount++;
      } else if (type === "boolean") {
        booleanCount++;
      } else if (type === "string") {
        // Quick date check
        if (!isNaN(Date.parse(val)) && val.length >= 8 && /\d/.test(val)) {
          dateCount++;
        } else if (!isNaN(Number(val)) && val.trim() !== "") {
          // It's a numeric string
          numberCount++;
        } else {
          stringCount++;
        }
      }

      // Value counting for distinct / top values
      const strVal = String(val).trim();
      valueCounts.set(strVal, (valueCounts.get(strVal) || 0) + 1);
    }

    const nonNullCount = sampleSize - nullCount;
    let inferredType: DataType = "unknown";

    if (nonNullCount > 0) {
      if (numberCount > nonNullCount * 0.8) {
        inferredType = "number";
      } else if (dateCount > nonNullCount * 0.8) {
        inferredType = "date";
      } else if (booleanCount > nonNullCount * 0.8) {
        inferredType = "boolean";
      } else {
        inferredType = "string";
      }
    }

    // Top Values
    const sortedValues = Array.from(valueCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);

    const distinctCount = sortedValues.length;

    // Extrapolate distinct count if sample size is smaller than total
    // A simple linear extrapolation for high cardinality, though typically
    // identifiers will have distinctCount == sampleSize in the sample.
    let estimatedTotalDistinct = distinctCount;
    if (sampleSize < totalRows && distinctCount === sampleSize && sampleSize > 10) {
        estimatedTotalDistinct = totalRows; 
    }

    const isIdentifier = (estimatedTotalDistinct >= totalRows * 0.95) && totalRows > 1;
    const isCategorical = inferredType === "string" && distinctCount < 50 && !isIdentifier;

    profiles[col] = {
      name: col,
      dataType: inferredType,
      distinctCount: estimatedTotalDistinct,
      nullPercent: sampleSize > 0 ? (nullCount / sampleSize) * 100 : 0,
      topValues: sortedValues.slice(0, 5),
      isIdentifier,
      isCategorical
    };
  });

  return profiles;
}
