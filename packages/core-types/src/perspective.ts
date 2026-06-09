import type { ChartType } from './chart';

export type PerspectiveRole = 
  | 'CEO'
  | 'Sales'
  | 'Inventory'
  | 'Marketing'
  | 'Security'
  | 'Research'
  | 'General';

export interface PerspectiveMetric {
  id: string;
  name: string;
  description: string;
  expressionHint: string; // e.g. "SUM(revenue)"
}

export interface PerspectiveDimension {
  id: string;
  name: string;
  columnHint: string; // e.g. "date_created"
}

export interface PerspectiveQuestion {
  id: string;
  questionId: string; // References UserQuestion.id
  contextualOverrides: Record<string, any>;
}

export interface PerspectiveChartSuggestion {
  chartType: ChartType;
  priority: number;
}

export interface Perspective {
  id: string;
  role: PerspectiveRole;
  name: string;
  description: string;
  vocabulary: Record<string, string>; // e.g. { "deal": "opportunities" }
  recommendedMetrics: PerspectiveMetric[];
  recommendedDimensions: PerspectiveDimension[];
  recommendedQuestions: PerspectiveQuestion[];
  recommendedCharts: PerspectiveChartSuggestion[];
  createdAt: string;
  updatedAt: string;
}
