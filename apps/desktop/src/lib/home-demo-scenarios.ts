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

const day = (value: number) => String(value).padStart(2, '0');

const branchRevenue = () => {
  const branches = [
    { name: 'HCM-Q1', factor: 1.52, people: ['NV001', 'NV002'] },
    { name: 'HN-CG', factor: 1.16, people: ['NV003', 'NV004'] },
    { name: 'DN-HC', factor: 0.82, people: ['NV005'] },
    { name: 'CT-NK', factor: 0.58, people: ['NV006'] },
  ];
  const products = [
    { category: 'TV', name: 'OLED 55', price: 17_900_000 },
    { category: 'Máy lạnh', name: 'Inverter 1.5HP', price: 10_900_000 },
    { category: 'Tủ lạnh', name: 'Inverter 350L', price: 12_600_000 },
    { category: 'Gia dụng', name: 'Robot vacuum', price: 7_200_000 },
    { category: 'Gia dụng', name: 'Air fryer', price: 3_450_000 },
  ];
  const dailyPulse = [0.66, 0.91, 1.08, 0.74, 1.22, 1.68, 1.44, 0.83, 1.04, 0.96, 1.31, 0.71, 1.56, 1.17];
  const rows: Array<Array<string | number>> = [];
  for (let index = 0; index < 56; index += 1) {
    const branch = branches[index % branches.length]!;
    const dateIndex = Math.floor(index / branches.length);
    const product = products[(index * 3 + dateIndex) % products.length]!;
    const quantity = 1 + ((index + dateIndex) % 3);
    const campaignBoost = dateIndex === 5 && branch.name === 'HCM-Q1' ? 1.72
      : dateIndex === 10 && branch.name === 'DN-HC' ? 1.85
        : dateIndex === 11 && branch.name === 'CT-NK' ? 0.48
          : 1;
    const discountRate = (index % 9 === 0 ? 0.12 : index % 5 === 0 ? 0.06 : 0.02);
    const gross = product.price * quantity * branch.factor * dailyPulse[dateIndex]! * campaignBoost;
    const revenue = Math.round(gross * (1 - discountRate) / 10_000) * 10_000;
    rows.push([
      `DEMO-SO-${String(index + 1).padStart(3, '0')}`,
      `2026-08-${day(dateIndex + 3)}`,
      branch.name,
      product.category,
      product.name,
      quantity,
      revenue,
      Math.round(discountRate * 100),
      ['Card', 'Transfer', 'Cash', 'Installment'][(index * 5) % 4]!,
      branch.people[index % branch.people.length]!,
    ]);
  }
  return new File([csv(
    ['OrderID', 'OrderDate', 'Branch', 'Category', 'Product', 'Qty', 'Revenue', 'DiscountPct', 'PaymentMethod', 'Salesperson'],
    rows,
  )], 'LightBI_Demo_Branch_Revenue.csv', { type: 'text/csv' });
};

