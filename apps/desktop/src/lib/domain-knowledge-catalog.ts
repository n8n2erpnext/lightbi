export type DomainId =
  | "operations"
  | "revenue"
  | "inventory"
  | "customer"
  | "performance"
  | "finance";

export type BusinessConceptDefinition = {
  id: string;
  label: string;
  aliases: string[];
  canonicalSignal: string;
};

export type QuestionIntentDefinition = {
  id: string;
  label: string;
  description: string;
  requiredSignals: string[];
  optionalSignals: string[];
  questionTemplates: string[];
};

export type BusinessViewDefinition = {
  id: string;
  label: string;
  perspective: DomainId;
  description: string;
  requiredSignals: string[];
  optionalSignals: string[];
  minimumRequiredMatches: number;
  intentIds: string[];
  examples: string[];
};

export type DomainCatalogDefinition = {
  id: DomainId;
  label: string;
  purpose: string;
  concepts: BusinessConceptDefinition[];
  intentFamilies: QuestionIntentDefinition[];
  businessViews: BusinessViewDefinition[];
};

export const DOMAIN_KNOWLEDGE_CATALOG_V1: DomainCatalogDefinition[] = [
  {
    id: "operations",
    label: "Operations Domain",
    purpose: "Analyze operational performance, logistics, and supply chain execution.",
    concepts: [
      { id: "op_driver", label: "Driver", aliases: ["tài xế", "nhân viên giao hàng"], canonicalSignal: "driver" },
      { id: "op_route", label: "Route", aliases: ["tuyến đường"], canonicalSignal: "route" },
      { id: "op_shipment", label: "Shipment", aliases: ["đơn hàng giao"], canonicalSignal: "shipment" },
      { id: "op_delivery_status", label: "Delivery Status", aliases: ["trạng thái giao hàng"], canonicalSignal: "delivery_status" },
      { id: "op_sla", label: "SLA", aliases: ["cam kết dịch vụ"], canonicalSignal: "sla" },
      { id: "op_warehouse", label: "Warehouse", aliases: ["kho"], canonicalSignal: "warehouse" },
      { id: "op_delay", label: "Delay", aliases: ["chậm trễ"], canonicalSignal: "delay" },
      { id: "op_vehicle", label: "Vehicle", aliases: ["xe"], canonicalSignal: "vehicle" }
    ],
    intentFamilies: [
      {
        id: "intent_delay_analysis",
        label: "Delay Analysis",
        description: "Analyze where and why delays occur.",
        requiredSignals: ["delay", "route"],
        optionalSignals: ["driver", "delivery_status"],
        questionTemplates: ["Which routes create the most delays?"]
      },
      {
        id: "intent_sla_analysis",
        label: "SLA Analysis",
        description: "Analyze SLA compliance and breaches.",
        requiredSignals: ["sla"],
        optionalSignals: ["route", "driver"],
        questionTemplates: ["Where are SLA breaches occurring?"]
      },
      {
        id: "intent_route_performance",
        label: "Route Performance",
        description: "Analyze the efficiency of delivery routes.",
        requiredSignals: ["route", "delivery_status"],
        optionalSignals: ["delay"],
        questionTemplates: ["Which delivery statuses occur most often?"]
      },
      {
        id: "intent_driver_performance",
        label: "Driver Performance",
        description: "Analyze execution quality of drivers.",
        requiredSignals: ["driver", "sla"],
        optionalSignals: ["delivery_status"],
        questionTemplates: ["Which drivers need attention?"]
      },
      {
        id: "intent_warehouse_flow",
        label: "Warehouse Flow",
        description: "Analyze efficiency of warehouse operations.",
        requiredSignals: ["warehouse", "shipment"],
        optionalSignals: ["delivery_status"],
        questionTemplates: ["Which warehouse step slows down delivery?"]
      },
      {
        id: "intent_logistics_journey",
        label: "Logistics Journey",
        description: "Analyze the full delivery lifecycle.",
        requiredSignals: ["driver", "route", "delivery_status"],
        optionalSignals: ["sla"],
        questionTemplates: ["How does delivery performance change over time?"]
      }
    ],
    businessViews: [
      {
        id: "logistics_journey",
        label: "Logistics Journey",
        perspective: "operations",
        description: "Analyze the full delivery lifecycle.",
        requiredSignals: ["driver", "route", "delivery_status"],
        optionalSignals: ["warehouse", "shipment"],
        minimumRequiredMatches: 3,
        intentIds: ["intent_logistics_journey", "intent_delay_analysis"],
        examples: []
      },
      {
        id: "driver_performance",
        label: "Driver Performance",
        perspective: "operations",
        description: "Analyze driver execution quality.",
        requiredSignals: ["driver", "sla"],
        optionalSignals: ["delivery_status"],
        minimumRequiredMatches: 2,
        intentIds: ["intent_driver_performance"],
        examples: []
      },
      {
        id: "delivery_sla",
        label: "Delivery SLA",
        perspective: "operations",
        description: "Analyze delivery delays and SLA compliance.",
        requiredSignals: ["sla", "route"],
        optionalSignals: ["driver"],
        minimumRequiredMatches: 2,
        intentIds: ["intent_sla_analysis"],
        examples: []
      },
      {
        id: "route_performance",
        label: "Route Performance",
        perspective: "operations",
        description: "Analyze route efficiency.",
        requiredSignals: ["route", "delivery_status"],
        optionalSignals: ["driver", "warehouse"],
        minimumRequiredMatches: 2,
        intentIds: ["intent_route_performance"],
        examples: []
      },
      {
        id: "warehouse_flow",
        label: "Warehouse Flow",
        perspective: "operations",
        description: "Analyze warehouse dispatch efficiency.",
        requiredSignals: ["warehouse", "shipment"],
        optionalSignals: ["delivery_status"],
        minimumRequiredMatches: 2,
        intentIds: ["intent_warehouse_flow"],
        examples: []
      }
    ]
  },
  {
    id: "revenue",
    label: "Revenue Domain",
    purpose: "Analyze sales, revenue generation, and product performance.",
    concepts: [
      { id: "rev_revenue", label: "Revenue", aliases: ["doanh thu"], canonicalSignal: "revenue" },
      { id: "rev_sales", label: "Sales", aliases: ["bán hàng"], canonicalSignal: "sales" },
      { id: "rev_order", label: "Order", aliases: ["đơn hàng"], canonicalSignal: "order" },
      { id: "rev_branch", label: "Branch", aliases: ["chi nhánh"], canonicalSignal: "branch" },
      { id: "rev_salesperson", label: "Salesperson", aliases: ["nhân viên bán hàng"], canonicalSignal: "salesperson" },
      { id: "rev_discount", label: "Discount", aliases: ["chiết khấu"], canonicalSignal: "discount" },
      { id: "rev_product", label: "Product", aliases: ["sản phẩm"], canonicalSignal: "product" },
      { id: "rev_customer", label: "Customer", aliases: ["khách hàng"], canonicalSignal: "customer" }
    ],
    intentFamilies: [
      {
        id: "intent_revenue_trend",
        label: "Revenue Trend",
        description: "Analyze revenue growth over time.",
        requiredSignals: ["revenue"],
        optionalSignals: ["order"],
        questionTemplates: ["How has revenue changed over time?"]
      },
      {
        id: "intent_revenue_ranking",
        label: "Revenue Ranking",
        description: "Rank entities by revenue.",
        requiredSignals: ["revenue"],
        optionalSignals: ["product"],
        questionTemplates: ["Which products generate the highest revenue?"]
      },
      {
        id: "intent_branch_performance",
        label: "Branch Performance",
        description: "Analyze branch revenue performance.",
        requiredSignals: ["revenue", "branch"],
        optionalSignals: ["order"],
        questionTemplates: ["Which branches generate the most revenue?"]
      },
      {
        id: "intent_salesperson_performance",
        label: "Salesperson Performance",
        description: "Analyze sales representative performance.",
        requiredSignals: ["revenue", "salesperson"],
        optionalSignals: ["order", "discount"],
        questionTemplates: ["Which salespeople contribute the most revenue?"]
      },
      {
        id: "intent_discount_impact",
        label: "Discount Impact",
        description: "Analyze how discounts affect revenue.",
        requiredSignals: ["revenue", "discount"],
        optionalSignals: ["order"],
        questionTemplates: ["How do discounts affect revenue?"]
      },
      {
        id: "intent_order_performance",
        label: "Order Performance",
        description: "Analyze order contribution to revenue.",
        requiredSignals: ["revenue", "order"],
        optionalSignals: [],
        questionTemplates: ["Which orders contribute most to revenue?"]
      }
    ],
    businessViews: [
      {
        id: "revenue_performance",
        label: "Revenue Performance",
        perspective: "revenue",
        description: "Analyze top-line growth and generation.",
        requiredSignals: ["revenue", "order"],
        optionalSignals: ["discount"],
        minimumRequiredMatches: 2,
        intentIds: ["intent_revenue_trend", "intent_revenue_ranking"],
        examples: []
      },
      {
        id: "revenue_trend",
        label: "Revenue Trend",
        perspective: "revenue",
        description: "Analyze revenue growth over time.",
        requiredSignals: ["revenue"],
        optionalSignals: ["order"],
        minimumRequiredMatches: 1,
        intentIds: ["intent_revenue_trend"],
        examples: []
      },
      {
        id: "branch_performance",
        label: "Branch Performance",
        perspective: "revenue",
        description: "Analyze branch revenue performance.",
        requiredSignals: ["revenue", "branch"],
        optionalSignals: ["order"],
        minimumRequiredMatches: 2,
        intentIds: ["intent_branch_performance"],
        examples: []
      },
      {
        id: "salesperson_performance",
        label: "Salesperson Performance",
        perspective: "revenue",
        description: "Analyze sales representative performance.",
        requiredSignals: ["revenue", "salesperson"],
        optionalSignals: ["order", "discount"],
        minimumRequiredMatches: 2,
        intentIds: ["intent_salesperson_performance"],
        examples: []
      },
      {
        id: "discount_impact",
        label: "Discount Impact",
        perspective: "revenue",
        description: "Analyze how discounts affect revenue.",
        requiredSignals: ["revenue", "discount"],
        optionalSignals: ["order"],
        minimumRequiredMatches: 2,
        intentIds: ["intent_discount_impact"],
        examples: []
      },
      {
        id: "order_performance",
        label: "Order Performance",
        perspective: "revenue",
        description: "Analyze order contribution to revenue.",
        requiredSignals: ["revenue", "order"],
        optionalSignals: [],
        minimumRequiredMatches: 2,
        intentIds: ["intent_order_performance"],
        examples: []
      }
    ]
  },
  {
    id: "inventory",
    label: "Inventory Domain",
    purpose: "Analyze stock levels, movement, and warehouse health.",
    concepts: [
      { id: "inv_sku", label: "SKU", aliases: ["mã hàng"], canonicalSignal: "sku" },
      { id: "inv_product", label: "Product", aliases: ["sản phẩm"], canonicalSignal: "product" },
      { id: "inv_inventory", label: "Inventory", aliases: ["tồn kho"], canonicalSignal: "inventory" },
      { id: "inv_stock_qty", label: "Stock Quantity", aliases: ["số lượng tồn"], canonicalSignal: "stock_qty" },
      { id: "inv_warehouse", label: "Warehouse", aliases: ["kho"], canonicalSignal: "warehouse" },
      { id: "inv_stock_movement", label: "Stock Movement", aliases: ["luân chuyển kho"], canonicalSignal: "stock_movement" },
      { id: "inv_inbound", label: "Inbound", aliases: ["nhập kho"], canonicalSignal: "inbound" },
      { id: "inv_outbound", label: "Outbound", aliases: ["xuất kho"], canonicalSignal: "outbound" },
      { id: "inv_supplier", label: "Supplier", aliases: ["nhà cung cấp"], canonicalSignal: "supplier" },
      { id: "inv_replenishment", label: "Replenishment", aliases: ["bổ sung hàng"], canonicalSignal: "replenishment" },
      { id: "inv_stock_age", label: "Stock Age", aliases: ["tuổi tồn kho"], canonicalSignal: "stock_age" }
    ],
    intentFamilies: [
      {
        id: "intent_inventory_health",
        label: "Inventory Health",
        description: "Analyze stockouts and overstocks.",
        requiredSignals: ["inventory", "sku"],
        optionalSignals: ["stock_movement"],
        questionTemplates: ["Which products are at risk of stock-out?", "Which products are overstocked?"]
      },
      {
        id: "intent_inventory_aging",
        label: "Inventory Aging",
        description: "Analyze aging stock.",
        requiredSignals: ["inventory", "sku"],
        optionalSignals: ["warehouse", "stock_age"],
        questionTemplates: ["Which warehouses hold the most aging stock?"]
      },
      {
        id: "intent_stock_movement",
        label: "Stock Movement",
        description: "Analyze stock velocity.",
        requiredSignals: ["sku", "stock_movement"],
        optionalSignals: ["warehouse"],
        questionTemplates: ["Which SKUs move fastest?"]
      },
      {
        id: "intent_replenishment_risk",
        label: "Replenishment Risk",
        description: "Identify products needing replenishment.",
        requiredSignals: ["inventory", "replenishment"],
        optionalSignals: ["sku"],
        questionTemplates: ["Which products need replenishment?"]
      },
      {
        id: "intent_supplier_inventory",
        label: "Supplier Inventory",
        description: "Analyze stock availability per supplier.",
        requiredSignals: ["inventory", "supplier"],
        optionalSignals: ["sku"],
        questionTemplates: ["Which suppliers affect stock availability?"]
      },
      {
        id: "intent_product_performance",
        label: "Product Performance",
        description: "Analyze slow moving products.",
        requiredSignals: ["product", "stock_movement"],
        optionalSignals: ["inventory"],
        questionTemplates: ["Which products have slow movement?"]
      }
    ],
    businessViews: [
      {
        id: "inventory_health",
        label: "Inventory Health",
        perspective: "inventory",
        description: "Analyze stockouts and overstocks.",
        requiredSignals: ["inventory", "stock_movement"],
        optionalSignals: ["sku"],
        minimumRequiredMatches: 2,
        intentIds: ["intent_inventory_health"],
        examples: []
      },
      {
        id: "inventory_aging",
        label: "Inventory Aging",
        perspective: "inventory",
        description: "Analyze aging stock.",
        requiredSignals: ["sku", "inventory"],
        optionalSignals: ["warehouse"],
        minimumRequiredMatches: 2,
        intentIds: ["intent_inventory_aging"],
        examples: []
      },
      {
        id: "stock_movement",
        label: "Stock Movement",
        perspective: "inventory",
        description: "Analyze stock velocity.",
        requiredSignals: ["sku", "stock_movement"],
        optionalSignals: ["warehouse"],
        minimumRequiredMatches: 2,
        intentIds: ["intent_stock_movement"],
        examples: []
      },
      {
        id: "replenishment_risk",
        label: "Replenishment Risk",
        perspective: "inventory",
        description: "Identify products needing replenishment.",
        requiredSignals: ["inventory", "replenishment"],
        optionalSignals: ["sku"],
        minimumRequiredMatches: 2,
        intentIds: ["intent_replenishment_risk"],
        examples: []
      },
      {
        id: "supplier_inventory_analysis",
        label: "Supplier Inventory Analysis",
        perspective: "inventory",
        description: "Analyze stock availability per supplier.",
        requiredSignals: ["inventory", "supplier"],
        optionalSignals: ["sku"],
        minimumRequiredMatches: 2,
        intentIds: ["intent_supplier_inventory"],
        examples: []
      },
      {
        id: "product_performance",
        label: "Product Performance",
        perspective: "inventory",
        description: "Analyze slow moving products.",
        requiredSignals: ["product", "stock_movement"],
        optionalSignals: ["inventory"],
        minimumRequiredMatches: 2,
        intentIds: ["intent_product_performance"],
        examples: []
      }
    ]
  },
  {
    id: "customer",
    label: "Customer Domain",
    purpose: "Analyze customer behavior, segmentation, and retention.",
    concepts: [
      { id: "cus_customer", label: "Customer", aliases: ["khách hàng"], canonicalSignal: "customer" },
      { id: "cus_segment", label: "Segment", aliases: ["phân khúc"], canonicalSignal: "segment" },
      { id: "cus_order_count", label: "Order Count", aliases: ["số lượng đơn"], canonicalSignal: "order_count" },
      { id: "cus_revenue", label: "Revenue", aliases: ["doanh thu"], canonicalSignal: "revenue" },
      { id: "cus_retention", label: "Retention", aliases: ["giữ chân"], canonicalSignal: "retention" },
      { id: "cus_last_purchase", label: "Last Purchase", aliases: ["mua hàng lần cuối"], canonicalSignal: "last_purchase" },
      { id: "cus_contribution", label: "Contribution", aliases: ["đóng góp"], canonicalSignal: "contribution" },
      { id: "cus_purchase_behavior", label: "Purchase Behavior", aliases: ["hành vi mua hàng"], canonicalSignal: "purchase_behavior" }
    ],
    intentFamilies: [
      {
        id: "intent_customer_segmentation",
        label: "Customer Segmentation",
        description: "Analyze customer segments.",
        requiredSignals: ["customer", "segment"],
        optionalSignals: ["revenue"],
        questionTemplates: ["Which customer segments generate the most revenue?", "How are customers distributed by segment?"]
      },
      {
        id: "intent_customer_contribution",
        label: "Customer Contribution",
        description: "Analyze customer revenue contribution.",
        requiredSignals: ["customer", "revenue"],
        optionalSignals: ["segment"],
        questionTemplates: ["Which customers contribute the most revenue?"]
      },
      {
        id: "intent_customer_retention",
        label: "Customer Retention",
        description: "Analyze churn and retention.",
        requiredSignals: ["customer", "retention"],
        optionalSignals: ["segment"],
        questionTemplates: ["Which customers may be at risk of churn?"]
      },
      {
        id: "intent_purchase_behavior",
        label: "Purchase Behavior",
        description: "Analyze purchasing patterns.",
        requiredSignals: ["customer", "purchase_behavior"],
        optionalSignals: ["order_count"],
        questionTemplates: ["Which customers buy most frequently?", "Which products are commonly bought by key customers?"]
      }
    ],
    businessViews: [
      {
        id: "customer_segmentation",
        label: "Customer Segmentation",
        perspective: "customer",
        description: "Analyze cohort behavior and segment value.",
        requiredSignals: ["customer", "segment"],
        optionalSignals: ["revenue"],
        minimumRequiredMatches: 2,
        intentIds: ["intent_customer_segmentation"],
        examples: []
      },
      {
        id: "customer_contribution",
        label: "Customer Contribution",
        perspective: "customer",
        description: "Analyze top contributing customers.",
        requiredSignals: ["customer", "revenue"],
        optionalSignals: ["segment"],
        minimumRequiredMatches: 2,
        intentIds: ["intent_customer_contribution"],
        examples: []
      },
      {
        id: "customer_retention",
        label: "Customer Retention",
        perspective: "customer",
        description: "Analyze customer churn.",
        requiredSignals: ["customer", "retention"],
        optionalSignals: ["segment"],
        minimumRequiredMatches: 2,
        intentIds: ["intent_customer_retention"],
        examples: []
      },
      {
        id: "purchase_behavior",
        label: "Purchase Behavior",
        perspective: "customer",
        description: "Analyze purchasing habits.",
        requiredSignals: ["customer", "purchase_behavior"],
        optionalSignals: ["order_count"],
        minimumRequiredMatches: 2,
        intentIds: ["intent_purchase_behavior"],
        examples: []
      }
    ]
  },
  {
    id: "performance",
    label: "Performance Domain",
    purpose: "Analyze KPIs, target achievements, and operational efficiency.",
    concepts: [
      { id: "perf_kpi", label: "KPI", aliases: ["chỉ số"], canonicalSignal: "kpi" },
      { id: "perf_target", label: "Target", aliases: ["mục tiêu"], canonicalSignal: "target" },
      { id: "perf_actual", label: "Actual", aliases: ["thực tế"], canonicalSignal: "actual" },
      { id: "perf_achievement", label: "Achievement", aliases: ["đạt được"], canonicalSignal: "achievement" },
      { id: "perf_productivity", label: "Productivity", aliases: ["năng suất"], canonicalSignal: "productivity" },
      { id: "perf_utilization", label: "Utilization", aliases: ["sử dụng"], canonicalSignal: "utilization" },
      { id: "perf_department", label: "Department", aliases: ["phòng ban"], canonicalSignal: "department" },
      { id: "perf_efficiency", label: "Efficiency", aliases: ["hiệu quả"], canonicalSignal: "efficiency" },
      { id: "perf_performance_gap", label: "Performance Gap", aliases: ["chênh lệch"], canonicalSignal: "performance_gap" }
    ],
    intentFamilies: [
      {
        id: "intent_target_achievement",
        label: "Target Achievement",
        description: "Analyze actuals vs goals.",
        requiredSignals: ["target", "achievement"],
        optionalSignals: ["productivity"],
        questionTemplates: ["Which teams exceed their targets?", "Which teams are below target?", "How has achievement changed over time?"]
      },
      {
        id: "intent_kpi_monitoring",
        label: "KPI Monitoring",
        description: "Monitor critical indicators.",
        requiredSignals: ["kpi"],
        optionalSignals: ["target"],
        questionTemplates: ["Which KPIs need attention?"]
      },
      {
        id: "intent_efficiency_analysis",
        label: "Efficiency Analysis",
        description: "Analyze operational efficiency.",
        requiredSignals: ["productivity", "efficiency"],
        optionalSignals: ["utilization"],
        questionTemplates: ["Where are performance gaps concentrated?"]
      },
      {
        id: "intent_operational_performance",
        label: "Operational Performance",
        description: "Analyze general operational performance.",
        requiredSignals: ["target", "achievement"],
        optionalSignals: ["utilization"],
        questionTemplates: []
      },
      {
        id: "intent_department_performance",
        label: "Department Performance",
        description: "Compare departments.",
        requiredSignals: ["department", "kpi"],
        optionalSignals: ["target"],
        questionTemplates: ["Which departments perform best?"]
      }
    ],
    businessViews: [
      {
        id: "target_achievement",
        label: "Target Achievement",
        perspective: "performance",
        description: "Analyze actuals vs goals.",
        requiredSignals: ["target", "achievement"],
        optionalSignals: ["productivity"],
        minimumRequiredMatches: 2,
        intentIds: ["intent_target_achievement"],
        examples: []
      },
      {
        id: "kpi_monitoring",
        label: "KPI Monitoring",
        perspective: "performance",
        description: "Monitor primary indicators.",
        requiredSignals: ["kpi", "actual"],
        optionalSignals: ["target"],
        minimumRequiredMatches: 2,
        intentIds: ["intent_kpi_monitoring"],
        examples: []
      },
      {
        id: "efficiency_analysis",
        label: "Efficiency Analysis",
        perspective: "performance",
        description: "Analyze productivity and utilization.",
        requiredSignals: ["productivity", "utilization"],
        optionalSignals: ["efficiency"],
        minimumRequiredMatches: 2,
        intentIds: ["intent_efficiency_analysis"],
        examples: []
      },
      {
        id: "operational_performance",
        label: "Operational Performance",
        perspective: "performance",
        description: "Analyze operational results.",
        requiredSignals: ["target", "achievement"],
        optionalSignals: ["utilization"],
        minimumRequiredMatches: 2,
        intentIds: ["intent_operational_performance"],
        examples: []
      },
      {
        id: "department_performance",
        label: "Department Performance",
        perspective: "performance",
        description: "Analyze departmental efficiency.",
        requiredSignals: ["department", "achievement"],
        optionalSignals: ["target"],
        minimumRequiredMatches: 2,
        intentIds: ["intent_department_performance"],
        examples: []
      }
    ]
  },
  {
    id: "finance",
    label: "Finance Domain",
    purpose: "Analyze profitability, margins, and expenses.",
    concepts: [
      { id: "fin_revenue", label: "Revenue", aliases: ["doanh thu"], canonicalSignal: "revenue" },
      { id: "fin_cost", label: "Cost", aliases: ["chi phí"], canonicalSignal: "cost" },
      { id: "fin_profit", label: "Profit", aliases: ["lợi nhuận"], canonicalSignal: "profit" },
      { id: "fin_margin", label: "Margin", aliases: ["biên lợi nhuận"], canonicalSignal: "margin" },
      { id: "fin_expense", label: "Expense", aliases: ["chi tiêu"], canonicalSignal: "expense" },
      { id: "fin_discount", label: "Discount", aliases: ["chiết khấu"], canonicalSignal: "discount" },
      { id: "fin_purchase_cost", label: "Purchase Cost", aliases: ["giá mua"], canonicalSignal: "purchase_cost" },
      { id: "fin_operational_cost", label: "Operational Cost", aliases: ["chi phí hoạt động"], canonicalSignal: "operational_cost" },
      { id: "fin_supplier_cost", label: "Supplier Cost", aliases: ["chi phí nhà cung cấp"], canonicalSignal: "supplier_cost" }
    ],
    intentFamilies: [
      {
        id: "intent_profitability_analysis",
        label: "Profitability Analysis",
        description: "Analyze profit drivers.",
        requiredSignals: ["profit", "revenue"],
        optionalSignals: ["cost"],
        questionTemplates: ["Which products generate the highest estimated profit?"]
      },
      {
        id: "intent_margin_analysis",
        label: "Margin Analysis",
        description: "Analyze gross and net margins.",
        requiredSignals: ["margin", "revenue"],
        optionalSignals: ["cost"],
        questionTemplates: ["Which high-revenue products may have weak margins?", "How do discounts affect margin?"]
      },
      {
        id: "intent_cost_impact",
        label: "Cost Impact",
        description: "Analyze how costs affect performance.",
        requiredSignals: ["cost", "profit"],
        optionalSignals: ["revenue"],
        questionTemplates: ["Where do costs reduce business performance?"]
      },
      {
        id: "intent_expense_review",
        label: "Expense Review",
        description: "Review business expenses.",
        requiredSignals: ["expense"],
        optionalSignals: ["cost"],
        questionTemplates: ["Which expenses need attention?"]
      },
      {
        id: "intent_supplier_cost_analysis",
        label: "Supplier Cost Analysis",
        description: "Analyze supplier expenses.",
        requiredSignals: ["supplier_cost"],
        optionalSignals: ["cost"],
        questionTemplates: ["Which suppliers affect profit the most?"]
      }
    ],
    businessViews: [
      {
        id: "profitability_analysis",
        label: "Profitability Analysis",
        perspective: "finance",
        description: "Analyze profit drivers.",
        requiredSignals: ["profit", "revenue"],
        optionalSignals: ["cost"],
        minimumRequiredMatches: 2,
        intentIds: ["intent_profitability_analysis"],
        examples: []
      },
      {
        id: "margin_analysis",
        label: "Margin Analysis",
        perspective: "finance",
        description: "Analyze gross and net margins.",
        requiredSignals: ["margin", "revenue"],
        optionalSignals: ["cost"],
        minimumRequiredMatches: 2,
        intentIds: ["intent_margin_analysis"],
        examples: []
      },
      {
        id: "cost_impact",
        label: "Cost Impact",
        perspective: "finance",
        description: "Analyze how costs affect performance.",
        requiredSignals: ["cost", "profit"],
        optionalSignals: ["revenue"],
        minimumRequiredMatches: 2,
        intentIds: ["intent_cost_impact"],
        examples: []
      },
      {
        id: "expense_review",
        label: "Expense Review",
        perspective: "finance",
        description: "Review business expenses.",
        requiredSignals: ["expense", "cost"],
        optionalSignals: [],
        minimumRequiredMatches: 2,
        intentIds: ["intent_expense_review"],
        examples: []
      },
      {
        id: "supplier_cost_analysis",
        label: "Supplier Cost Analysis",
        perspective: "finance",
        description: "Analyze supplier expenses.",
        requiredSignals: ["supplier_cost", "cost"],
        optionalSignals: [],
        minimumRequiredMatches: 2,
        intentIds: ["intent_supplier_cost_analysis"],
        examples: []
      }
    ]
  }
];

