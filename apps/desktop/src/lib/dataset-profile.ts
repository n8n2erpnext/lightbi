export type DomainCandidate = 
  | "logistics" 
  | "retail_sales" 
  | "inventory_product" 
  | "inventory_snapshot"
  | "management_performance" 
  | "generic";

export interface DatasetProfile {
  primaryDomain: DomainCandidate;
  documentType: string;
  confidence: number;
  recommendedSafeActions: string[];
  dateRange: { min: string, max: string } | null;
  features: {
    hasTime: boolean;
    hasLocations: boolean;
    hasFinancials: boolean;
    hasQuantities: boolean;
  };
}

const normalize = (s: string) => s.toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/đ/g, "d").replace(/Đ/g, "D")
  .replace(/[^a-z0-9\s]/g, "");

function matchAny(cols: string[], keywords: string[]): boolean {
  return cols.some(col => {
    const normCol = normalize(col);
    return keywords.some(k => normCol.includes(normalize(k)));
  });
}

function parseSafeDate(val: any): Date | null {
  if (!val) return null;
  // If it's an Excel numeric date (typically > 30000 for recent years, < 100000)
  if (typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)))) {
    const num = Number(val);
    // Excel date (days since 1900-01-01)
    if (num > 30000 && num < 70000) {
      // rough approximation for 1980 - 2090
      const d = new Date(Math.round((num - 25569) * 86400 * 1000));
      return isNaN(d.getTime()) ? null : d;
    }
    // If it's a small number, it's definitely not a date string like "2024-01-01"
    // Also avoid standard timestamp milliseconds because it might just be a random integer
    return null; 
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    const vietnameseDateTime = trimmed.match(/^(?:(\d{1,2}):(\d{2})\s+)?(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (vietnameseDateTime) {
      const [, hour = '0', minute = '0', day, month, year] = vietnameseDateTime;
      const d = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
      return isNaN(d.getTime()) ? null : d;
    }
  }
  
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  
  // If year is 1970, it's probably a parsed number error 
  if (d.getFullYear() === 1970) return null;

  return d;
}

export function buildDatasetProfile(columns: string[], rows: any[]): DatasetProfile {
  const isLogistics = matchAny(columns, ["route", "tuyến xe", "driver", "lái xe", "shipment", "chuyến xe", "vehicle", "biển số xe"]);
  const isRetail = matchAny(columns, ["doanh thu", "revenue", "sales", "order", "đơn hàng", "khách hàng", "customer", "phieu xuat", "phieuxuat"]);
  const isInventory = matchAny(columns, ["sku", "plu", "tồn", "ton", "kho", "stock", "inventory", "barcode", "mã hàng"]);
  const isInventorySnapshot = matchAny(columns, ["ngưỡng tồn", "thời gian tồn", "bưu cục hiện tại", "tình trạng tải", "mã phiếu gửi"]);
  const isManagement = matchAny(columns, ["nhân viên", "nhan vien", "kpi", "chấm công", "cham cong", "attendance", "employee", "staff", "quản lý", "quan ly"]);

  let domain: DomainCandidate = "generic";
  let documentType = "Generic Dataset";
  let confidence = 0.5;
  let recommendedSafeActions = ["table_preview", "summary"];

  // Priority heuristics
  if (isInventorySnapshot) {
    domain = "inventory_snapshot";
    documentType = "Inventory Aging / Stock Snapshot";
    confidence = 0.9;
    recommendedSafeActions = ["table_preview", "summary", "group_by", "distribution"];
  } else if (isRetail) {
    domain = "retail_sales";
    documentType = "Retail / Sales Document";
    confidence = 0.8;
    recommendedSafeActions = ["table_preview", "summary", "trend"];
  } else if (isInventory) {
    domain = "inventory_product";
    documentType = "Inventory / Product Master";
    confidence = 0.8;
    recommendedSafeActions = ["table_preview", "summary", "distribution"];
  } else if (isLogistics) {
    domain = "logistics";
    documentType = "Logistics / Shipping Record";
    confidence = 0.9;
    recommendedSafeActions = ["table_preview", "summary", "distribution"];
  } else if (isManagement) {
    domain = "management_performance";
    documentType = "Management / Performance Report";
    confidence = 0.7;
    recommendedSafeActions = ["table_preview", "summary", "group_by"];
  }

  // Identify features
  const hasTime = matchAny(columns, ["date", "time", "ngay", "ngày", "thoi gian", "thời gian", "created", "updated"]);
  const hasLocations = matchAny(columns, ["branch", "buu cuc", "bưu cục", "don vi", "đơn vị", "kho", "store", "cửa hàng"]);
  const hasFinancials = matchAny(columns, ["price", "gia", "giá", "doanh thu", "revenue", "amount", "thành tiền", "thanh tien", "tiền thu hộ", "tong cuoc", "tổng cước", "khai giá", "cuoc", "cước"]);
  const hasQuantities = matchAny(columns, ["qty", "quantity", "so luong", "số lượng", "weight", "trong luong", "trọng lượng", "khối lượng", "khoi luong"]);

  if (hasTime && !recommendedSafeActions.includes("trend")) {
    recommendedSafeActions.push("trend");
  }

  // Attempt to parse dates if time column exists
  let dateRange: { min: string, max: string } | null = null;
  if (hasTime) {
    const dateCol = columns.find(col => matchAny([col], ["date", "time", "ngay", "ngày", "thoi gian", "thời gian", "created", "updated"]));
    if (dateCol) {
      const dates = rows.map(r => parseSafeDate(r[dateCol])).filter(Boolean) as Date[];
      if (dates.length > 0) {
        const min = new Date(Math.min(...dates.map(d => d.getTime())));
        const max = new Date(Math.max(...dates.map(d => d.getTime())));
        dateRange = {
          min: min.toLocaleDateString(),
          max: max.toLocaleDateString()
        };
      }
    }
  }

  return {
    primaryDomain: domain,
    documentType,
    confidence,
    recommendedSafeActions,
    dateRange,
    features: {
      hasTime,
      hasLocations,
      hasFinancials,
      hasQuantities
    }
  };
}