const receivables = () => {
  const customers = [
    { name: 'An Phat Retail', factor: 2.35 },
    { name: 'Minh Long Trading', factor: 1.75 },
    { name: 'Hoa Binh Mart', factor: 1.25 },
    { name: 'Sai Gon Home', factor: 1.05 },
    { name: 'Nam Viet Shop', factor: 0.82 },
    { name: 'Gia Phuc', factor: 0.64 },
    { name: 'Thanh Cong', factor: 0.53 },
    { name: 'Phuong Dong', factor: 0.46 },
  ];
  const aging = ['Current', '1-30', '31-60', '61-90', '90+'];
  const rows = Array.from({ length: 40 }, (_, index) => {
    const customer = customers[(index * 3) % customers.length]!;
    const bucket = aging[index % aging.length]!;
    const invoice = Math.round((2_600_000 + (index % 7) * 1_150_000) * customer.factor / 10_000) * 10_000;
    const paid = index % 11 === 0 || (bucket === 'Current' && index % 4 === 0);
    const severity = bucket === '90+' ? 0.98 : bucket === '61-90' ? 0.83 : bucket === '31-60' ? 0.67 : bucket === '1-30' ? 0.44 : 0.22;
    const outstanding = paid ? 0 : Math.round(invoice * severity / 10_000) * 10_000;
    const invoiceDay = 2 + (index % 24);
    const dueMonth = invoiceDay > 18 ? '08' : '07';
    const dueDay = dueMonth === '08' ? day(invoiceDay - 18) : day(invoiceDay + 10);
    return [
      `INV-DEMO-${String(index + 1).padStart(3, '0')}`,
      `2026-06-${day(invoiceDay)}`,
      `2026-${dueMonth}-${dueDay}`,
      customer.name,
      ['HCM', 'Hanoi', 'Da Nang', 'Can Tho'][index % 4]!,
      invoice,
      outstanding,
      bucket,
      paid ? 'Paid' : index % 13 === 0 ? 'Disputed' : 'Open',
    ];
  });
  return new File([csv(
    ['InvoiceNo', 'InvoiceDate', 'DueDate', 'Customer', 'Branch', 'InvoiceTotal', 'Outstanding', 'AgingBucket', 'Status'],
    rows,
  )], 'LightBI_Demo_Receivables.csv', { type: 'text/csv' });
};

const attendance = () => {
  const employees = [
    ['E001', 'Lan', 'Sales'], ['E002', 'Minh', 'Sales'], ['E003', 'Huy', 'Sales'],
    ['E004', 'Trang', 'Warehouse'], ['E005', 'Khoa', 'Warehouse'], ['E006', 'Vy', 'Warehouse'],
    ['E007', 'Phuong', 'Finance'], ['E008', 'Tuan', 'Finance'], ['E009', 'Mai', 'Customer Care'],
  ] as const;
  const rows: Array<Array<string | number>> = [];
  for (let workDay = 0; workDay < 6; workDay += 1) {
    employees.forEach((employee, employeeIndex) => {
      const late = (employeeIndex === 1 && workDay >= 3) || (employeeIndex + workDay * 2) % 11 === 0;
      const absent = employeeIndex === 4 && workDay === 4;
      const overtime = absent ? 0 : employee[2] === 'Warehouse' ? [1.5, 2.2, 0.5, 3.1, 2.7, 1.2][workDay]! : employee[2] === 'Sales' && workDay === 5 ? 1.4 : 0;
      const worked = absent ? 0 : late ? 7.3 + (employeeIndex % 3) * 0.15 : 8 + overtime * 0.15;
      rows.push([
        employee[0], `Demo ${employee[1]}`, employee[2], `2026-08-${day(workDay + 10)}`,
        absent ? '' : late ? `09:${[12, 24, 37][employeeIndex % 3]}` : `08:0${employeeIndex % 5}`,
        absent ? '' : overtime ? `1${8 + Math.min(1, Math.floor(overtime / 2))}:${overtime > 2 ? '45' : '15'}` : '17:05',
        Number(worked.toFixed(2)), overtime,
        absent ? 'Absent' : late ? 'Late' : overtime >= 2.5 ? 'Overtime' : 'Present',
      ]);
    });
  }
  return new File([csv(
    ['EmployeeID', 'EmployeeName', 'Department', 'WorkDate', 'CheckIn', 'CheckOut', 'HoursWorked', 'OvertimeHours', 'Status'],
    rows,
  )], 'LightBI_Demo_Employee_Attendance.csv', { type: 'text/csv' });
};

