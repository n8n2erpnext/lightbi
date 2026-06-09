import type { Project, Datasource, Dataset, Chart, Dashboard } from '@lightbi/core-types';

export interface WorkspacePreferences {
  theme: 'Light' | 'Dark' | 'System';
  sidebarCollapsed: boolean;
}

export interface AppRuntimeState {
  // Active Entities
  activeProjectId: string | null;
  activeDatasourceId: string | null;
  activeDatasetId: string | null;
  activeChartId: string | null;
  activeDashboardId: string | null;

  // Cached Domain Objects (Mock Data for Phase 3)
  projects: Record<string, Project>;
  datasources: Record<string, Datasource>;
  datasets: Record<string, Dataset>;
  charts: Record<string, Chart>;
  dashboards: Record<string, Dashboard>;

  // Workspace State
  workspacePreferences: WorkspacePreferences;
  currentRoute: string;
  selectedItems: string[];

  // Actions
  toggleSidebar: () => void;
  setCurrentRoute: (route: string) => void;
  
  // Loader Capabilities (Mock implementations)
  loadProject: (projectId: string) => void;
  setActiveProject: (projectId: string | null) => void;
  setActiveDashboard: (dashboardId: string | null) => void;
  setActiveChart: (chartId: string | null) => void;
  setActiveDataset: (datasetId: string | null) => void;
  setActiveDatasource: (datasourceId: string | null) => void;
}
