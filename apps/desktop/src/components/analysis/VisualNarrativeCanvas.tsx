import type { DrillThroughPoint } from '../../lib/drill-through-export';
import type { ChartPreviewModel } from '../../lib/chart-preview-model';
import type { GovernedVisualizationPlanV1 } from '../../lib/visualization-planner';
import type { VisualNarrativeCompositionPlanV1, VisualNarrativeUnitV1 } from '../../lib/visual-narrative-composition';
import { combineVisualNarrativeModels } from '../../lib/visual-narrative-runtime';
import type { VisualizationRendererFamilyV1 } from '../../lib/visualization-renderer-registry';
import { ChartPreviewRenderer } from './ChartPreviewRenderer';

export type VisualNarrativeCanvasItemV1 = {
  id: string;
  label: string;
  chartModel: ChartPreviewModel;
  visualizationPlan?: GovernedVisualizationPlanV1 | null;
  onDrillThrough?: (point: DrillThroughPoint) => void;
};

const heightClass = (unit: VisualNarrativeUnitV1): string => {
  if (unit.heightIntent === 'tall') return 'h-[400px]';
  if (unit.heightIntent === 'standard') return 'h-[320px]';
  return 'h-[220px]';
};

const presentationFamily = (unit: VisualNarrativeUnitV1): VisualizationRendererFamilyV1 | null => {
  if (unit.presentation === 'combo_bar_line') return 'combo_bar_line';
  if (unit.presentation === 'grouped_compare') return 'grouped_bar';
  return null;
};function materializedUnit(
  unit: VisualNarrativeUnitV1,
  byId: Map<string, VisualNarrativeCanvasItemV1>,
): { item: VisualNarrativeCanvasItemV1; model: ChartPreviewModel; family: VisualizationRendererFamilyV1 | null } | null {
  const members = unit.candidateIds.map(id => byId.get(id)).filter((item): item is VisualNarrativeCanvasItemV1 => Boolean(item));
  if (members.length === 0) return null;
  if (unit.presentation === 'single' || members.length < 2) {
    return { item: members[0], model: members[0].chartModel, family: null };
  }
  const combined = combineVisualNarrativeModels(
    { id: members[0].id, label: members[0].label, chartModel: members[0].chartModel },
    { id: members[1].id, label: members[1].label, chartModel: members[1].chartModel },
    unit.presentation,
  );
  if (!combined) {
    const fallback = members.find(member => member.id === unit.candidateIds[0]) ?? members[0];
    return { item: fallback, model: fallback.chartModel, family: null };
  }
  return { item: members[0], model: combined, family: presentationFamily(unit) };
}

const unitTitle = (unit: VisualNarrativeUnitV1, members: VisualNarrativeCanvasItemV1[]): string => {
  if (unit.presentation !== 'single' && members.length > 1) return members.map(item => item.label).join(' + ');
  return members[0]?.label ?? '';
};export const VisualNarrativeCanvas: React.FC<{
  plan: VisualNarrativeCompositionPlanV1;
  items: VisualNarrativeCanvasItemV1[];
}> = ({ plan, items }) => {
  const byId = new Map(items.map(item => [item.id, item] as const));
  const units = plan.units.flatMap(unit => {
    const materialized = materializedUnit(unit, byId);
    if (!materialized) return [];
    const members = unit.candidateIds.map(id => byId.get(id)).filter((item): item is VisualNarrativeCanvasItemV1 => Boolean(item));
    return [{ unit, members, ...materialized }];
  });
  const hero = units.find(entry => entry.unit.primaryAnchor) ?? units[0];
  const supporting = units.filter(entry => entry !== hero);
  if (!hero) return null;

  const renderUnit = (entry: typeof hero, supportingUnit = false) => (
    <article
      key={entry.unit.id}
      data-testid={supportingUnit ? 'supporting-analysis-chart' : 'visual-narrative-primary'}
      data-story-role={entry.unit.storyRole}
      data-presentation={entry.unit.presentation}
      className={supportingUnit ? 'min-w-0 rounded-[16px] border border-black/10 bg-white p-3' : 'min-w-0 rounded-[18px] border border-black/10 bg-white p-3'}
    >
      {supportingUnit && <h4 className="mb-2 text-[12px] font-semibold text-[#202123]">{unitTitle(entry.unit, entry.members)}</h4>}
      <ChartPreviewRenderer
        model={entry.model}
        visualizationPlan={entry.item.visualizationPlan ?? null}
        rendererFamilyOverride={entry.family}
        heightClassName={heightClass(entry.unit)}
        onDrillThrough={entry.item.onDrillThrough}
      />
    </article>
  );
  return (
    <div data-testid="visual-narrative-canvas" data-layout-count={plan.layoutCount} data-layout-mode={plan.layoutMode} className="space-y-4">
      {renderUnit(hero)}
      {supporting.length > 0 && (
        <div data-testid="perspective-analysis-bundle" data-visual-narrative-support-grid="true" className="grid gap-4 lg:grid-cols-2">
          {supporting.map(entry => renderUnit(entry, true))}
        </div>
      )}
    </div>
  );
};
