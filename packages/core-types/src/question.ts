import type { ChartType } from './chart';

export type QuestionCategory = 
  | 'RevenueAnalysis'
  | 'TargetVsActual'
  | 'InventoryAnalysis'
  | 'TrendAnalysis'
  | 'SurveyAnalysis'
  | 'LogAnalysis'
  | 'MarketingPerformance'
  | 'CustomAnalysis';

export interface UserQuestion {
  id: string;
  title: string;
  description?: string;
  category: QuestionCategory;
  suggestedRecipeTypes: string[]; // e.g. "Join", "Filter", "Aggregate"
  suggestedChartTypes: ChartType[];
}

export interface QuestionTemplate {
  id: string;
  title: string;
  category: QuestionCategory;
  description: string;
  recommendedSources: string[];
  recommendedRecipeOperations: string[];
  recommendedChartTypes: ChartType[];
  suggestedQuestions: string[];
}
