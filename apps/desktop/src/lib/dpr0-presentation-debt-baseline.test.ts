import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

type Defect = { id: string; ownerPhase: string; source: string; evidence: string; expectedVisibleHeadingOccurrences?: number; laneSymbols?: string[] };
const here = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(here, '..');
const baseline = JSON.parse(fs.readFileSync(path.join(here, 'dpr0-presentation-debt-baseline.json'), 'utf8')) as { defects: Defect[] };

const defect = (id: string) => {
  const found = baseline.defects.find(item => item.id === id);
  if (!found) throw new Error(`missing DPR-0 debt fixture: ${id}`);
  return found;
};

describe('DPR-0 presentation debt baseline', () => {
  it('keeps the chart-type collapse defect explicit until DPR-6 retires it', () => {
    const item = defect('dashboard-renderer-type-collapse');
    const source = fs.readFileSync(path.join(srcRoot, item.source), 'utf8');
    expect(item.ownerPhase).toBe('DPR-6');
    expect(source).toContain(item.evidence);
  });

  it('keeps duplicate question-lane debt explicit until DPR-2 consolidates it', () => {
    const item = defect('duplicate-other-question-lanes');
    const source = fs.readFileSync(path.join(srcRoot, item.source), 'utf8');
    expect(item.ownerPhase).toBe('DPR-2');
    expect(item.laneSymbols?.every(symbol => source.includes(symbol))).toBe(true);
    expect(source.split(item.evidence).length - 1).toBe(item.expectedVisibleHeadingOccurrences);
  });
});
