import { createSemanticCoverageReport, type SemanticCoverageReport } from './semantic-coverage';
import { inferContextSemanticCandidates } from './context-semantic-dictionary';
import { SEMANTIC_TAXONOMY_V1, type SignalType } from './semantic-registry';

export interface EvidenceBreakdown {
  columnAliasMatch: number;
  semanticTagMatch: number;
  relationshipSupport: number;
  profileSupport: number;
  valueSupport?: number;
  shapeSupport?: number;
  neighborSupport?: number;
  crossFileSupport?: number;
  conflictPenalty?: number;
}

export interface BusinessSignalEvidence {
  columnName: string;
  matchReason: string;
  breakdown: EvidenceBreakdown;
}

export interface BusinessSignalConfidence {
  score: number;
  isVerified: boolean;
}

export interface BusinessSignalCandidate {
  canonicalId: string;
  domain: string;
  evidence: BusinessSignalEvidence;
  confidence: BusinessSignalConfidence;
  detectorId: string;
}

export interface BusinessSignal {
  canonicalId: string;
  domain: string;
  label: string;
  confidenceScore: number;
  supportingEvidence: BusinessSignalEvidence[];
}

export interface BusinessSignalRegistry {
  datasetId: string;
  signals: BusinessSignal[];
  hasSignal: (canonicalId: string) => boolean;
  getSignal: (canonicalId: string) => BusinessSignal | undefined;
  getSignalsByDomain: (domain: string) => BusinessSignal[];
  getOverallConfidence: () => number;
  mappingReview?: import('./dataset-understanding-contract').MappingReviewContract;
  semanticCoverage?: SemanticCoverageReport;
}

// Vietnamese string normalization: lowercase, trim, remove accents, normalize hyphen/underscore to space
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/đ/g, "d").replace(/Đ/g, "D") // Handle Vietnamese 'đ'
    .replace(/[-_]/g, " ") // Convert hyphens and underscores to spaces
    .replace(/\s+/g, " "); // Collapse multiple spaces
}

export type { SignalType } from './semantic-registry';

export const TAXONOMY = SEMANTIC_TAXONOMY_V1;

export function getSignalType(canonicalId: string): SignalType {
  return TAXONOMY[canonicalId]?.type || "dimension";
}

export interface DetectorInput {
  columns: Array<{ 
    name: string, 
    type?: string,
    sampleValues?: any[],
    uniqueValuesCount?: number,
    distinctRatio?: number
  }>;
  semanticTags?: Record<string, string>; // mapping from column name to semantic tag
  overlayActions?: Array<{ physicalColumn: string, actionType: 'map_temporary' | 'merge_temporary' | 'keep_raw_unchanged' | 'ignore_mismatch', targetSignal?: string }>;
  semanticContext?: {
    relatedColumns?: DetectorInput['columns'];
    crossFileSignals?: string[];
    crossFileColumnNames?: string[];
  };
}

const SUFFIX_MAPPING = [
  { suffix: ' amount', typeHint: 'measure' },
  { suffix: '_amount', typeHint: 'measure' },
  { suffix: ' amt', typeHint: 'measure' },
  { suffix: '_amt', typeHint: 'measure' },
  { suffix: ' value', typeHint: 'measure' },
  { suffix: '_value', typeHint: 'measure' },
  { suffix: ' net', typeHint: 'measure' },
  { suffix: '_net', typeHint: 'measure' },
  { suffix: ' pct', typeHint: 'measure' },
  { suffix: '_pct', typeHint: 'measure' },
  { suffix: ' misc', typeHint: 'measure' },
  { suffix: '_misc', typeHint: 'measure' },
  { suffix: ' qty', typeHint: 'measure' },
  { suffix: '_qty', typeHint: 'measure' },
  { suffix: ' minutes', typeHint: 'measure' },
  { suffix: '_minutes', typeHint: 'measure' },
  
  { suffix: ' name', typeHint: 'dimension' },
  { suffix: '_name', typeHint: 'dimension' },
  { suffix: ' id', typeHint: 'dimension' },
  { suffix: '_id', typeHint: 'dimension' },
  { suffix: ' code', typeHint: 'dimension' },
  { suffix: '_code', typeHint: 'dimension' },
  { suffix: ' no', typeHint: 'dimension' },
  { suffix: '_no', typeHint: 'dimension' },
  { suffix: ' plate', typeHint: 'dimension' },
  { suffix: '_plate', typeHint: 'dimension' },
  { suffix: ' met', typeHint: 'dimension' },
  { suffix: '_met', typeHint: 'dimension' },
  
  { suffix: ' date', typeHint: 'time' },
  { suffix: '_date', typeHint: 'time' },
  { suffix: ' time', typeHint: 'time' },
  { suffix: '_time', typeHint: 'time' }
];

