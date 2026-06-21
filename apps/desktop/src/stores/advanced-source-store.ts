import { create } from 'zustand';
import type { ColumnProfile } from '../lib/column-profiler';

export type AdvancedSourceTable = {
  id: string;
  name: string;
  rowCount: number;
  columns: string[];
  profiles: Record<string, ColumnProfile>;
  file: File;
  sheetName?: string;
};

export type AdvancedWorkspaceSource = {
  id: string;
  name: string;
  sourceType: string;
  sourceKind: 'local_file' | 'online_link';
  normalizedUrl?: string;
  tables: AdvancedSourceTable[];
  semanticSample?: { strategy: string; sourceRowCount: number; sampleRowCount: number };
  registeredAt: string;
};

type AdvancedSourceState = {
  sources: AdvancedWorkspaceSource[];
  activeSourceId: string | null;
  registerSource: (source: AdvancedWorkspaceSource) => void;
  setActiveSource: (sourceId: string | null) => void;
  removeSource: (sourceId: string) => void;
};

export const useAdvancedSourceStore = create<AdvancedSourceState>(set => ({
  sources: [],
  activeSourceId: null,
  registerSource: source => set(state => ({
    sources: [source, ...state.sources.filter(item => item.id !== source.id)].slice(0, 12),
    activeSourceId: source.id,
  })),
  setActiveSource: activeSourceId => set({ activeSourceId }),
  removeSource: sourceId => set(state => ({
    sources: state.sources.filter(item => item.id !== sourceId),
    activeSourceId: state.activeSourceId === sourceId ? null : state.activeSourceId,
  })),
}));

export function advancedSourceId(sourceType: string, name: string): string {
  return `${sourceType}:${name}`.toLowerCase().replace(/[^a-z0-9:_-]+/g, '-');
}
