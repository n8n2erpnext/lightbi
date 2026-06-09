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

const TAXONOMY: Record<string, { domain: string, label: string, aliases: string[] }> = {
  // Operations
  "driver": { domain: "operations", label: "Driver", aliases: ["driver", "courier", "shipper", "tai xe", "nhan vien giao hang"] },
  "route": { domain: "operations", label: "Route", aliases: ["route", "zone", "region", "tuyen xe", "khu vuc phat"] },
  "shipment": { domain: "operations", label: "Shipment", aliases: ["shipment", "package", "parcel", "don hang", "kien hang"] },
  "delivery_status": { domain: "operations", label: "Delivery Status", aliases: ["delivery status", "status", "trang thai", "trang thai giao hang"] },
  "sla": { domain: "operations", label: "SLA", aliases: ["sla", "deadline", "promise date", "thoi han", "han chot"] },
  "warehouse": { domain: "operations", label: "Warehouse", aliases: ["warehouse", "hub", "depot", "kho", "kho hang"] },
  
  // Revenue
  "customer": { domain: "customer", label: "Customer", aliases: ["customer", "client", "buyer", "khach hang", "nguoi mua"] },
  "order": { domain: "revenue", label: "Order", aliases: ["order", "purchase", "don mua", "don hang"] },
  "revenue": { domain: "revenue", label: "Revenue", aliases: ["revenue", "sales", "doanh thu", "doanh so"] },
  "margin": { domain: "revenue", label: "Margin", aliases: ["margin", "profit", "loi nhuan"] },
  "discount": { domain: "revenue", label: "Discount", aliases: ["discount", "giam gia", "chiet khau"] },
  
  // Inventory
  "sku": { domain: "inventory", label: "SKU", aliases: ["sku", "product code", "item code", "ma san pham", "ma hang"] },
  "product": { domain: "inventory", label: "Product", aliases: ["product", "item", "san pham", "mat hang"] },
  "inventory": { domain: "inventory", label: "Inventory", aliases: ["inventory", "stock", "ton kho", "so luong ton"] },
  "supplier": { domain: "inventory", label: "Supplier", aliases: ["supplier", "vendor", "nha cung cap"] },
  "stock_movement": { domain: "inventory", label: "Stock Movement", aliases: ["stock movement", "inbound", "outbound", "nhap xuat"] },
  
  // Customer
  "segment": { domain: "customer", label: "Segment", aliases: ["segment", "phan khuc", "nhom khach hang"] },
  "retention": { domain: "customer", label: "Retention", aliases: ["retention", "giu chan"] },
  "satisfaction": { domain: "customer", label: "Satisfaction", aliases: ["satisfaction", "nps", "rating", "danh gia", "hai long"] },
  
  // Performance
  "target": { domain: "performance", label: "Target", aliases: ["target", "goal", "muc tieu", "chi tieu"] },
  "achievement": { domain: "performance", label: "Achievement", aliases: ["achievement", "actual", "thuc te", "dat duoc"] },
  "utilization": { domain: "performance", label: "Utilization", aliases: ["utilization", "capacity", "su dung", "hieu suat"] },
  "productivity": { domain: "performance", label: "Productivity", aliases: ["productivity", "nang suat"] }
};

export interface DetectorInput {
  columns: Array<{ name: string, type?: string }>;
  semanticTags?: Record<string, string>; // mapping from column name to semantic tag
}

export function detectBusinessSignals(input: DetectorInput): BusinessSignalRegistry {
  const candidates: BusinessSignalCandidate[] = [];

  // 1. Generate Candidates
  for (const col of input.columns) {
    const normalizedCol = normalizeString(col.name);
    
    // Attempt to match taxonomy
    for (const [canonicalId, info] of Object.entries(TAXONOMY)) {
      let isMatch = false;
      let breakdown: EvidenceBreakdown = {
        columnAliasMatch: 0,
        semanticTagMatch: 0,
        relationshipSupport: 0,
        profileSupport: 0
      };

      // Check column alias match
      if (info.aliases.includes(normalizedCol)) {
        breakdown.columnAliasMatch = 40;
        isMatch = true;
      }
      
      // Check semantic tag match if provided
      if (input.semanticTags && input.semanticTags[col.name]) {
        const normTag = normalizeString(input.semanticTags[col.name]);
        if (normTag === canonicalId || info.aliases.includes(normTag)) {
           breakdown.semanticTagMatch = 30;
           isMatch = true;
        }
      }
      
      // We assume basic profile support if the type exists and makes sense, but mock 10 for now if matched
      if (isMatch && col.type) {
        breakdown.profileSupport = 10;
      }
      
      if (isMatch) {
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
    }
  };
}