const PREFIX_MAPPING = [
  { prefix: 'id ', typeHint: 'dimension' },
  { prefix: 'id_', typeHint: 'dimension' },
  { prefix: 'total ', typeHint: 'measure' },
  { prefix: 'total_', typeHint: 'measure' }
];

export function detectBusinessSignals(input: DetectorInput): BusinessSignalRegistry {
  const candidates: BusinessSignalCandidate[] = [];
  const overlayMap = new Map(input.overlayActions?.map(a => [a.physicalColumn, a]));

  const colMapToSignals = new Map<string, string[]>();
  const signalMapToCols = new Map<string, string[]>();
  
  for (const col of input.columns) {
      if (!colMapToSignals.has(col.name)) colMapToSignals.set(col.name, []);
  }

  // 1. Generate Candidates
  for (const col of input.columns) {
    const normalizedCol = normalizeString(col.name);
    
    const overlay = overlayMap.get(col.name);
    if (overlay?.actionType === 'ignore_mismatch') {
       continue;
    }
    if (overlay?.actionType === 'keep_raw_unchanged') {
       continue;
    }
    if (overlay?.actionType === 'map_temporary' && overlay.targetSignal) {
      const info = TAXONOMY[overlay.targetSignal];
      if (info) {
        colMapToSignals.get(col.name)!.push(overlay.targetSignal);
        if (!signalMapToCols.has(overlay.targetSignal)) signalMapToCols.set(overlay.targetSignal, []);
        signalMapToCols.get(overlay.targetSignal)!.push(col.name);
        candidates.push({
          canonicalId: overlay.targetSignal,
          domain: info.domain,
          evidence: {
            columnName: col.name,
            matchReason: `User overridden to ${overlay.targetSignal}`,
            breakdown: { columnAliasMatch: 100, semanticTagMatch: 0, relationshipSupport: 0, profileSupport: 0 }
          },
          confidence: { score: 100, isVerified: true },
          detectorId: "user_override"
        });
        continue;
      }
    }

    let exactMatchFound = false;
    for (const [, info] of Object.entries(TAXONOMY)) {
       if (info.aliases.includes(normalizedCol)) exactMatchFound = true;
    }

    let variantStr = normalizedCol;
    let variantTypeHint: SignalType | undefined = undefined;
    if (!exactMatchFound) {
       for (const map of SUFFIX_MAPPING) {
          if (normalizedCol.endsWith(map.suffix) && normalizedCol !== map.suffix.trim()) {
             variantStr = normalizedCol.slice(0, -map.suffix.length).trim();
             variantTypeHint = map.typeHint as SignalType;
             break;
          }
       }
       if (variantStr === normalizedCol) {
          for (const map of PREFIX_MAPPING) {
             if (normalizedCol.startsWith(map.prefix) && normalizedCol !== map.prefix.trim()) {
                variantStr = normalizedCol.slice(map.prefix.length).trim();
                variantTypeHint = map.typeHint as SignalType;
                break;
             }
          }
       }
    }

    // Attempt to match taxonomy
    for (const [canonicalId, info] of Object.entries(TAXONOMY)) {
      let isMatch = false;
      let breakdown: EvidenceBreakdown = {
        columnAliasMatch: 0,
        semanticTagMatch: 0,
        relationshipSupport: 0,
        profileSupport: 0
      };

      if (info.aliases.includes(normalizedCol)) {
        breakdown.columnAliasMatch = 40;
        isMatch = true;
      } else if ((!exactMatchFound || (canonicalId === 'margin' && normalizedCol === 'margin pct')) && variantStr !== normalizedCol && info.aliases.includes(variantStr)) {
         if (!variantTypeHint || variantTypeHint === info.type) {
            breakdown.columnAliasMatch = 30;
            isMatch = true;
         }
      }
      
      // Check semantic tag match if provided
      if (input.semanticTags && input.semanticTags[col.name]) {
        const normTag = normalizeString(input.semanticTags[col.name]);
        if (normTag === canonicalId || info.aliases.includes(normTag)) {
           breakdown.semanticTagMatch = 30;
           isMatch = true;
        }
      }
      
      if (isMatch) {
         let profileBoost = 10; // base
         const isTime = info.type === 'time';
         const isDimension = info.type === 'dimension';
         const isMeasure = info.type === 'measure';
         
         if (isTime && col.sampleValues) {
            const dateLike = col.sampleValues.some((v: any) => !isNaN(Date.parse(v)));
            if (dateLike) profileBoost += 20;
         }
         
         if (isDimension && col.type && (col.type.toLowerCase() === 'varchar' || col.type.toLowerCase() === 'string')) {
             profileBoost += 10;
         }
         
         if ((canonicalId === 'status' || canonicalId === 'delivery_status' || canonicalId === 'stock_status') && col.uniqueValuesCount !== undefined && col.distinctRatio !== undefined) {
             if (col.distinctRatio <= 0.05 || col.uniqueValuesCount <= 10) {
                profileBoost += 20;
             }
         }
         
         if (isMeasure) {
             if (col.type && (col.type.toLowerCase() === 'number' || col.type.toLowerCase() === 'integer' || col.type.toLowerCase() === 'float')) {
                profileBoost += 20;
             } else if (col.type && col.type.toLowerCase() === 'string' && !(col.sampleValues?.some((v:any) => !isNaN(Number(v))))) {
                profileBoost -= 10;
             }
         }
         
         if (canonicalId === 'sku' && col.distinctRatio !== undefined && col.distinctRatio >= 0.9) {
             profileBoost += 15;
         }
         
         breakdown.profileSupport = profileBoost;

        colMapToSignals.get(col.name)!.push(canonicalId);
        if (!signalMapToCols.has(canonicalId)) signalMapToCols.set(canonicalId, []);
        signalMapToCols.get(canonicalId)!.push(col.name);

        const score = breakdown.columnAliasMatch + breakdown.semanticTagMatch + breakdown.relationshipSupport + breakdown.profileSupport;
        candidates.push({
          canonicalId,
          domain: info.domain,
          evidence: {
            columnName: col.name,
            matchReason: `Matched via alias '${normalizedCol}'`,
            breakdown
          },
          confidence: {
            score: score,
            isVerified: false
          },
          detectorId: "column_alias_detector_v1"
        });
      }
    }

    const contextCandidates = inferContextSemanticCandidates(col, {
      siblingColumns: [
        ...input.columns.filter(candidateColumn => candidateColumn.name !== col.name),
        ...(input.semanticContext?.relatedColumns || [])
      ],
      crossFileSignals: input.semanticContext?.crossFileSignals,
      crossFileColumnNames: input.semanticContext?.crossFileColumnNames
    });
    for (const contextCandidate of contextCandidates) {
      const info = TAXONOMY[contextCandidate.canonicalId];
      if (!info) continue;
      const existingMatchesForColumn = new Set(colMapToSignals.get(col.name) || []);
      if (contextCandidate.valueScore <= 0 && contextCandidate.neighborScore <= 0 && contextCandidate.crossFileScore <= 0 && existingMatchesForColumn.has(contextCandidate.canonicalId)) {
        continue;
      }

      colMapToSignals.get(col.name)!.push(contextCandidate.canonicalId);
      if (!signalMapToCols.has(contextCandidate.canonicalId)) signalMapToCols.set(contextCandidate.canonicalId, []);
      signalMapToCols.get(contextCandidate.canonicalId)!.push(col.name);

      candidates.push({
        canonicalId: contextCandidate.canonicalId,
        domain: info.domain,
        evidence: {
          columnName: col.name,
          matchReason: contextCandidate.reasons.join(' '),
          breakdown: {
            columnAliasMatch: contextCandidate.headerScore,
            semanticTagMatch: 0,
            relationshipSupport: 0,
            profileSupport: 0,
            valueSupport: contextCandidate.valueScore,
            shapeSupport: contextCandidate.shapeScore,
            neighborSupport: contextCandidate.neighborScore,
            crossFileSupport: contextCandidate.crossFileScore
          }
        },
        confidence: {
          score: contextCandidate.confidence,
          isVerified: false
        },
        detectorId: "context_semantic_dictionary_v1"
      });
    }
  }

  const mappingReviewItems: import('./dataset-understanding-contract').MappingReviewItem[] = [];
  for (const col of input.columns) {
    const overlay = overlayMap.get(col.name);
    if (overlay?.actionType === 'ignore_mismatch') continue;
    
    if (overlay?.actionType === 'keep_raw_unchanged') {
       mappingReviewItems.push({ physicalColumn: col.name, issueType: 'unrecognized', confidence: 100, suggestedActions: [] });
       continue;
    }
    
    const matches = [...new Set(colMapToSignals.get(col.name) || [])];
    if (overlay?.actionType === 'map_temporary') {
       mappingReviewItems.push({ physicalColumn: col.name, inferredSignal: matches[0], issueType: 'recognized', confidence: 100, suggestedActions: [] });
       continue;
    }

    if (matches.length === 0) {
       mappingReviewItems.push({ physicalColumn: col.name, issueType: 'unrecognized', confidence: 0, suggestedActions: [] });
    } else if (matches.length > 1) {
       mappingReviewItems.push({ physicalColumn: col.name, inferredSignal: matches[0], issueType: 'conflicting', confidence: 40, suggestedActions: [] });
    } else {
       const canonicalId = matches[0];
       const peers = signalMapToCols.get(canonicalId) || [];
       if (peers.length > 1) {
          mappingReviewItems.push({ physicalColumn: col.name, inferredSignal: canonicalId, issueType: 'conflicting', confidence: 40, suggestedActions: [] });
       } else {
          mappingReviewItems.push({ physicalColumn: col.name, inferredSignal: canonicalId, issueType: 'recognized', confidence: 80, suggestedActions: [] });
       }
    }
  }

  // 2. Merge Candidates into final Signals
  const mergedSignalsMap = new Map<string, BusinessSignal>();
  
  for (const candidate of candidates) {
    if (mergedSignalsMap.has(candidate.canonicalId)) {
      const existing = mergedSignalsMap.get(candidate.canonicalId)!;
      // Merge evidence
      existing.supportingEvidence.push(candidate.evidence);
      // Keep best confidence
      if (candidate.confidence.score > existing.confidenceScore) {
        existing.confidenceScore = candidate.confidence.score;
      }
    } else {
      mergedSignalsMap.set(candidate.canonicalId, {
        canonicalId: candidate.canonicalId,
        domain: candidate.domain,
        label: TAXONOMY[candidate.canonicalId].label,
        confidenceScore: candidate.confidence.score,
        supportingEvidence: [candidate.evidence]
      });
    }
  }

  // 2.5 Contextual promotion for 'status'
  if (mergedSignalsMap.has('status')) {
    const hasDeliveryContext = mergedSignalsMap.has('driver') || mergedSignalsMap.has('route') || mergedSignalsMap.has('shipment');
    const hasInventoryContext = mergedSignalsMap.has('sku') || mergedSignalsMap.has('inventory') || mergedSignalsMap.has('stock_qty') || mergedSignalsMap.has('stock_age');
    
    if (hasDeliveryContext) {
       const s = mergedSignalsMap.get('status')!;
       mergedSignalsMap.delete('status');
       s.canonicalId = 'delivery_status';
       s.label = 'Delivery Status';
       s.domain = 'operations';
       mergedSignalsMap.set('delivery_status', s);
       
       // Update mapping review item
       const mr = mappingReviewItems.find(m => m.inferredSignal === 'status');
       if (mr) mr.inferredSignal = 'delivery_status';
    } else if (hasInventoryContext) {
       const s = mergedSignalsMap.get('status')!;
       mergedSignalsMap.delete('status');
       s.canonicalId = 'stock_status';
       s.label = 'Inventory Status';
       s.domain = 'inventory';
       mergedSignalsMap.set('stock_status', s);

       // Update mapping review item
       const mr = mappingReviewItems.find(m => m.inferredSignal === 'status');
       if (mr) mr.inferredSignal = 'stock_status';
    }
  }

  const signals = Array.from(mergedSignalsMap.values());
  const semanticCoverage = createSemanticCoverageReport(input.columns, mappingReviewItems);

  // 3. Construct Registry
  return {
    datasetId: "unknown",
    signals,
    hasSignal: (id: string) => mergedSignalsMap.has(id),
    getSignal: (id: string) => mergedSignalsMap.get(id),
    getSignalsByDomain: (domain: string) => signals.filter(s => s.domain === domain),
    getOverallConfidence: () => {
      if (signals.length === 0) return 0;
      const sum = signals.reduce((acc, s) => acc + s.confidenceScore, 0);
      return sum / signals.length;
    },
    mappingReview: {
      items: mappingReviewItems
    },
    semanticCoverage
  };
}
