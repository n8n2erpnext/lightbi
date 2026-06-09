import type { SemanticTag } from './semantic-tag-registry';
import type { SemanticField, SemanticMapping } from './semantic-fields';

export interface QuestionTemplate {
  id: string;
  template: string; // The UI string, e.g., "Which {driver}s miss {delivery_status} most often?"
  requiredTags: SemanticTag[];
  valueTags?: SemanticTag[]; // Tags whose topValues we should iterate over
}

export interface QuestionSuggestion {
  id: string;
  label: string; // The UI representation showing the question type
  question: string; // The fully interpolated question string
  requiredFields: SemanticField[];
  confidence: number;
}

const TEMPLATES: QuestionTemplate[] = [
  // Value-interpolated Logistics Templates
  {
    id: "logistics_route_performance_specific",
    template: "What is the {delivery_status_val} rate by {route}?",
    requiredTags: ["route", "delivery_status"],
    valueTags: ["delivery_status"]
  },
  {
    id: "logistics_driver_sla_specific",
    template: "Which {driver} has the highest {delivery_status_val} rate?",
    requiredTags: ["driver", "delivery_status"],
    valueTags: ["delivery_status"]
  },
  {
    id: "logistics_trend_specific",
    template: "How does {delivery_status_val} change over {report_date}?",
    requiredTags: ["report_date", "delivery_status"],
    valueTags: ["delivery_status"]
  },
  // English fallbacks
  {
    id: "logistics_route_performance",
    template: "Which {route}s have the highest failure rate?",
    requiredTags: ["route", "delivery_status"]
  },
  {
    id: "logistics_driver_sla",
    template: "Which {driver}s miss SLA most often?",
    requiredTags: ["driver", "delivery_status"]
  },
  {
    id: "logistics_performance_over_time",
    template: "How does delivery performance change over time?",
    requiredTags: ["report_date", "delivery_status"]
  },
  {
    id: "sales_top_customers",
    template: "Which {customer}s generate the most {revenue}?",
    requiredTags: ["customer", "revenue"]
  },
  {
    id: "sales_product_performance",
    template: "What are the top selling {product}s by {revenue}?",
    requiredTags: ["product", "revenue"]
  },
  {
    id: "sales_trend",
    template: "How has {revenue} changed over time?",
    requiredTags: ["revenue", "report_date"]
  },
  {
    id: "inventory_warehouse",
    template: "What is the {quantity} distribution across {warehouse}s?",
    requiredTags: ["quantity", "warehouse"]
  },
  {
    id: "hr_attendance_trend",
    template: "How does {attendance_status} vary over time?",
    requiredTags: ["attendance_status", "report_date"]
  },
  {
    id: "generic_trend",
    template: "How does {generic_amount} change over time?",
    requiredTags: ["generic_amount", "report_date"]
  },
  {
    id: "generic_breakdown",
    template: "What is the breakdown of {generic_amount} by {generic_name}?",
    requiredTags: ["generic_amount", "generic_name"]
  }
];

const MIN_CONFIDENCE_THRESHOLD = 0.5;

export function generateQuestionSuggestions(mapping: SemanticMapping): QuestionSuggestion[] {
  const suggestions: QuestionSuggestion[] = [];

  for (const template of TEMPLATES) {
    const matchedFields: SemanticField[] = [];
    let templateConfidence = 1.0;
    let isValid = true;
    let baseInterpolated = template.template;

    for (const reqTag of template.requiredTags) {
      // Find the best field for this tag
      const fields = mapping.filter(f => f.semanticTag === reqTag && f.confidence >= MIN_CONFIDENCE_THRESHOLD);
      if (fields.length === 0) {
        isValid = false;
        break;
      }
      
      // Sort by confidence descending
      fields.sort((a, b) => b.confidence - a.confidence);
      const bestField = fields[0];
      
      matchedFields.push(bestField);
      templateConfidence *= bestField.confidence; // Joint probability
      
      // Interpolate the template with the exact column name
      baseInterpolated = baseInterpolated.replace(`{${reqTag}}`, bestField.name);
    }

    if (!isValid || matchedFields.length !== template.requiredTags.length) continue;

    // Expand value tags if they exist
    if (template.valueTags && template.valueTags.length > 0) {
      const vTag = template.valueTags[0];
      const fieldWithValue = matchedFields.find(f => f.semanticTag === vTag);
      
      if (fieldWithValue && fieldWithValue.topValues && fieldWithValue.topValues.length > 0) {
        // Generate a question for the top 2 values to avoid spamming
        const valuesToExpand = fieldWithValue.topValues.slice(0, 2);
        
        for (const val of valuesToExpand) {
          const finalQ = baseInterpolated.replace(`{${vTag}_val}`, val);
          suggestions.push({
            id: `${template.id}_${val}`,
            label: template.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            question: finalQ,
            requiredFields: matchedFields,
            confidence: Number((templateConfidence * 100).toFixed(1))
          });
        }
      }
    } else {
      suggestions.push({
        id: template.id,
        label: template.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        question: baseInterpolated,
        requiredFields: matchedFields,
        confidence: Number((templateConfidence * 100).toFixed(1))
      });
    }
  }

  // Sort suggestions by confidence, then ensure uniqueness by question
  const uniqueSuggestions = Array.from(new Map(suggestions.map(s => [s.question, s])).values());
  return uniqueSuggestions.sort((a, b) => b.confidence - a.confidence);
}
