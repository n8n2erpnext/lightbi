import { create } from 'zustand';
import type { AppRuntimeState } from './types';
import type { Project, Datasource, Dataset, Chart, Dashboard } from '@lightbi/core-types';

// Mock Data
const mockProject: Project = {
  id: 'proj-1',
  name: 'Demo Project',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  datasources: [],
  datasets: [],
  charts: [],
  dashboards: []
};

const mockDashboards: Record<string, Dashboard> = {
  'dash-1': { id: 'dash-1', projectId: 'proj-1', name: 'Sales Overview', widgets: [], metadata: {}, createdAt: '', updatedAt: '' },
  'dash-2': { id: 'dash-2', projectId: 'proj-1', name: 'Inventory Status', widgets: [], metadata: {}, createdAt: '', updatedAt: '' }
};

const mockCharts: Record<string, Chart> = {
  'chart-1': { id: 'chart-1', projectId: 'proj-1', datasetId: 'ds-1', name: 'Revenue Trend', type: 'Line', formatting: {}, createdAt: '', updatedAt: '' },
  'chart-2': { id: 'chart-2', projectId: 'proj-1', datasetId: 'ds-2', name: 'Category Breakdown', type: 'Donut', formatting: {}, createdAt: '', updatedAt: '' }
};

const mockDatasets: Record<string, Dataset> = {
  'ds-1': { id: 'ds-1', projectId: 'proj-1', name: 'Sales Data', origin: { type: 'DatabaseTable', sourceId: 'src-1', reference: 'sales' }, columns: [], rowCount: 12500, metadata: {}, createdAt: '', updatedAt: '' },
  'ds-2': { id: 'ds-2', projectId: 'proj-1', name: 'Products', origin: { type: 'FileImport', sourceId: 'src-2', reference: 'products.csv' }, columns: [], rowCount: 430, metadata: {}, createdAt: '', updatedAt: '' }
};

const mockDatasources: Record<string, Datasource> = {
  'src-1': { id: 'src-1', projectId: 'proj-1', name: 'ERPNext Database', type: 'MariaDB', config: {}, status: 'Connected', createdAt: '', updatedAt: '' },
  'src-2': { id: 'src-2', projectId: 'proj-1', name: 'Inventory Export', type: 'CSV', config: {}, status: 'Disconnected', createdAt: '', updatedAt: '' }
};

export const useAppRuntime = create<AppRuntimeState>((set) => ({
  activeProjectId: null,
  activeDatasourceId: null,
  activeDatasetId: null,
  activeChartId: null,
  activeDashboardId: null,

  projects: { 'proj-1': mockProject },
  datasources: mockDatasources,
  datasets: mockDatasets,
  charts: mockCharts,
  dashboards: mockDashboards,

  workspacePreferences: {
    theme: 'Light',
    sidebarCollapsed: false,
  },
  currentRoute: '/',
  selectedItems: [],

  toggleSidebar: () => set((state) => ({
    workspacePreferences: { ...state.workspacePreferences, sidebarCollapsed: !state.workspacePreferences.sidebarCollapsed }
  })),

  setCurrentRoute: (route) => set({ currentRoute: route }),

  loadProject: (projectId) => {
    // Mock loading process
    set({ activeProjectId: projectId });
  },

  setActiveProject: (projectId) => set({ activeProjectId: projectId }),
  setActiveDashboard: (dashboardId) => set({ activeDashboardId: dashboardId }),
  setActiveChart: (chartId) => set({ activeChartId: chartId }),
  setActiveDataset: (datasetId) => set({ activeDatasetId: datasetId }),
  setActiveDatasource: (datasourceId) => set({ activeDatasourceId: datasourceId }),
}));
