import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createVisualNarrativeCompositionPlan,
  type VisualNarrativeCandidateV1,
} from './visual-narrative-composition';

function productionTsFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...productionTsFiles(full));
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.[jt]sx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

function candidate(overrides: Partial<VisualNarrativeCandidateV1> = {}): VisualNarrativeCandidateV1 {
  return {
    id: 'primary', isPrimary: true,
    managementQuestion: 'How is revenue changing?', storyRole: 'answer', analyticalIntent: 'trend',
    dimensionField: 'month', metricIds: ['sales_revenue'], unitFamily: 'currency', grainId: 'month',
    sourceScopeKey: 'dataset:revenue', evidenceBacked: true, evidenceRefs: ['governed:revenue'],
    decisionImportance: 100, visualizationPlanId: 'plan:revenue', rendererFamily: 'line', pointCount: 12,
    ...overrides,
  };
}

describe('CPR-0 chart-presentation actuation diagnostics', () => {
  it.fails('has a production runtime consumer for the official domain chart-set policy', () => {
    const srcRoot = path.resolve(process.cwd(), 'src');
    const definingFile = path.resolve(srcRoot, 'lib/domain-chart-sets.ts');
    const consumers = productionTsFiles(srcRoot)
      .filter(file => file !== definingFile)
      .filter(file => fs.readFileSync(file, 'utf8').includes("from './domain-chart-sets'"));
    expect(consumers, 'OFFICIAL_DOMAIN_CHART_SETS_V1 is currently knowledge without Product actuation').not.toHaveLength(0);
  });

  it.fails('lets official domain complements materially actuate a three-visual story when evidence is legal', () => {
    const plan = createVisualNarrativeCompositionPlan({ candidates: [
      candidate(),
      candidate({ id: 'driver', isPrimary: false, managementQuestion: 'Which products drive order volume?',
        storyRole: 'driver', analyticalIntent: 'ranking', dimensionField: 'product', metricIds: ['order_count'],
        unitFamily: 'count', decisionImportance: 90, officialComplementToPrimary: true, rendererFamily: 'row' }),
      candidate({ id: 'mix', isPrimary: false, managementQuestion: 'How is payment mix composed?',
        storyRole: 'composition', analyticalIntent: 'composition', dimensionField: 'payment_method', metricIds: ['payment_count'],
        unitFamily: 'count', decisionImportance: 80, officialComplementToPrimary: true, rendererFamily: 'donut' }),
    ] });
    expect(plan.layoutCount).toBe(3);
    expect(plan.units.flatMap(unit => unit.candidateIds)).toEqual(expect.arrayContaining(['primary', 'driver', 'mix']));
  });

  it.fails('uses official domain story order as an actuating runtime input rather than inert metadata', () => {
    const srcRoot = path.resolve(process.cwd(), 'src');
    const definingFile = path.resolve(srcRoot, 'lib/domain-visual-playbooks.ts');
    const consumers = productionTsFiles(srcRoot)
      .filter(file => file !== definingFile)
      .filter(file => /\.storyOrder\b|storyOrder\s*\)/.test(fs.readFileSync(file, 'utf8')));
    expect(consumers, 'storyOrder currently has no Product runtime consumer').not.toHaveLength(0);
  });
});
