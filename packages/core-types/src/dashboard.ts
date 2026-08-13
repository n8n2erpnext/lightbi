export interface DashboardWidget {
  id: string;
  type: 'Chart' | 'KPI' | 'Text' | 'Image' | 'WebEmbed';
  referenceId?: string; // e.g., Chart ID
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  config?: Record<string, any>;
}

export interface Dashboard {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  filters?: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
