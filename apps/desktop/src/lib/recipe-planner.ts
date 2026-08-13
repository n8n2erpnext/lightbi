
// We'll define FilterExpression here for now, or we can define it inline
export type FilterOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "not_in";

export type ASTFilterExpression = {
  field: string;
  op: FilterOp;
  value: string | number | boolean | Array<string | number | boolean>;
};

export type AnalyticalIntent =
  | {
      type: "distribution";
      measure: {
        operation: "count" | "sum" | "avg";
        field: string;
      };
      dimension: string;
      filters?: ASTFilterExpression[];
    }
  | {
      type: "trend";
      measure: {
        operation: "count" | "sum" | "avg";
        field: string;
      };
      timeField: string;
      timeGranularity: "day" | "week" | "month";
      filters?: ASTFilterExpression[];
    }
  | {
      type: "ranking";
      measure: {
        operation: "count" | "sum" | "avg";
        field: string;
      };
      dimension: string;
      limit: number;
      order: "asc" | "desc";
      filters?: ASTFilterExpression[];
    };

export interface RecipePlan {
  question: string;
  intent: AnalyticalIntent;
}

export function generateRecipePlan(question: string): RecipePlan {
  // Temporary heuristic parser for phase B preview.
  // In reality, this might be a sophisticated mapping or an LLM call on the backend,
  // but for the preview we map common patterns.

  const lowerQ = question.toLowerCase();

  // Basic filter extraction heuristic for demo purposes
  const filters: ASTFilterExpression[] = [];
  
  // E.g. "What is the Không đúng giờ rate by Tuyến xe?"
  // We can extract "Không đúng giờ" as a value.
  // This is a naive implementation just for the preview to show the structured plan.
  
  let intent: AnalyticalIntent = {
    type: "distribution",
    measure: {
      operation: "count",
      field: "Row"
    },
    dimension: "Category",
    filters: []
  };

  if (lowerQ.includes("rate by") || lowerQ.includes("rate per")) {
    const byParts = question.split(/by|per/i);
    const dimension = byParts[1]?.trim().replace('?', '') || "Unknown";
    
    // Extract filter value if quotes are used, or from capitalized words, etc.
    // E.g. "Không đúng giờ rate" -> "Không đúng giờ"
    const ratePart = byParts[0].replace(/What is the|What's the/i, '').trim();
    const filterValMatch = ratePart.match(/(.*)\s+rate/i);
    if (filterValMatch && filterValMatch[1]) {
      const val = filterValMatch[1].trim();
      filters.push({
        field: "Đánh giá", // Hardcoded for this demo, would be semantic mapping
        op: "eq",
        value: val
      });
      intent = {
        type: "distribution",
        measure: { operation: "count", field: "Đánh giá" }, // Usually count occurrences
        dimension: dimension,
        filters: filters
      };
    } else {
      intent = {
        type: "distribution",
        measure: { operation: "count", field: "Records" },
        dimension: dimension,
      };
    }
  } else if (lowerQ.includes("over time")) {
    intent = {
      type: "trend",
      measure: { operation: "sum", field: "Value" },
      timeField: "Date",
      timeGranularity: "month"
    };
  } else if (lowerQ.includes("top")) {
    intent = {
      type: "ranking",
      measure: { operation: "sum", field: "Metric" },
      dimension: "Category",
      limit: 10,
      order: "desc"
    };
  } else {
     intent = {
        type: "distribution",
        measure: { operation: "count", field: "Records" },
        dimension: "Category",
      };
  }

  return {
    question,
    intent
  };
}
