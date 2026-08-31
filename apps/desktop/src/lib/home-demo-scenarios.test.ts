// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { findHomeDemoScenario, isHomeDemoDataset, selectHomeDemoActionId } from './home-demo-scenarios';

describe('home demo scenarios', () => {
  it('maps the visible starter prompts to real synthetic files', () => {
    for (const prompt of ['Compare branch revenue','Review receivables aging','Review employee attendance','Combine Excel reports','Build executive summary']) {
      const scenario = findHomeDemoScenario(prompt);
      expect(scenario, prompt).not.toBeNull();
      const files = scenario!.createFiles();
      expect(files.length, prompt).toBeGreaterThan(0);
      expect(files.every(file => file instanceof File && file.size > 30 && file.name.startsWith('LightBI_Demo_')), prompt).toBe(true);
    }
  });

  it('selects the first governed action owned by the requested canonical perspective', () => {
    const scenario = findHomeDemoScenario('Review employee attendance')!;
    expect(selectHomeDemoActionId(
      scenario,
      [{ perspectiveId: 'operations', actionCandidateIds: ['blocked', 'operations-ready'] }],
      ['operations-ready'],
    )).toBe('operations-ready');
  });

  it('keeps built-in demo datasets out of durable user-session authority', () => {
    expect(isHomeDemoDataset({ sourceFiles: [{ name: 'LightBI_Demo_Sales.csv' }, { name: 'LightBI_Demo_Accounting.csv' }] })).toBe(true);
    expect(isHomeDemoDataset({ sourceFiles: [{ name: 'customer-data.csv' }] })).toBe(false);
  });
  it('uses visibly uneven business-shaped demo data instead of uniform toy series', async () => {
    const branch = findHomeDemoScenario('Compare branch revenue')!.createFiles()[0]!;
    const branchLines = (await branch.text()).trim().split('\n');
    expect(branchLines.length).toBeGreaterThan(50);
    const revenues = branchLines.slice(1).map(line => Number(line.split(',')[6]));
    expect(Math.max(...revenues) / Math.max(1, Math.min(...revenues))).toBeGreaterThan(4);

    const combined = findHomeDemoScenario('Build executive summary')!.createFiles();
    expect(combined.map(file => file.name)).toEqual(['LightBI_Demo_Sales_August.csv', 'LightBI_Demo_Accounting_August.csv']);
    expect((await combined[0]!.text()).split('\n')[0]).toContain('OrderID');
    expect((await combined[1]!.text()).split('\n')[0]).toContain('GrossProfit');
  });

});
