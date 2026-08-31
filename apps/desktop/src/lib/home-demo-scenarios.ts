export type HomeDemoScenario = {
  id: string;
  prompts: string[];
  targetPerspectiveId?: string;
  collectionPerspectiveId?: string;
  currency?: string;
  autoRun: boolean;
  createFiles: () => File[];
};

const csv = (headers: string[], rows: Array<Array<string | number>>) =>
  [headers.join(','), ...rows.map(row => row.map(value => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }).join(','))].join('\n');

const branchRevenue = () => new File([csv(
  ['OrderID', 'OrderDate', 'Branch', 'Category', 'Product', 'Qty', 'Revenue', 'PaymentMethod', 'Salesperson'],
  Array.from({ length: 32 }, (_, index) => [
    `DEMO-${String(index + 1).padStart(3, '0')}`,
    `2026-08-${String((index % 16) + 1).padStart(2, '0')}`,
    ['HCM-Q1', 'HN-CG', 'DN-HC', 'CT-NK'][index % 4],
    ['Electronics', 'Home appliance'][index % 2],
    ['Demo TV', 'Demo Fridge', 'Demo Fan', 'Demo Cooker'][index % 4],
    (index % 3) + 1,
    2_500_000 + (index % 7) * 675_000,
    ['Cash', 'Card', 'Transfer'][index % 3],
    `NV${String((index % 6) + 1).padStart(3, '0')}`,
  ]),
)], 'LightBI_Demo_Branch_Revenue.csv', { type: 'text/csv' });

const receivables = () => new File([csv(
  ['InvoiceNo', 'InvoiceDate', 'DueDate', 'Customer', 'Branch', 'InvoiceTotal', 'Outstanding', 'AgingBucket', 'Status'],
  Array.from({ length: 28 }, (_, index) => [
    `INV-DEMO-${String(index + 1).padStart(3, '0')}`,
    `2026-06-${String((index % 20) + 1).padStart(2, '0')}`,
    `2026-07-${String((index % 20) + 1).padStart(2, '0')}`,
    `Customer ${String.fromCharCode(65 + (index % 8))}`,
    ['HCM', 'Hanoi', 'Da Nang'][index % 3],
    3_000_000 + (index % 6) * 850_000,
    index % 5 === 0 ? 0 : 800_000 + (index % 8) * 475_000,
    ['Current', '1-30', '31-60', '61-90'][index % 4],
    index % 5 === 0 ? 'Paid' : 'Open',
  ]),
)], 'LightBI_Demo_Receivables.csv', { type: 'text/csv' });

const attendance = () => new File([csv(
  ['EmployeeID', 'EmployeeName', 'Department', 'WorkDate', 'CheckIn', 'CheckOut', 'HoursWorked', 'OvertimeHours', 'Status'],
  Array.from({ length: 36 }, (_, index) => [
    `E${String((index % 9) + 1).padStart(3, '0')}`,
    `Demo Employee ${(index % 9) + 1}`,
    ['Sales', 'Warehouse', 'Finance'][index % 3],
    `2026-08-${String(Math.floor(index / 9) + 1).padStart(2, '0')}`,
    index % 7 === 0 ? '09:18' : '08:02',
    index % 5 === 0 ? '18:30' : '17:05',
    index % 7 === 0 ? 7.7 : 8.0,
    index % 5 === 0 ? 1.4 : 0,
    index % 7 === 0 ? 'Late' : 'Present',
  ]),
)], 'LightBI_Demo_Employee_Attendance.csv', { type: 'text/csv' });

const combinedReports = () => {
  const periodFile = (month: '07' | '08', label: string) => new File([csv(
    ['OrderID', 'OrderDate', 'Branch', 'Product', 'Qty', 'Revenue', 'Currency'],
    Array.from({ length: 18 }, (_, index) => [
      `SO-${label}-${String(index + 1).padStart(3, '0')}`,
      `2026-${month}-${String((index % 12) + 1).padStart(2, '0')}`,
      ['HCM', 'Hanoi', 'Da Nang'][index % 3],
      ['TV', 'Fridge', 'Cooker'][index % 3],
      (index % 3) + 1,
      (month === '08' ? 3_500_000 : 3_100_000) + (index % 5) * 900_000,
      'VND',
    ]),
  )], `LightBI_Demo_Sales_${label}.csv`, { type: 'text/csv' });
  return [periodFile('07', 'July'), periodFile('08', 'August')];
};

export const homeDemoScenarios: HomeDemoScenario[] = [
  { id: 'branch-revenue', prompts: ['Compare branch revenue', 'Review sales performance', 'Build executive summary'], targetPerspectiveId: 'revenue', autoRun: true, createFiles: () => [branchRevenue()] },
  { id: 'receivables-aging', prompts: ['Review receivables aging'], targetPerspectiveId: 'inventory', autoRun: true, createFiles: () => [receivables()] },
  { id: 'employee-attendance', prompts: ['Review employee attendance'], targetPerspectiveId: 'operations', autoRun: true, createFiles: () => [attendance()] },
  { id: 'combine-reports', prompts: ['Combine Excel reports'], collectionPerspectiveId: 'period_comparison', currency: 'VND', autoRun: true, createFiles: combinedReports },
];

export function findHomeDemoScenario(prompt: string): HomeDemoScenario | null {
  const normalized = prompt.trim().toLowerCase();
  return homeDemoScenarios.find(item => item.prompts.some(candidate => candidate.toLowerCase() === normalized)) ?? null;
}

export function selectHomeDemoActionId(
  scenario: HomeDemoScenario,
  perspectives: Array<{ perspectiveId: string; actionCandidateIds: string[] }>,
  availableActionIds: Iterable<string>,
): string | null {
  if (!scenario.targetPerspectiveId) return null;
  const available = new Set(availableActionIds);
  const perspective = perspectives.find(item => item.perspectiveId === scenario.targetPerspectiveId);
  return perspective?.actionCandidateIds.find(actionId => available.has(actionId)) ?? null;
}

export function isHomeDemoSourceName(name: unknown): boolean {
  return typeof name === 'string' && name.startsWith('LightBI_Demo_');
}

export function isHomeDemoDataset(dataset: any): boolean {
  if (dataset?.demoSynthetic === true) return true;
  const sources = Array.isArray(dataset?.sourceFiles) ? dataset.sourceFiles : [];
  return sources.length > 0 && sources.every((source: any) => isHomeDemoSourceName(source?.name));
}
