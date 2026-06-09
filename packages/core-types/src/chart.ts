export type ChartType = 
  | 'Number'
  | 'Bar'
  | 'Line'
  | 'Row'
  | 'Pie'
  | 'Donut'
  | 'Table'
  | 'Funnel'
  | 'Bubble';

export interface ChartAxisMapping {
  columnName: string;
  aggregation?: 'Sum' | 'Average' | 'Min' | 'Max' | 'Count' | 'None';
  label?: string;
}

export interface ChartFormattingOptions {
  showLegend?: boolean;
  colorPalette?: string[];
  [key: string]: any;
}

export interface Chart {
  id: string;
  projectId: string;
  datasetId: string;
  name: string;
  type: ChartType;
  xAxis?: ChartAxisMapping[];
  yAxis?: ChartAxisMapping[];
  filters?: Record<string, any>;
  formatting: ChartFormattingOptions;
  createdAt: string;
  updatedAt: string;
}
