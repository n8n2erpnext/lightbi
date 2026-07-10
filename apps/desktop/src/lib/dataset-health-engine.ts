import type { DatasetFamily } from './batch-inspection';
import { detectKeyCandidates } from './business-key-detector';

export type DatasetHealthWarningType = 
  | "high_null_ratio"
  | "duplicate_keys"
  | "weak_candidate_key"
  | "inconsistent_types"
  | "missing_required_columns";

export type DatasetHealthWarning = {
  type: DatasetHealthWarningType;
  message: string;
  severity: "low" | "medium" | "high";
};

export type DatasetHealthResult = {
  datasetId?: string;
  completeness: number;
  consistency: number;
  uniqueness: number;
  keyQuality: number;
  overall: number;
  warnings: DatasetHealthWarning[];
};

export function calculateCompleteness(profile: DatasetFamily): number {
  if (profile.columns.length === 0) return 0;
  let totalNullPercent = 0;
  for (const col of profile.columns) {
    const colProfile = profile.profiles[col];
    if (colProfile) {
      totalNullPercent += colProfile.nullPercent;
    }
  }
  const avgNullPercent = totalNullPercent / profile.columns.length;
  // 0 nulls -> 100, 100 nulls -> 0
  return Math.max(0, Math.min(100, Math.round(100 - avgNullPercent)));
}

export function calculateConsistency(profile: DatasetFamily): number {
  if (profile.columns.length === 0) return 0;
  let unknownCount = 0;
  for (const col of profile.columns) {
    const colProfile = profile.profiles[col];
    if (colProfile && colProfile.dataType === 'unknown') {
      unknownCount++;
    }
  }
  const unknownRatio = unknownCount / profile.columns.length;
  return Math.max(0, Math.min(100, Math.round(100 - (unknownRatio * 100))));
}

export function calculateUniqueness(profile: DatasetFamily): number {
  if (profile.totalRows === 0 || profile.columns.length === 0) return 0;
  
  let maxDistinctRatio = 0;
  for (const col of profile.columns) {
    const colProfile = profile.profiles[col];
    if (colProfile) {
      const distinctRatio = colProfile.distinctCount / profile.totalRows;
      if (distinctRatio > maxDistinctRatio) {
        maxDistinctRatio = distinctRatio;
      }
    }
  }
  return Math.max(0, Math.min(100, Math.round(maxDistinctRatio * 100)));
}

export function calculateKeyQuality(profile: DatasetFamily): number {
  const candidates = detectKeyCandidates(profile, {});
  if (candidates.length === 0) return 0;

  // Find the best candidate
  let bestScore = 0;
  for (const candidate of candidates) {
    let score = candidate.distinctRatio * 100;
    score -= (candidate.nullRatio * 100); // Penalty for nulls
    if (candidate.isGeneric) {
       score -= 20; // Penalty for generic names like "id" if better semantic ones exist
    }
    if (score > bestScore) {
      bestScore = score;
    }
  }
  
  return Math.max(0, Math.min(100, Math.round(bestScore)));
}

export function calculateDatasetHealth(profile: DatasetFamily): DatasetHealthResult {
  const completeness = calculateCompleteness(profile);
  const consistency = calculateConsistency(profile);
  const uniqueness = calculateUniqueness(profile);
  const keyQuality = calculateKeyQuality(profile);

  const overall = Math.round(
    completeness * 0.30 +
    consistency * 0.20 +
    uniqueness * 0.25 +
    keyQuality * 0.25
  );

  const warnings: DatasetHealthWarning[] = [];

  const avgNullRatio = (100 - completeness) / 100;
  if (avgNullRatio > 0.25) {
    warnings.push({
      type: "high_null_ratio",
      message: `High null ratio detected (${Math.round(avgNullRatio * 100)}%). This may skew analysis.`,
      severity: "high"
    });
  }

  const duplicateRatio = (100 - uniqueness) / 100;
  if (duplicateRatio > 0.10) {
    warnings.push({
      type: "duplicate_keys",
      message: `Significant duplicate ratio detected (${Math.round(duplicateRatio * 100)}%).`,
      severity: "medium"
    });
  }

  if (keyQuality < 60) {
    warnings.push({
      type: "weak_candidate_key",
      message: "No strong candidate keys detected. Joining this dataset may be risky.",
      severity: "high"
    });
  }

  if (consistency < 70) {
    warnings.push({
      type: "inconsistent_types",
      message: "Inconsistent data types detected across multiple columns.",
      severity: "medium"
    });
  }

  return {
    datasetId: profile.id,
    completeness,
    consistency,
    uniqueness,
    keyQuality,
    overall,
    warnings
  };
}
