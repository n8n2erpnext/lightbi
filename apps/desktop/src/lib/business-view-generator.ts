import type { RelationshipGraph, RelationshipEdge } from './relationship-graph';
import { findConnectedComponents } from './relationship-graph';
import type { DatasetFamily } from './batch-inspection';

export type BusinessDomain =
  | "product"
  | "order"
  | "customer"
  | "supplier"
  | "inventory"
  | "logistics"
  | "finance"
  | "operations"
  | "unknown";

export type BusinessViewType =
  | "product_performance"
  | "profitability"
  | "inventory_health"
  | "logistics_journey"
  | "sales_performance"
  | "supplier_performance"
  | "customer_analysis"
  | "operations_overview";

export type BusinessViewStatus =
  | "suggested"
  | "confirmed"
  | "ignored"
  | "rejected";

export type QuestionSuggestion = {
  id: string;
  question: string;
  intent: "rank" | "compare" | "trend" | "diagnose" | "risk" | "summary";
  requiredDomains: BusinessDomain[];
  explanation: string;
};

export type BusinessViewEvidence = {
  type: "domain" | "dataset" | "relationship" | "field" | "coverage";
  score: number;
  message: string;
};

export type BusinessViewCandidate = {
  id: string;
  type: BusinessViewType;
  title: string;
  description: string;
  status: BusinessViewStatus;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  score: number;
  datasets: string[];
  domains: BusinessDomain[];
  coreDomains?: BusinessDomain[];
  supportingRelationshipIds: string[];
  relationshipIds?: string[];
  evidence: BusinessViewEvidence[];
  suggestedQuestions: QuestionSuggestion[];
};

export function detectBusinessDomains(
  _datasetId: string,
  columns: string[],
  _graphEdges: RelationshipEdge[]
): BusinessDomain[] {
  const domains = new Set<BusinessDomain>();
  
  const text = columns.join(" ").toLowerCase();
  
  if (text.match(/product|sku|item|item_code|product_id|product_code|mã hàng|ma hang|hàng hóa|hang hoa/)) domains.add("product");
  if (text.match(/order|sales_order|so|invoice|bill|receipt|đơn hàng|don hang|hóa đơn|hoa don/)) domains.add("order");
  if (text.match(/customer|client|buyer|phone|email|khách hàng|khach hang/)) domains.add("customer");
  if (text.match(/supplier|vendor|purchase|nhà cung cấp|nha cung cap/)) domains.add("supplier");
  if (text.match(/stock|inventory|warehouse|qty|quantity|tồn kho|ton kho|kho/)) domains.add("inventory");
  if (text.match(/shipment|delivery|driver|route|vehicle|truck|receiving|outbound|giao hàng|giao hang|tài xế|tai xe|tuyến|tuyen/)) domains.add("logistics");
  if (text.match(/revenue|cost|profit|margin|discount|expense|amount|total|doanh thu|chi phí|chi phi|lợi nhuận|loi nhuan/)) domains.add("finance");
  if (text.match(/status|process|stage|duration|delay|late|sla|workflow/)) domains.add("operations");

  if (domains.size === 0) {
    domains.add("unknown");
  }

  return Array.from(domains);
}

