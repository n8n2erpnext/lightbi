import type { SourceInspectionResult } from './source-preflight';
import type { ColumnProfile } from './column-profiler';

export type DatasetFamily = {
  id: string;
  name: string;
  schemaFingerprint: string;
  files: { file: File; result: SourceInspectionResult }[];
  totalRows: number;
  columns: string[];
  profiles: Record<string, ColumnProfile>;
};

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

function generateSchemaFingerprint(columns: string[]): string {
  const normalized = columns.map(c => c.trim().toLowerCase());
  return hashString(normalized.join("|"));
}

function guessFamilyName(columns: string[], groupIndex: number): string {
  const cols = columns.map(c => c.toLowerCase());
  const has = (keyword: string) => cols.some(c => c.includes(keyword));

  if (has('mã tải kiện') || has('chuyến xe') || has('tuyến xe')) {
    return 'Delivery Performance Reports';
  }
  if (has('thời gian tồn') && has('tiền thu hộ')) {
    return 'Inventory Aging Reports';
  }
  if (has('tồn dự kiến') || has('tồn chưa kết nối') || (has('tồn') && !has('tiền thu hộ'))) {
    return 'Pending Stock Reports';
  }
  if (has('doanh thu') || has('tiền hàng') || has('thực thu')) {
    return 'Sales Reports';
  }
  if (has('chấm công') || has('ngày công')) {
    return 'Attendance Reports';
  }

  const alpha = String.fromCharCode(65 + groupIndex); // A, B, C...
  return `Dataset Group ${alpha}`;
}

export function classifyDatasetFamilies(
  items: { file: File; result: SourceInspectionResult }[],
  strategy: 'strict' | 'semantic' = 'strict'
): DatasetFamily[] {
  const familiesMap = new Map<string, DatasetFamily>();
  let fallbackGroupIndex = 0;

  for (const item of items) {
    if (item.result.status !== 'accessible') continue;

    let rows = item.result.metadata.rows_count || 0;
    let cols = item.result.metadata.columns || [];
    let profs = item.result.metadata.profiles || {};

    if (item.result.metadata.is_workbook && item.result.metadata.default_sheet && item.result.metadata.sheets) {
      const sheet = item.result.metadata.sheets[item.result.metadata.default_sheet];
      if (sheet) {
        rows = sheet.rows_count || 0;
        cols = sheet.columns || [];
        profs = sheet.profiles || {};
      }
    }

    // Allow files with 0 columns so they still get a DatasetFamily as requested
    // if (cols.length === 0) continue;

    let matchKey = '';

    if (strategy === 'strict') {
      matchKey = generateSchemaFingerprint(cols);
    } else {
      // Future semantic merge strategy, for now fallback to strict
      matchKey = generateSchemaFingerprint(cols);
    }

    if (familiesMap.has(matchKey)) {
      const family = familiesMap.get(matchKey)!;
      family.files.push(item);
      family.totalRows += rows;
    } else {
      familiesMap.set(matchKey, {
        id: `fam_${matchKey}_${Date.now()}`,
        name: guessFamilyName(cols, fallbackGroupIndex),
        schemaFingerprint: matchKey,
        files: [item],
        totalRows: rows,
        columns: cols,
        profiles: profs
      });
      fallbackGroupIndex++;
    }
  }

  return Array.from(familiesMap.values());
}
