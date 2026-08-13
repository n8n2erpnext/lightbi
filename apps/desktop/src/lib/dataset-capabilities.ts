export type DatasetDomain =
  | "logistics_delivery"
  | "sales_revenue"
  | "inventory"
  | "hr_attendance"
  | "finance_accounting"
  | "education"
  | "support"
  | "generic";

export interface DatasetDomainResult {
  primaryDomain: DatasetDomain;
  score: number;
  matchedColumns: string[];
  suggestedActions: string[];
}

const DOMAIN_RULES: Record<Exclude<DatasetDomain, "generic">, { keywords: string[], actions: string[] }> = {
  logistics_delivery: {
    keywords: ["ngày báo cáo", "tuyến xe", "biên nhận", "thời gian", "tài xế", "giao nhận", "route", "driver", "delivery", "transit"],
    actions: ["Late delivery analysis", "Route performance", "Driver SLA", "On-time delivery"]
  },
  sales_revenue: {
    keywords: ["revenue", "sales", "doanh thu", "order", "customer", "khách hàng", "amount", "income"],
    actions: ["Find revenue opportunities", "Identify top revenue performers", "Review revenue performance", "Analyze revenue breakdown"]
  },
  inventory: {
    keywords: ["stock", "tồn kho", "sku", "warehouse", "kho", "inventory", "qty", "quantity"],
    actions: ["Discover stock movement", "Find slow moving items", "Analyze inventory value", "Review warehouse performance"]
  },
  hr_attendance: {
    keywords: ["employee", "nhân viên", "attendance", "chấm công", "leave", "nghỉ phép", "department", "staff"],
    actions: ["Review overtime patterns", "Analyze leave trends", "Compare department headcount"]
  },
  finance_accounting: {
    keywords: ["invoice", "receivable", "payable", "expense", "cash", "chi phí", "thu chi"],
    actions: ["Review revenue trend", "Find abnormal expenses", "Summarize cash flow"]
  },
  education: {
    keywords: ["student", "học sinh", "course", "khóa học", "grade", "điểm", "class"],
    actions: ["Analyze student performance", "Review attendance trends", "Compare class results"]
  },
  support: {
    keywords: ["ticket", "issue", "support", "resolution", "hỗ trợ"],
    actions: ["Review service requests", "Analyze resolution time", "Find overdue tickets"]
  }
};

export function detectDatasetDomain(columns: string[]): DatasetDomainResult {
  if (!columns || columns.length === 0) {
    return {
      primaryDomain: "generic",
      score: 0,
      matchedColumns: [],
      suggestedActions: ["Find generic opportunities", "Review performance", "Analyze breakdown"]
    };
  }

  let bestDomain: DatasetDomain = "generic";
  let maxScore = 0;
  let bestMatches: string[] = [];
  let bestActions: string[] = ["Find generic opportunities", "Review performance", "Analyze breakdown"];

  for (const [domain, rule] of Object.entries(DOMAIN_RULES)) {
    const matchedColumns = columns.filter(col => {
      const lowerCol = col.toLowerCase();
      return rule.keywords.some(keyword => lowerCol.includes(keyword));
    });

    const score = matchedColumns.length;
    if (score > maxScore) {
      maxScore = score;
      bestDomain = domain as DatasetDomain;
      bestMatches = matchedColumns;
      bestActions = rule.actions;
    }
  }

  return {
    primaryDomain: bestDomain,
    score: maxScore,
    matchedColumns: bestMatches,
    suggestedActions: bestActions
  };
}
