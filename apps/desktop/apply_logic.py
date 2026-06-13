import re

with open('src/lib/business-signal-detector.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update DetectorInput
detector_input_new = """export interface DetectorInput {
  columns: Array<{ 
    name: string, 
    type?: string,
    sampleValues?: any[],
    uniqueValuesCount?: number,
    distinctRatio?: number
  }>;
  semanticTags?: Record<string, string>; // mapping from column name to semantic tag
  overlayActions?: Array<{ physicalColumn: string, actionType: 'map_temporary' | 'keep_raw_unchanged' | 'ignore_mismatch', targetSignal?: string }>;
}"""

content = re.sub(r'export interface DetectorInput \{.*?\n\}', detector_input_new, content, flags=re.DOTALL)

# 2. Add time_period to taxonomy
taxonomy_new = """  // Core / Generic
  "time_period": { domain: "core", label: "Time Period", type: "time", aliases: ["period", "month", "fiscal period"] },
  "status": { domain: "core", label: "Status", type: "dimension", aliases: ["status", "trang thai"] },"""
content = content.replace('  // Core / Generic\n  "status": { domain: "core", label: "Status", type: "dimension", aliases: ["status", "trang thai"] },', taxonomy_new)

# 3. Add mapping logic and helper constants before detectBusinessSignals
helpers = """const SUFFIX_MAPPING = [
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
];"""

content = content.replace('export function detectBusinessSignals(input: DetectorInput): BusinessSignalRegistry {', helpers + '\n\nexport function detectBusinessSignals(input: DetectorInput): BusinessSignalRegistry {')


# 4. Replace the entire logic of detectBusinessSignals body up to `// 2. Merge Candidates into final Signals`
new_logic = """  const candidates: BusinessSignalCandidate[] = [];
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
    for (const [canonicalId, info] of Object.entries(TAXONOMY)) {
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
      } else if (!exactMatchFound && variantStr !== normalizedCol && info.aliases.includes(variantStr)) {
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
  }

  const mappingReviewItems: import('./dataset-understanding-contract').MappingReviewItem[] = [];
  for (const col of input.columns) {
    const overlay = overlayMap.get(col.name);
    if (overlay?.actionType === 'ignore_mismatch') continue;
    
    if (overlay?.actionType === 'keep_raw_unchanged') {
       mappingReviewItems.push({ physicalColumn: col.name, issueType: 'unrecognized', confidence: 100, suggestedActions: [] });
       continue;
    }
    
    const matches = colMapToSignals.get(col.name) || [];
    if (overlay?.actionType === 'map_temporary') {
       mappingReviewItems.push({ physicalColumn: col.name, inferredSignal: matches[0], issueType: 'recognized', confidence: 100, suggestedActions: [] });
       continue;
    }

    if (matches.length === 0) {
       mappingReviewItems.push({ physicalColumn: col.name, issueType: 'unrecognized', confidence: 0, suggestedActions: [] });
    } else if (matches.length > 1) {
       mappingReviewItems.push({ physicalColumn: col.name, issueType: 'ambiguous', confidence: 40, suggestedActions: [] });
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

  // 2. Merge Candidates into final Signals"""

content = re.sub(r'  const candidates: BusinessSignalCandidate\[\] = \[\];.*?// 2\. Merge Candidates into final Signals', new_logic, content, flags=re.DOTALL)

with open('src/lib/business-signal-detector-modified.ts', 'w', encoding='utf-8') as f:
    f.write(content)
