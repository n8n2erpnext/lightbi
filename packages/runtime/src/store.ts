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

const mockDashboards: Record<string, Dashboard> = {};

const mockCharts: Record<string, Chart> = {};

const mockDatasets: Record<string, Dataset> = {};

const mockDatasources: Record<string, Datasource> = {};

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
  createDashboard: (name) => {
    const id = `dash-${Date.now()}`;
    const now = new Date().toISOString();
    set((state) => ({
      dashboards: {
        ...state.dashboards,
        [id]: {
          id,
          projectId: state.activeProjectId || 'proj-1',
          name: name.trim() || 'Untitled dashboard',
          widgets: [],
          metadata: {},
          createdAt: now,
          updatedAt: now,
        },
      },
      activeDashboardId: id,
    }));
    return id;
  },
  createChart: (chart) => {
    const id = `chart-${Date.now()}`;
    const now = new Date().toISOString();
    set((state) => ({
      charts: {
        ...state.charts,
        [id]: { ...chart, id, createdAt: now, updatedAt: now },
      },
      activeChartId: id,
    }));
    return id;
  },
  addChartToDashboard: (dashboardId, chartId) => set((state) => {
    const dashboard = state.dashboards[dashboardId];
    const chart = state.charts[chartId];
    if (!dashboard || !chart) return state;
    if (dashboard.widgets.some(widget => widget.type === 'Chart' && widget.referenceId === chartId)) {
      return { activeDashboardId: dashboardId };
    }
    const index = dashboard.widgets.length;
    const widget = {
      id: `widget-${Date.now()}-${index}`,
      type: 'Chart' as const,
      referenceId: chartId,
      layout: {
        x: (index % 2) * 10,
        y: Math.floor(index / 2) * 8,
        w: chart.type === 'Number' ? 5 : 10,
        h: chart.type === 'Number' ? 3 : 8,
      },
    };
    return {
      dashboards: {
        ...state.dashboards,
        [dashboardId]: {
          ...dashboard,
          widgets: [...dashboard.widgets, widget],
          updatedAt: new Date().toISOString(),
        },
      },
      activeDashboardId: dashboardId,
    };
  }),
}));