export function generateSuggestedQuestions(
  type: BusinessViewType,
  _domains: BusinessDomain[]
): QuestionSuggestion[] {
  switch (type) {
    case "product_performance":
      return [
        { id: "q_prod_1", question: "Which products generate the highest revenue?", intent: "rank", requiredDomains: ["product", "finance"], explanation: "Ranks products by sales value." },
        { id: "q_prod_2", question: "Which products sell well but may have low margin?", intent: "diagnose", requiredDomains: ["product", "finance"], explanation: "Identifies high-volume, low-profit items." },
        { id: "q_prod_3", question: "Which products have inventory risk?", intent: "risk", requiredDomains: ["product", "inventory"], explanation: "Checks stock levels against sales." },
        { id: "q_prod_4", question: "Which products should we prioritize next?", intent: "summary", requiredDomains: ["product"], explanation: "Summarizes product performance." }
      ];
    case "profitability":
      return [
        { id: "q_prof_1", question: "Which products generate the highest estimated profit?", intent: "rank", requiredDomains: ["finance", "product"], explanation: "Estimates profit by product." },
        { id: "q_prof_2", question: "Which high-revenue products may have weak margins?", intent: "diagnose", requiredDomains: ["finance", "product"], explanation: "Highlights margin issues." },
        { id: "q_prof_3", question: "Where do costs reduce business performance?", intent: "diagnose", requiredDomains: ["finance"], explanation: "Identifies major cost centers." },
        { id: "q_prof_4", question: "Which supplier or product group affects profit the most?", intent: "compare", requiredDomains: ["finance", "supplier"], explanation: "Links profit to supply chain." }
      ];
    case "inventory_health":
      return [
        { id: "q_inv_1", question: "Which products are at risk of stock-out?", intent: "risk", requiredDomains: ["inventory", "product"], explanation: "Highlights low stock items." },
        { id: "q_inv_2", question: "Which products have high stock but low sales?", intent: "risk", requiredDomains: ["inventory", "order"], explanation: "Identifies dead stock." },
        { id: "q_inv_3", question: "Which warehouse or item group needs attention?", intent: "diagnose", requiredDomains: ["inventory"], explanation: "Summarizes inventory locations." },
        { id: "q_inv_4", question: "Which products may need replenishment?", intent: "summary", requiredDomains: ["inventory", "product"], explanation: "Actionable restock list." }
      ];
    case "logistics_journey":
      return [
        { id: "q_log_1", question: "Which routes have the most delays?", intent: "rank", requiredDomains: ["logistics", "operations"], explanation: "Identifies slow delivery routes." },
        { id: "q_log_2", question: "Which warehouse step creates the most delay?", intent: "diagnose", requiredDomains: ["logistics", "operations"], explanation: "Finds bottlenecks." },
        { id: "q_log_3", question: "Which drivers or vehicles need attention?", intent: "compare", requiredDomains: ["logistics"], explanation: "Compares logistics entities." },
        { id: "q_log_4", question: "Where does the delivery journey slow down?", intent: "trend", requiredDomains: ["logistics", "operations"], explanation: "Maps journey stages." }
      ];
    case "sales_performance":
      return [
        { id: "q_sal_1", question: "Which products or customers drive the most sales?", intent: "rank", requiredDomains: ["order"], explanation: "Top sales drivers." },
        { id: "q_sal_2", question: "Which orders contribute most to revenue?", intent: "rank", requiredDomains: ["order", "finance"], explanation: "High value orders." },
        { id: "q_sal_3", question: "Where are sales trends improving or declining?", intent: "trend", requiredDomains: ["order"], explanation: "Sales over time." },
        { id: "q_sal_4", question: "Which customer groups should we focus on?", intent: "summary", requiredDomains: ["order", "customer"], explanation: "Actionable customer segments." }
      ];
    case "supplier_performance":
      return [
        { id: "q_sup_1", question: "Which suppliers support the highest-value products?", intent: "rank", requiredDomains: ["supplier", "product"], explanation: "Supplier value." },
        { id: "q_sup_2", question: "Which suppliers may affect margin or stock availability?", intent: "risk", requiredDomains: ["supplier", "finance"], explanation: "Supplier risk." },
        { id: "q_sup_3", question: "Which product groups depend on each supplier?", intent: "summary", requiredDomains: ["supplier", "product"], explanation: "Dependency mapping." },
        { id: "q_sup_4", question: "Where should purchasing be reviewed?", intent: "diagnose", requiredDomains: ["supplier"], explanation: "Purchasing efficiency." }
      ];
    case "customer_analysis":
      return [
        { id: "q_cus_1", question: "Which customers contribute the most revenue?", intent: "rank", requiredDomains: ["customer", "finance"], explanation: "Top customers." },
        { id: "q_cus_2", question: "Which customers buy the most frequently?", intent: "rank", requiredDomains: ["customer", "order"], explanation: "Loyalty analysis." },
        { id: "q_cus_3", question: "Which customer groups may need follow-up?", intent: "risk", requiredDomains: ["customer"], explanation: "Retention opportunities." },
        { id: "q_cus_4", question: "Which products are commonly bought by key customers?", intent: "summary", requiredDomains: ["customer", "product"], explanation: "Cross-sell potential." }
      ];
    case "operations_overview":
      return [
        { id: "q_ops_1", question: "Which process stage has the most issues?", intent: "diagnose", requiredDomains: ["operations"], explanation: "Process bottlenecks." },
        { id: "q_ops_2", question: "Where are delays or exceptions concentrated?", intent: "risk", requiredDomains: ["operations"], explanation: "Exception handling." },
        { id: "q_ops_3", question: "Which operational area needs attention first?", intent: "summary", requiredDomains: ["operations"], explanation: "Prioritization." },
        { id: "q_ops_4", question: "Which workflow status appears most often?", intent: "rank", requiredDomains: ["operations"], explanation: "Status distribution." }
      ];
    default:
      return [];
  }
}