const combinedReports = () => {
  const stores = ['HCM-Q1', 'HN-CG', 'DN-HC', 'CT-NK'];
  const products = [
    ['TV55', 'TV', 'OLED 55', 17_900_000, 12_400_000],
    ['AC15', 'Máy lạnh', 'Inverter 1.5HP', 10_900_000, 7_250_000],
    ['RF350', 'Tủ lạnh', 'Inverter 350L', 12_600_000, 8_600_000],
    ['RV01', 'Gia dụng', 'Robot vacuum', 7_200_000, 4_450_000],
  ] as const;
  const salesRows: Array<Array<string | number>> = [];
  const accountingRows: Array<Array<string | number>> = [];
  const storePulse = [1.34, 1.08, 0.79, 0.61];
  const dayPulse = [0.82, 1.16, 0.94, 1.42, 0.71, 1.27, 1.05, 1.58, 0.88];
  for (let index = 0; index < 36; index += 1) {
    const storeIndex = index % stores.length;
    const product = products[(index * 3) % products.length]!;
    const qty = 1 + ((index + storeIndex) % 3);
    const discount = index % 10 === 0 ? 0.11 : index % 6 === 0 ? 0.055 : 0.02;
    const revenue = Math.round(product[3] * qty * storePulse[storeIndex]! * dayPulse[index % dayPulse.length]! * (1 - discount) / 10_000) * 10_000;
    const cost = Math.round(product[4] * qty * (0.97 + (index % 5) * 0.018) / 10_000) * 10_000;
    const grossProfit = revenue - cost;
    const orderId = `DEMO-ERP-${String(index + 1).padStart(3, '0')}`;
    const orderDate = `2026-08-${day(2 + (index % 18))}`;
    const salesperson = `NV${String((index % 7) + 1).padStart(3, '0')}`;
    const payment = ['Transfer', 'Card', 'Cash', 'Installment'][index % 4]!;
    salesRows.push([
      orderId, orderDate, stores[storeIndex]!, product[0], product[1], product[2], qty, product[3], Math.round(discount * 100), revenue, 'VND', payment, salesperson,
    ]);
    accountingRows.push([
      `DEMO-INV-${String(index + 1).padStart(3, '0')}`, `DEMO-JRN-${String(index + 1).padStart(3, '0')}`, orderId, orderDate,
      stores[storeIndex]!, salesperson, payment, product[0], product[1], product[2], qty, product[3], Math.round(discount * 100),
      revenue, cost, grossProfit, Number((grossProfit / Math.max(revenue, 1) * 100).toFixed(2)), revenue, revenue, cost, cost, 'VND',
    ]);
  }
  const sales = new File([csv(
    ['OrderID', 'OrderDate', 'Store', 'SKU', 'Category', 'Product', 'Qty', 'UnitPrice', 'DiscountPct', 'Revenue', 'Currency', 'Payment', 'Salesperson'],
    salesRows,
  )], 'LightBI_Demo_Sales_August.csv', { type: 'text/csv' });
  const accounting = new File([csv(
    ['InvoiceNo', 'JournalNo', 'OrderID', 'InvoiceDate', 'Store', 'Salesperson', 'Payment', 'SKU', 'Category', 'Product', 'Qty', 'UnitPrice', 'DiscountPct', 'NetRevenue', 'TotalCost', 'GrossProfit', 'MarginPct', 'AR_Debit', 'Revenue_Credit', 'COGS_Debit', 'Inventory_Credit', 'Currency'],
    accountingRows,
  )], 'LightBI_Demo_Accounting_August.csv', { type: 'text/csv' });
  return [sales, accounting];
};

export const homeDemoScenarios: HomeDemoScenario[] = [
  { id: 'branch-revenue', prompts: ['Compare branch revenue', 'Review sales performance'], targetPerspectiveId: 'revenue', autoRun: true, createFiles: () => [branchRevenue()] },
  { id: 'receivables-aging', prompts: ['Review receivables aging'], targetPerspectiveId: 'inventory', autoRun: true, createFiles: () => [receivables()] },
  { id: 'employee-attendance', prompts: ['Review employee attendance'], targetPerspectiveId: 'operations', autoRun: true, createFiles: () => [attendance()] },
  { id: 'combine-reports', prompts: ['Combine Excel reports', 'Build executive summary'], collectionPerspectiveId: 'executive_overview', currency: 'VND', autoRun: true, createFiles: combinedReports },
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
