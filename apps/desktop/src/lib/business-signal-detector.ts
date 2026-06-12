export interface EvidenceBreakdown {
  columnAliasMatch: number;
  semanticTagMatch: number;
  relationshipSupport: number;
  profileSupport: number;
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

export type SignalType = "time" | "dimension" | "measure";

export const TAXONOMY: Record<string, { domain: string, label: string, type: SignalType, aliases: string[] }> = {
  // Operations
  "report_date": { domain: "operations", label: "Report Date", type: "time", aliases: ["ngày báo cáo", "ngay bao cao", "ngày", "ngay", "report", "report date", "delivery date", "ngày giao", "ngay giao", "ngày phát", "ngay phat"] },
  "driver": { domain: "operations", label: "Driver", type: "dimension", aliases: ["driver", "courier", "shipper", "tai xe", "nhan vien giao hang", "tên lái xe", "ten lai xe", "lái xe", "lai xe", "tài xế", "tên tài xế", "ten tai xe", "bưu tá", "buu ta"] },
  "route": { domain: "operations", label: "Route", type: "dimension", aliases: ["route", "zone", "region", "tuyen xe", "khu vuc phat"] },
  "shipment": { domain: "operations", label: "Shipment", type: "measure", aliases: ["shipment", "package", "parcel", "don hang", "kien hang", "mã tài kiện", "ma tai kien", "tài kiện", "tai kien", "mã kiện", "ma kien", "kiện hàng", "mã vận đơn", "ma van don", "vận đơn", "van don", "awb", "tracking", "tracking code", "shipment id", "parcel id"] },
  "delivery_status": { domain: "operations", label: "Delivery Status", type: "dimension", aliases: ["delivery status", "trang thai giao hang"] },
  "sla": { domain: "operations", label: "SLA", type: "dimension", aliases: ["sla", "deadline", "promise date", "thoi han", "han chot"] },
  "warehouse": { domain: "operations", label: "Warehouse", type: "dimension", aliases: ["warehouse", "hub", "depot", "kho", "kho hang"] },
  "delay": { domain: "operations", label: "Delay", type: "measure", aliases: ["delay", "late", "cham tre", "tre han"] },
  "vehicle": { domain: "operations", label: "Vehicle", type: "dimension", aliases: ["vehicle", "truck", "van", "xe", "phuong tien"] },
  
  // Revenue
  "customer": { domain: "customer", label: "Customer", type: "dimension", aliases: ["customer", "client", "buyer", "khach hang", "nguoi mua"] },
  "order": { domain: "revenue", label: "Order", type: "measure", aliases: ["order", "purchase", "don mua", "don hang"] },
  "revenue": { domain: "revenue", label: "Revenue", type: "measure", aliases: ["revenue", "doanh thu", "doanh so"] },
  "discount": { domain: "revenue", label: "Discount", type: "measure", aliases: ["discount", "giam gia", "chiet khau"] },
  "sales": { domain: "revenue", label: "Sales", type: "measure", aliases: ["sales", "ban hang", "doanh ban"] },
  "branch": { domain: "revenue", label: "Branch", type: "dimension", aliases: ["branch", "store", "chi nhanh", "cua hang"] },
  "salesperson": { domain: "revenue", label: "Salesperson", type: "dimension", aliases: ["salesperson", "rep", "nhan vien ban hang", "nhan vien kinh doanh"] },
  
  // Finance
  "cost": { domain: "finance", label: "Cost", type: "measure", aliases: ["cost", "chi phi", "gia von"] },
  "profit": { domain: "finance", label: "Profit", type: "measure", aliases: ["profit", "loi nhuan", "lai"] },
  "margin": { domain: "finance", label: "Margin", type: "measure", aliases: ["margin", "bien loi nhuan"] },
  "expense": { domain: "finance", label: "Expense", type: "measure", aliases: ["expense", "chi tieu", "chi phi phat sinh"] },
  "budget": { domain: "finance", label: "Budget", type: "measure", aliases: ["budget", "ngan sach", "han muc"] },
  "purchase_cost": { domain: "finance", label: "Purchase Cost", type: "measure", aliases: ["purchase cost", "gia mua", "chi phi mua hang"] },
  "operational_cost": { domain: "finance", label: "Operational Cost", type: "measure", aliases: ["operational cost", "opex", "chi phi hoat dong"] },
  "supplier_cost": { domain: "finance", label: "Supplier Cost", type: "measure", aliases: ["supplier cost", "chi phi nha cung cap"] },
  
  // Inventory
  "sku": { domain: "inventory", label: "SKU", type: "dimension", aliases: ["sku", "product code", "item code", "ma san pham", "ma hang"] },
  "product": { domain: "inventory", label: "Product", type: "dimension", aliases: ["product", "item", "san pham", "mat hang"] },
  "inventory": { domain: "inventory", label: "Inventory", type: "measure", aliases: ["inventory", "stock", "ton kho", "so luong ton"] },
  "supplier": { domain: "inventory", label: "Supplier", type: "dimension", aliases: ["supplier", "vendor", "nha cung cap"] },
  "stock_movement": { domain: "inventory", label: "Stock Movement", type: "measure", aliases: ["stock movement", "inbound", "outbound", "nhap xuat", "luan chuyen kho"] },
  "stock_qty": { domain: "inventory", label: "Stock Quantity", type: "measure", aliases: ["stock qty", "quantity", "so luong ton", "sl ton"] },
  "stock_age": { domain: "inventory", label: "Stock Age", type: "measure", aliases: ["stock age", "aging", "tuoi ton kho", "thoi gian ton"] },
  "inbound": { domain: "inventory", label: "Inbound", type: "measure", aliases: ["inbound", "receipt", "nhap kho", "hang nhap"] },
  "outbound": { domain: "inventory", label: "Outbound", type: "measure", aliases: ["outbound", "issue", "xuat kho", "hang xuat"] },
  "replenishment": { domain: "inventory", label: "Replenishment", type: "measure", aliases: ["replenishment", "restock", "bo sung hang", "nhap them"] },
  "stock_status": { domain: "inventory", label: "Inventory Status", type: "dimension", aliases: ["stock status", "trang thai ton kho"] },
  
  // Core / Generic
  "time_period": { domain: "core", label: "Time Period", type: "time", aliases: ["period", "month", "fiscal period"] },
  "status": { domain: "core", label: "Status", type: "dimension", aliases: ["status", "trang thai"] },
  
  // Customer
  "segment": { domain: "customer", label: "Segment", type: "dimension", aliases: ["segment", "phan khuc", "nhom khach hang"] },
  "retention": { domain: "customer", label: "Retention", type: "measure", aliases: ["retention", "giu chan", "ty le giu chan"] },
  "satisfaction": { domain: "customer", label: "Satisfaction", type: "measure", aliases: ["satisfaction", "nps", "rating", "danh gia", "hai long"] },
  "order_count": { domain: "customer", label: "Order Count", type: "measure", aliases: ["order count", "number of orders", "so luong don", "tong so don"] },
  "last_purchase": { domain: "customer", label: "Last Purchase", type: "time", aliases: ["last purchase", "recency", "mua hang lan cuoi", "lan cuoi mua"] },
  "contribution": { domain: "customer", label: "Contribution", type: "measure", aliases: ["contribution", "ltv", "dong gop", "gia tri khach hang"] },
  "purchase_behavior": { domain: "customer", label: "Purchase Behavior", type: "dimension", aliases: ["purchase behavior", "behavior", "hanh vi mua hang"] },
  
  // Performance
  "target": { domain: "performance", label: "Target", type: "measure", aliases: ["target", "goal", "muc tieu", "chi tieu"] },
  "achievement": { domain: "performance", label: "Achievement", type: "measure", aliases: ["achievement", "actual", "thuc te", "dat duoc"] },
  "utilization": { domain: "performance", label: "Utilization", type: "measure", aliases: ["utilization", "capacity", "su dung", "hieu suat"] },
  "productivity": { domain: "performance", label: "Productivity", type: "measure", aliases: ["productivity", "nang suat"] },
  "kpi": { domain: "performance", label: "KPI", type: "dimension", aliases: ["kpi", "metric", "chi so", "chi so hieu suat"] },
  "actual": { domain: "performance", label: "Actual", type: "measure", aliases: ["actual", "thuc te"] },
  "department": { domain: "performance", label: "Department", type: "dimension", aliases: ["department", "team", "phong ban", "bo phan"] },
  "efficiency": { domain: "performance", label: "Efficiency", type: "measure", aliases: ["efficiency", "hieu qua"] },
  "performance_gap": { domain: "performance", label: "Performance Gap", type: "measure", aliases: ["performance gap", "gap", "chenh lech", "khoang cach"] }
};

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
  overlayActions?: Array<{ physicalColumn: string, actionType: 'map_temporary' | 'keep_raw_unchanged' | 'ignore_mismatch', targetSignal?: string }>;
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
    }
  };
}
