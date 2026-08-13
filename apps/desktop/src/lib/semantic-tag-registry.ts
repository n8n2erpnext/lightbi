export type FieldSemanticType =
  | "metric"
  | "dimension"
  | "time"
  | "status"
  | "identifier"
  | "unknown";

export type SemanticTag =
  | "route"
  | "driver"
  | "shipment"
  | "delivery_status"
  | "customer"
  | "product"
  | "branch"
  | "warehouse"
  | "employee"
  | "attendance_status"
  | "revenue"
  | "quantity"
  | "report_date"
  | "generic_id"
  | "generic_name"
  | "generic_amount"
  | "unknown";

export interface SemanticTagConfig {
  defaultType: FieldSemanticType;
  aliases: string[];
}

export const SEMANTIC_TAG_REGISTRY: Record<Exclude<SemanticTag, "unknown">, SemanticTagConfig> = {
  // Logistics
  route: {
    defaultType: "dimension",
    aliases: ["tuyến xe", "route", "delivery route", "transport route"]
  },
  driver: {
    defaultType: "dimension",
    aliases: ["tài xế", "tên lái xe", "lái xe", "driver", "shipper"]
  },
  shipment: {
    defaultType: "identifier",
    aliases: ["mã tài kiện", "biên nhận", "tracking id", "shipment id", "order id", "waybill", "bill of lading"]
  },
  delivery_status: {
    defaultType: "status",
    aliases: ["đánh giá", "kết quả", "trạng thái giao hàng", "delivery status", "status"]
  },

  // Sales / Retail
  customer: {
    defaultType: "dimension",
    aliases: ["khách hàng", "người mua", "customer", "client", "buyer"]
  },
  product: {
    defaultType: "dimension",
    aliases: ["sản phẩm", "mặt hàng", "product", "item", "sku"]
  },
  branch: {
    defaultType: "dimension",
    aliases: ["chi nhánh", "cửa hàng", "branch", "store", "location"]
  },
  revenue: {
    defaultType: "metric",
    aliases: ["doanh thu", "tiền", "thành tiền", "giá trị", "revenue", "sales", "amount", "income"]
  },
  quantity: {
    defaultType: "metric",
    aliases: ["số lượng", "sản lượng", "quantity", "qty", "count"]
  },

  // HR
  employee: {
    defaultType: "dimension",
    aliases: ["nhân viên", "người lao động", "employee", "staff", "worker"]
  },
  attendance_status: {
    defaultType: "status",
    aliases: ["chấm công", "trạng thái", "attendance", "leave", "nghỉ phép"]
  },

  // Inventory
  warehouse: {
    defaultType: "dimension",
    aliases: ["kho", "nhà kho", "warehouse", "storage"]
  },

  // Common
  report_date: {
    defaultType: "time",
    aliases: ["ngày báo cáo", "ngày", "thời gian", "date", "created_at", "timestamp", "month", "year"]
  },
  generic_id: {
    defaultType: "identifier",
    aliases: ["id", "mã", "code", "số", "no", "number"]
  },
  generic_name: {
    defaultType: "dimension",
    aliases: ["tên", "name", "title", "mô tả", "description"]
  },
  generic_amount: {
    defaultType: "metric",
    aliases: ["tổng", "total", "sum", "value", "giá"]
  }
};