export function generateBusinessViews(
  graph: RelationshipGraph,
  datasetsMap: Record<string, DatasetFamily>
): BusinessViewCandidate[] {
  const components = findConnectedComponents(graph);
  const views: BusinessViewCandidate[] = [];

  for (const comp of components) {
    const compDomains = new Set<BusinessDomain>();
    const datasetIds = comp.nodes.map(n => n.datasetId).sort();
    
    // Fallback: If no edges but datasets are isolated, we handle it if needed
    // But graph.nodes contains all nodes that have edges.
    
    for (const dId of datasetIds) {
      const dataset = datasetsMap[dId];
      if (dataset) {
        const dDomains = detectBusinessDomains(dId, dataset.columns, comp.edges);
        dDomains.forEach(d => compDomains.add(d));
      }
    }
    
    const addViewIfValid = (
      type: BusinessViewType,
      title: string,
      reqDomains: BusinessDomain[],
      altReqDomains: BusinessDomain[][]
    ) => {
      let isValid = reqDomains.every(d => compDomains.has(d));
      if (isValid && altReqDomains.length > 0) {
        isValid = altReqDomains.some(alt => alt.every(d => compDomains.has(d)));
      }

      if (isValid) {
        let score = 40;
        const evidence: BusinessViewEvidence[] = [];
        evidence.push({ type: "domain", score: 40, message: `Matched required domains for ${title}` });
        
        if (comp.nodes.length >= 2) {
          score += 20;
          evidence.push({ type: "dataset", score: 20, message: "Connected multiple datasets" });
        }
        
        const hasStrongRel = comp.edges.some(e => e.score >= 70);
        if (hasStrongRel) {
          score += 15;
          evidence.push({ type: "relationship", score: 15, message: "Contains at least one strong relationship" });
        }
        
        if (comp.edges.length >= 2) {
          score += 10;
          evidence.push({ type: "coverage", score: 10, message: "Contains multiple supporting relationships" });
        }
        
        if (["product_performance", "profitability", "sales_performance"].includes(type) && compDomains.has("finance")) {
          score += 10;
          evidence.push({ type: "domain", score: 10, message: "Includes finance signals" });
        }
        
        let mainRisk = "LOW";
        if (comp.edges.length > 0) {
          const hasHigh = comp.edges.some(e => e.risk === "HIGH");
          const hasMedium = comp.edges.some(e => e.risk === "MEDIUM");
          if (hasHigh) mainRisk = "HIGH";
          else if (hasMedium) mainRisk = "MEDIUM";
        }
        
        if (mainRisk === "LOW" || mainRisk === "MEDIUM") {
          score += 5;
          evidence.push({ type: "relationship", score: 5, message: `Relationship risk is acceptable (${mainRisk})` });
        }
        if (mainRisk === "HIGH") {
          score -= 15;
          evidence.push({ type: "relationship", score: -15, message: "High risk many-to-many relationship detected" });
        }
        
        score = Math.max(0, Math.min(100, score));
        
        let confidence: "LOW" | "MEDIUM" | "HIGH" = "LOW";
        if (score >= 85) confidence = "HIGH";
        else if (score >= 70) confidence = "MEDIUM";
        
        if (score >= 50) {
          views.push({
            id: `bv_${type}_${datasetIds.join("_")}`,
            type,
            title,
            description: `LightBI found ${Array.from(compDomains).filter(d => d !== 'unknown').join(', ')} signals connected across your files.`,
            status: "suggested",
            confidence,
            score,
            datasets: datasetIds,
            domains: Array.from(compDomains),
            supportingRelationshipIds: comp.edges.map(e => e.relationshipId),
            evidence,
            suggestedQuestions: generateSuggestedQuestions(type, Array.from(compDomains))
          });
        }
      }
    };
    
    addViewIfValid("product_performance", "Product Performance", ["product"], [["order"], ["inventory"], ["supplier"], ["finance"]]);
    addViewIfValid("profitability", "Profitability Analysis", ["finance"], [["product"], ["order"], ["supplier"]]);
    addViewIfValid("inventory_health", "Inventory Health", ["inventory"], [["product"], ["order"]]);
    addViewIfValid("logistics_journey", "Logistics Journey", ["logistics"], [["order"], ["operations"], ["inventory"]]);
    addViewIfValid("sales_performance", "Sales Performance", ["order"], [["customer"], ["product"], ["finance"]]);
    addViewIfValid("supplier_performance", "Supplier Performance", ["supplier"], [["product"], ["inventory"], ["finance"]]);
    addViewIfValid("customer_analysis", "Customer Analysis", ["customer"], [["order"], ["product"], ["finance"]]);
    addViewIfValid("operations_overview", "Operations Overview", ["operations"], [["logistics"], ["inventory"], ["order"]]);
  }

  const dedupMap = new Map<string, BusinessViewCandidate>();
  for (const v of views) {
    const existing = dedupMap.get(v.id);
    if (!existing || v.score > existing.score) {
      dedupMap.set(v.id, v);
    }
  }

  return Array.from(dedupMap.values());
}

export function summarizeBusinessView(view: BusinessViewCandidate): string {
  return `LightBI found a ${view.title} view because ${view.domains.join(", ")} data appear connected.`;
}

export function confirmBusinessView(view: BusinessViewCandidate): BusinessViewCandidate {
  return { ...view, status: "confirmed" };
}

export function ignoreBusinessView(view: BusinessViewCandidate): BusinessViewCandidate {
  return { ...view, status: "ignored" };
}

export function confirmRelationship(edge: RelationshipEdge): RelationshipEdge {
  return { ...edge, status: "confirmed" };
}

export function rejectRelationship(edge: RelationshipEdge): RelationshipEdge {
  return { ...edge, status: "rejected" };
}
