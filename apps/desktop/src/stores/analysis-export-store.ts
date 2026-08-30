import { create } from 'zustand';
import type { AnalysisWorkbookPlanV1 } from '../lib/analysis-workbook';

/**
 * Ephemeral navigation handoff for an already-governed analysis export plan.
 * This store is intentionally not persisted: it carries presentation/export
 * context, never business or entitlement authority.
 */
type AnalysisExportState = {
  plan: AnalysisWorkbookPlanV1 | null;
  setPlan: (plan: AnalysisWorkbookPlanV1) => void;
  clearPlan: () => void;
};

export const useAnalysisExportStore = create<AnalysisExportState>(set => ({
  plan: null,
  setPlan: plan => set({ plan }),
  clearPlan: () => set({ plan: null }),
}));
