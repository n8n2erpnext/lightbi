import {
  REPRESENTATIVE_EVIDENCE_SCHEMA_VERSION,
  type ColumnPhysicalProfileV1,
  type EvidenceRegion,
  type PhysicalSourceIdentityV1,
  type RepresentativeEvidenceRowV1,
  type RepresentativeEvidenceV1,
  type StructuralIssueV1
} from "./profiling-contracts";

export type PhysicalDataRow = {
  dataRowIndex: number;
  sourceRowIndex: number;
  rawValues: readonly unknown[];
};

type Selection = {
  regions: Set<EvidenceRegion>;
  reasons: Set<string>;
};

function isNullish(value: unknown): boolean {
  return value == null || (typeof value === "string" && value.trim() === "");
}

function rawKind(value: unknown): string {
  if (isNullish(value)) return "null";
  if (value instanceof Date) return "date";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "string";
}

function stableSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pseudoRandom(seed: number): () => number {
  let state = seed || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

function addSelection(
  selections: Map<number, Selection>,
  dataRowIndex: number,
  region: EvidenceRegion,
  reason: string
): void {
  const selection = selections.get(dataRowIndex) ?? { regions: new Set(), reasons: new Set() };
  selection.regions.add(region);
  selection.reasons.add(reason);
  selections.set(dataRowIndex, selection);
}

function addRange(
  selections: Map<number, Selection>,
  indexes: number[],
  region: EvidenceRegion
): void {
  for (const index of indexes) addSelection(selections, index, region, `${region}_coverage`);
}

function indexesAround(center: number, length: number, radius = 2): number[] {
  const indexes: number[] = [];
  for (let index = Math.max(0, center - radius); index <= Math.min(length - 1, center + radius); index += 1) {
    indexes.push(index);
  }
  return indexes;
}

function rowValues(columnNames: string[], rawValues: readonly unknown[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  columnNames.forEach((name, index) => {
    const key = values[name] === undefined ? name : `${name}__column_${index + 1}`;
    values[key] = rawValues[index] ?? null;
  });
  return values;
}

function addProfileFailures(
  selections: Map<number, Selection>,
  profiles: ColumnPhysicalProfileV1[],
  sourceIndexToDataIndex: Map<number, number>,
  supplementCounts: Record<string, number>
): void {
  for (const profile of profiles) {
    for (const parse of profile.parseEvidence) {
      for (const failure of parse.representativeFailures) {
        const dataRowIndex = sourceIndexToDataIndex.get(failure.sourceRowIndex);
        if (dataRowIndex == null) continue;
        addSelection(selections, dataRowIndex, "supplemental", `parse_failure:${profile.physicalColumnName}:${parse.parser}`);
        supplementCounts.parse_failure = (supplementCounts.parse_failure ?? 0) + 1;
      }
    }
  }
}

function addIssueRows(
  selections: Map<number, Selection>,
  issues: StructuralIssueV1[],
  sourceIndexToDataIndex: Map<number, number>,
  supplementCounts: Record<string, number>
): void {
  for (const issue of issues) {
    for (const sourceRowIndex of issue.sourceRowIndices.slice(0, 3)) {
      const dataRowIndex = sourceIndexToDataIndex.get(sourceRowIndex);
      if (dataRowIndex == null) continue;
      addSelection(selections, dataRowIndex, "supplemental", `issue:${issue.code}`);
      supplementCounts[issue.code] = (supplementCounts[issue.code] ?? 0) + 1;
    }
  }
}

function addValueSupplements(
  selections: Map<number, Selection>,
  rows: PhysicalDataRow[],
  columnNames: string[],
  supplementCounts: Record<string, number>
): void {
  for (let columnIndex = 0; columnIndex < columnNames.length; columnIndex += 1) {
    const values = rows.map(row => row.rawValues[columnIndex]);
    const nullIndex = values.findIndex(isNullish);
    if (nullIndex >= 0) {
      addSelection(selections, nullIndex, "supplemental", `null:${columnNames[columnIndex]}`);
      supplementCounts.null = (supplementCounts.null ?? 0) + 1;
    }

    const nonNullKinds = new Map<string, number>();
    values.filter(value => !isNullish(value)).forEach(value => {
      const kind = rawKind(value);
      nonNullKinds.set(kind, (nonNullKinds.get(kind) ?? 0) + 1);
    });
    if (nonNullKinds.size > 1) {
      const minorityKind = [...nonNullKinds.entries()].sort((left, right) => left[1] - right[1])[0]?.[0];
      const mixedIndex = values.findIndex(value => !isNullish(value) && rawKind(value) === minorityKind);
      if (mixedIndex >= 0) {
        addSelection(selections, mixedIndex, "supplemental", `mixed_type:${columnNames[columnIndex]}`);
        supplementCounts.mixed_type = (supplementCounts.mixed_type ?? 0) + 1;
      }
    }

    const counts = new Map<string, number>();
    for (const value of values) {
      if (isNullish(value)) continue;
      const key = `${rawKind(value)}:${String(value)}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const categorical = counts.size > 1 && counts.size <= Math.min(100, Math.max(20, Math.ceil(rows.length * 0.2)));
    if (categorical) {
      const rareKey = [...counts.entries()].sort((left, right) => left[1] - right[1] || left[0].localeCompare(right[0]))[0]?.[0];
      const rareIndex = values.findIndex(value => !isNullish(value) && `${rawKind(value)}:${String(value)}` === rareKey);
      if (rareIndex >= 0) {
        addSelection(selections, rareIndex, "supplemental", `rare_value:${columnNames[columnIndex]}`);
        supplementCounts.rare_value = (supplementCounts.rare_value ?? 0) + 1;
      }
    }
  }
}

export function createRepresentativeEvidence(
  source: PhysicalSourceIdentityV1,
  columnNames: string[],
  rows: PhysicalDataRow[],
  profiles: ColumnPhysicalProfileV1[],
  issues: StructuralIssueV1[]
): RepresentativeEvidenceV1 {
  if (rows.length === 0) {
    return {
      schemaVersion: REPRESENTATIVE_EVIDENCE_SCHEMA_VERSION,
      sourceId: source.sourceId,
      strategy: "unavailable",
      fullFileTruth: false,
      sourceDataRowCount: 0,
      sampledRowCount: 0,
      rows: [],
      coveredRegions: [],
      issueSupplementCounts: {},
      limitations: ["No selected data region was available for representative evidence."]
    };
  }

  const selections = new Map<number, Selection>();
  const supplementCounts: Record<string, number> = {};
  if (rows.length <= 100) {
    for (const row of rows) addSelection(selections, row.dataRowIndex, "full", "all_rows_within_100_row_budget");
  } else {
    addRange(selections, [0, 1, 2, 3, 4].filter(index => index < rows.length), "head");
    addRange(selections, indexesAround(Math.floor((rows.length - 1) / 2), rows.length), "middle");
    addRange(selections, [rows.length - 5, rows.length - 4, rows.length - 3, rows.length - 2, rows.length - 1].filter(index => index >= 0), "tail");

    const random = pseudoRandom(stableSeed(`${source.sourceId}|${source.hash?.value ?? "no-hash"}|${rows.length}`));
    const randomIndexes = new Set<number>();
    while (randomIndexes.size < Math.min(10, rows.length)) randomIndexes.add(Math.floor(random() * rows.length));
    addRange(selections, [...randomIndexes].sort((left, right) => left - right), "deterministic_random");
  }

  const sourceIndexToDataIndex = new Map(rows.map(row => [row.sourceRowIndex, row.dataRowIndex]));
  addProfileFailures(selections, profiles, sourceIndexToDataIndex, supplementCounts);
  addIssueRows(selections, issues, sourceIndexToDataIndex, supplementCounts);
  addValueSupplements(selections, rows, columnNames, supplementCounts);

  const selectedRows: RepresentativeEvidenceRowV1[] = [...selections.entries()]
    .sort(([left], [right]) => left - right)
    .map(([dataRowIndex, selection]) => {
      const row = rows[dataRowIndex];
      return {
        dataRowIndex,
        sourceRowIndex: row.sourceRowIndex,
        regions: [...selection.regions].sort(),
        reasons: [...selection.reasons].sort(),
        values: rowValues(columnNames, row.rawValues)
      };
    });

  return {
    schemaVersion: REPRESENTATIVE_EVIDENCE_SCHEMA_VERSION,
    sourceId: source.sourceId,
    strategy: rows.length <= 100 ? "full" : "matrix_with_issue_supplement",
    fullFileTruth: false,
    sourceDataRowCount: rows.length,
    sampledRowCount: selectedRows.length,
    rows: selectedRows,
    coveredRegions: [...new Set(selectedRows.flatMap(row => row.regions))].sort(),
    issueSupplementCounts: supplementCounts,
    limitations: [
      "Representative evidence is not a full-file aggregate and must not be used as full-file truth.",
      "Rare-value supplementation is bounded and may not include every rare value."
    ]
  };
}
