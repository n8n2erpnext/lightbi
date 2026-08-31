import { create } from 'zustand';
import type { ColumnProfile } from '../lib/column-profiler';
import type { CanonicalSourceBoundaryV1 } from '../lib/understanding-core/canonical-source-boundary';
import type { CanonicalUserOverlayV1 } from '../lib/understanding-core/canonical-user-overlay';

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
  canonicalSourceBoundary?: CanonicalSourceBoundaryV1;
  canonicalUserOverlay?: CanonicalUserOverlayV1;
  easyReturnDataset?: unknown;
  registeredAt: string;
};

type AdvancedSourceState = {
  sources: AdvancedWorkspaceSource[];
  activeSourceId: string | null;
  pendingEasyReturnSourceId: string | null;
  registerSource: (source: AdvancedWorkspaceSource, options?: { activate?: boolean }) => void;
  setActiveSource: (sourceId: string | null) => void;
  removeSource: (sourceId: string) => void;
  requestEasyReturn: (sourceId: string) => void;
  consumeEasyReturnDataset: () => unknown | null;
};

export const useAdvancedSourceStore = create<AdvancedSourceState>((set, get) => ({
  sources: [],
  activeSourceId: null,
  pendingEasyReturnSourceId: null,
  registerSource: (source, options) => set(state => ({
    sources: [source, ...state.sources.filter(item => item.id !== source.id)].slice(0, 12),
    activeSourceId: options?.activate === false ? state.activeSourceId : source.id,
  })),
  setActiveSource: activeSourceId => set({ activeSourceId }),
  removeSource: sourceId => set(state => ({
    sources: state.sources.filter(item => item.id !== sourceId),
    activeSourceId: state.activeSourceId === sourceId ? null : state.activeSourceId,
    pendingEasyReturnSourceId: state.pendingEasyReturnSourceId === sourceId ? null : state.pendingEasyReturnSourceId,
  })),
  requestEasyReturn: sourceId => set({ pendingEasyReturnSourceId: sourceId }),
  consumeEasyReturnDataset: () => {
    const sourceId = get().pendingEasyReturnSourceId;
    const dataset = sourceId ? get().sources.find(item => item.id === sourceId)?.easyReturnDataset ?? null : null;
    set({ pendingEasyReturnSourceId: null });
    return dataset;
  },
}));

export function advancedSourceId(sourceType: string, name: string): string {
  return `${sourceType}:${name}`.toLowerCase().replace(/[^a-z0-9:_-]+/g, '-');
}


export function activateAdvancedSourceForEasyDataset(dataset: { sourceType?: unknown; file_name?: unknown } | null | undefined): string | null {
  const sourceType = typeof dataset?.sourceType === 'string' ? dataset.sourceType : '';
  const sourceName = typeof dataset?.file_name === 'string' ? dataset.file_name : '';
  if (!sourceType || !sourceName) return null;
  const sourceId = advancedSourceId(sourceType, sourceName);
  if (!useAdvancedSourceStore.getState().sources.some(source => source.id === sourceId)) return null;
  useAdvancedSourceStore.getState().setActiveSource(sourceId);
  return sourceId;
}
