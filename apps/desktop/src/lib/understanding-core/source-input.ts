import type { UnderstandingCoreInput, UnderstandingSourceKind } from "./contracts";

type BaseSourceDescriptor = {
  columns: string[];
  rows: Record<string, unknown>[];
  columnProfiles?: UnderstandingCoreInput["columnProfiles"];
  sourceRowCount?: number;
};

export type UnderstandingSourceDescriptor =
  | (BaseSourceDescriptor & {
      kind: "local_file";
      fileNames: string[];
      sheetNames?: string[];
      label?: string;
    })
  | (BaseSourceDescriptor & {
      kind: "online_file";
      url?: string;
      title?: string;
      sheetNames?: string[];
    })
  | (BaseSourceDescriptor & {
      kind: "database_table";
      connectionName?: string;
      tableName: string;
      schemaName?: string;
    })
  | (BaseSourceDescriptor & {
      kind: "api_response";
      endpointLabel?: string;
      url?: string;
    })
  | (BaseSourceDescriptor & {
      kind?: "unknown";
      label?: string;
      fileNames?: string[];
      sheetNames?: string[];
    });

function labelForSource(source: UnderstandingSourceDescriptor): string {
  switch (source.kind) {
    case "local_file":
      return source.label ?? source.fileNames[0] ?? "local file";
    case "online_file":
      return source.title ?? source.url ?? "online file";
    case "database_table":
      return [source.connectionName, source.schemaName, source.tableName].filter(Boolean).join(".") || "database table";
    case "api_response":
      return source.endpointLabel ?? source.url ?? "API response";
    default:
      return source.label ?? source.fileNames?.[0] ?? source.sheetNames?.[0] ?? "dataset";
  }
}

function sourceKind(source: UnderstandingSourceDescriptor): UnderstandingSourceKind {
  return source.kind ?? "unknown";
}

export function createUnderstandingCoreInputFromSource(
  source: UnderstandingSourceDescriptor
): UnderstandingCoreInput {
  return {
    sourceKind: sourceKind(source),
    sourceLabel: labelForSource(source),
    fileNames: "fileNames" in source ? source.fileNames : undefined,
    sheetNames: "sheetNames" in source ? source.sheetNames : undefined,
    columns: [...source.columns],
    rows: source.rows.map(row => ({ ...row })),
    columnProfiles: source.columnProfiles
      ? Object.fromEntries(
          Object.entries(source.columnProfiles).map(([column, profile]) => [
            column,
            {
              ...profile,
              topValues: profile.topValues ? [...profile.topValues] : undefined,
              topValueCounts: profile.topValueCounts
                ? profile.topValueCounts.map(value => ({ ...value }))
                : undefined
            }
          ])
        )
      : undefined,
    sourceRowCount: source.sourceRowCount
  };
}
