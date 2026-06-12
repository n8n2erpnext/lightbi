import { TAXONOMY } from './business-signal-detector';

// Helper to normalize strings similar to what the detector does
function normalizeString(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

/**
 * Projects an array of raw row objects into an array of canonical row objects,
 * mapping raw column headers to their corresponding canonical semantic field names.
 *
 * @param rows The raw data rows (e.g. { "Tuyến xe": "A", "Mã tài kiện": "B" })
 * @param requiredCanonicalFields The fields required by the SQL query (e.g. ["route", "shipment"])
 * @returns A new array of projected row objects.
 */
export function projectToCanonicalRows(
  rows: Record<string, unknown>[],
  requiredCanonicalFields: string[]
): Record<string, unknown>[] {
  if (rows.length === 0) return [];
  if (requiredCanonicalFields.length === 0) return rows.map(r => ({ ...r }));

  // Inspect the first row to determine the schema mapping
  const rawHeaders = Object.keys(rows[0]);
  const mapping = new Map<string, string>(); // Canonical Field -> Raw Header

  // Build the mapping dictionary
  for (const requiredField of requiredCanonicalFields) {
    const taxonomyInfo = TAXONOMY[requiredField.toLowerCase()];
    // If the required field perfectly matches a raw header, use it directly.
    if (rawHeaders.includes(requiredField)) {
        mapping.set(requiredField, requiredField);
        continue;
    }

    if (!taxonomyInfo) {
      throw new Error(`CANONICAL_PROJECTION_MISSING: Field '${requiredField}' is required but not found in Taxonomy.`);
    }

    const aliases = taxonomyInfo.aliases;
    let mappedRawHeader: string | null = null;

    for (const rawHeader of rawHeaders) {
      const normalizedHeader = normalizeString(rawHeader);
      // If the raw header matches an alias for the required field
      if (aliases.includes(normalizedHeader)) {
        if (mappedRawHeader !== null) {
          throw new Error(`CANONICAL_PROJECTION_CONFLICT: Multiple raw headers ('${mappedRawHeader}', '${rawHeader}') map to canonical field '${requiredField}'.`);
        }
        mappedRawHeader = rawHeader;
      }
    }

    if (mappedRawHeader === null) {
      throw new Error(`CANONICAL_PROJECTION_MISSING: Could not map canonical field '${requiredField}' to any raw header.`);
    }

    mapping.set(requiredField, mappedRawHeader);
  }

  // Perform the projection mapping non-destructively
  return rows.map(rawRow => {
    const projectedRow: Record<string, unknown> = {};
    for (const requiredField of requiredCanonicalFields) {
      const rawHeader = mapping.get(requiredField)!;
      // Enforce Lowercase Bottleneck
      projectedRow[requiredField.toLowerCase()] = rawRow[rawHeader];
    }
    return projectedRow;
  });
}