export function getDomainCatalog(domainId: DomainId): DomainCatalogDefinition | undefined {
  return DOMAIN_KNOWLEDGE_CATALOG_V1.find(d => d.id === domainId);
}

export function listDomainCatalogs(): DomainCatalogDefinition[] {
  return DOMAIN_KNOWLEDGE_CATALOG_V1;
}

export function listBusinessViewsByDomain(domainId: DomainId): BusinessViewDefinition[] {
  const catalog = getDomainCatalog(domainId);
  return catalog ? catalog.businessViews : [];
}

export function findBusinessViewDefinition(viewId: string): BusinessViewDefinition | undefined {
  for (const domain of DOMAIN_KNOWLEDGE_CATALOG_V1) {
    const view = domain.businessViews.find(v => v.id === viewId);
    if (view) return view;
  }
  return undefined;
}

export function listQuestionIntentsByBusinessView(viewId: string): QuestionIntentDefinition[] {
  for (const domain of DOMAIN_KNOWLEDGE_CATALOG_V1) {
    const view = domain.businessViews.find(v => v.id === viewId);
    if (view) {
      return domain.intentFamilies.filter(intent => view.intentIds.includes(intent.id));
    }
  }
  return [];
}

export function listSignalsForDomain(domainId: DomainId): string[] {
  const catalog = getDomainCatalog(domainId);
  if (!catalog) return [];
  return catalog.concepts.map(c => c.canonicalSignal);
}
