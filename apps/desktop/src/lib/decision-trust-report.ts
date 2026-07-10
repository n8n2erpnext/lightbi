import type { DatasetFamily } from './batch-inspection';
import { detectKeyCandidates } from './business-key-detector';

export type DecisionTrustTier = 'safe_to_decide' | 'review_before_deciding' | 'exploratory_only';

export type DecisionTrustIssueType =
  | 'missing_data'
  | 'sheet_format_mismatch'
  | 'duplicate_key_rows'
  | 'weak_key'
  | 'sample_only';

export type DecisionTrustIssue = {
  type: DecisionTrustIssueType;
  title: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
  count?: number;
  percent?: number;
  evidence: string[];
};

export type DecisionTrustReport = {
  score: number;
  tier: DecisionTrustTier;
  headline: string;
  explanation: string;
  issues: DecisionTrustIssue[];
  recommendation: string;
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeHeader(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function schemaKey(columns: string[]): string {
  return columns.map(normalizeHeader).join('|');
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function issuePenalty(issue: DecisionTrustIssue): number {
  switch (issue.type) {
    case 'sheet_format_mismatch':
      return Math.min(24, (issue.count ?? 1) * 8);
    case 'duplicate_key_rows':
      return Math.min(22, Math.max(8, (issue.percent ?? 0) * 0.9));
    case 'missing_data':
      return Math.min(20, Math.max(4, (issue.percent ?? 0) * 0.6));
    case 'weak_key':
      return 12;
    case 'sample_only':
      return 5;
    default:
      return 0;
  }
}

export function createDecisionTrustReport(family: DatasetFamily): DecisionTrustReport {
  const issues: DecisionTrustIssue[] = [];
  const totalRows = Math.max(0, family.totalRows);
  const columns = family.columns;

  const missingColumns = columns
    .map(column => ({ column, profile: family.profiles[column] }))
    .filter(item => item.profile && item.profile.nullPercent >= 10)
    .sort((left, right) => (right.profile?.nullPercent ?? 0) - (left.profile?.nullPercent ?? 0))
    .slice(0, 5);

  for (const item of missingColumns) {
    const percent = item.profile!.nullPercent;
    issues.push({
      type: 'missing_data',
      title: `Missing data in ${item.column}`,
      detail: `${formatPercent(percent)} of values are blank in ${item.column}.`,
      severity: percent >= 30 ? 'critical' : 'warning',
      percent,
      evidence: [`Column: ${item.column}`, `Missing: ${formatPercent(percent)}`],
    });
  }

  const expectedSchema = schemaKey(family.columns);
  const mismatchedSheets: string[] = [];
  const emptySheets: string[] = [];
  for (const item of family.files) {
    if (item.result.status !== 'accessible') continue;
    const metadata = item.result.metadata;
    if (!metadata.is_workbook || !metadata.sheets) continue;
    for (const [sheetName, sheet] of Object.entries(metadata.sheets)) {
      if (sheet.columns.length === 0) {
        emptySheets.push(`${item.file.name} / ${sheetName}`);
        continue;
      }
      if (schemaKey(sheet.columns) !== expectedSchema) {
        mismatchedSheets.push(`${item.file.name} / ${sheetName}`);
      }
    }
  }

  const sheetIssueCount = mismatchedSheets.length + emptySheets.length;
  if (sheetIssueCount > 0) {
    issues.push({
      type: 'sheet_format_mismatch',
      title: `${sheetIssueCount} sheet${sheetIssueCount === 1 ? '' : 's'} need format review`,
      detail: `${mismatchedSheets.length} sheet${mismatchedSheets.length === 1 ? '' : 's'} use a different column structure and ${emptySheets.length} sheet${emptySheets.length === 1 ? '' : 's'} are empty.`,
      severity: sheetIssueCount >= 2 ? 'critical' : 'warning',
      count: sheetIssueCount,
      evidence: [...mismatchedSheets, ...emptySheets].slice(0, 5),
    });
  }

  const keyCandidates = detectKeyCandidates(family, {});
  const bestKey = keyCandidates
    .filter(candidate => candidate.distinctRatio > 0)
    .sort((left, right) => (right.distinctRatio - right.nullRatio) - (left.distinctRatio - left.nullRatio))[0];

  if (bestKey && totalRows > 0) {
    const duplicateRows = Math.max(0, totalRows - Math.round(bestKey.distinctRatio * totalRows));
    const duplicatePercent = totalRows > 0 ? (duplicateRows / totalRows) * 100 : 0;
    if (duplicateRows > 0 && duplicatePercent >= 1) {
      issues.push({
        type: 'duplicate_key_rows',
        title: `${duplicateRows.toLocaleString()} duplicate key row${duplicateRows === 1 ? '' : 's'}`,
        detail: `Candidate key ${bestKey.columnName} is not unique enough for row-level decisions.`,
        severity: duplicatePercent >= 10 ? 'critical' : 'warning',
        count: duplicateRows,
        percent: duplicatePercent,
        evidence: [`Candidate key: ${bestKey.columnName}`, `Duplicate estimate: ${duplicateRows.toLocaleString()} rows (${formatPercent(duplicatePercent)})`],
      });
    }
  } else if (totalRows > 1) {
    issues.push({
      type: 'weak_key',
      title: 'No strong row key detected',
      detail: 'LightBI cannot confidently identify duplicate or changed business rows.',
      severity: 'warning',
      evidence: ['No identifier-like column passed key quality checks.'],
    });
  }

  const sampledColumns = columns.filter(column => family.profiles[column]?.profilingScope === 'sample');
  if (sampledColumns.length > 0) {
    issues.push({
      type: 'sample_only',
      title: 'Some checks are sample-based',
      detail: `${sampledColumns.length} column${sampledColumns.length === 1 ? '' : 's'} were profiled from a representative sample, not the full file.`,
      severity: 'info',
      count: sampledColumns.length,
      evidence: sampledColumns.slice(0, 5),
    });
  }

  const score = clampScore(100 - issues.reduce((sum, issue) => sum + issuePenalty(issue), 0));
  const tier: DecisionTrustTier = score >= 85
    ? 'safe_to_decide'
    : score >= 60
      ? 'review_before_deciding'
      : 'exploratory_only';
  const criticalCount = issues.filter(issue => issue.severity === 'critical').length;
  const headline = tier === 'safe_to_decide'
    ? `Decision trust: ${score}%`
    : tier === 'review_before_deciding'
      ? `Decision trust: ${score}% - review before deciding`
      : `Decision trust: ${score}% - exploratory only`;
  const recommendation = tier === 'safe_to_decide'
    ? 'This dataset is strong enough for normal decision support, while keeping the listed caveats in view.'
    : tier === 'review_before_deciding'
      ? 'Use this analysis for directional review, but fix or verify the listed issues before making an important decision.'
      : 'Treat conclusions as exploratory only. Do not make an important decision until the listed data issues are resolved.';
  const explanation = issues.length === 0
    ? 'No major missing-data, sheet-format, or duplicate-key issue was detected from the available profile.'
    : `${issues.length} trust issue${issues.length === 1 ? '' : 's'} found${criticalCount > 0 ? `, including ${criticalCount} critical issue${criticalCount === 1 ? '' : 's'}` : ''}.`;

  return { score, tier, headline, explanation, issues, recommendation };
}
