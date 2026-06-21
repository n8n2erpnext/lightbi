import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

type RuntimeCase = {
  name: string;
  csv: string;
  questionLabel: string;
};

function csv(headers: string[], rows: Array<Array<string | number>>): string {
  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}

function rows(count: number, makeRow: (index: number) => Array<string | number>): Array<Array<string | number>> {
  return Array.from({ length: count }, (_, index) => makeRow(index));
}

const RUNTIME_CASES: RuntimeCase[] = [
  {
    name: 'runtime_money_trend.csv',
    questionLabel: 'Money over time',
    csv: csv(
      ['Ngày xuất', 'Mã kho', 'Tổng tiền', 'Tiền phải thu'],
      rows(40, i => [
        `2025-01-${String((i % 20) + 1).padStart(2, '0')}`,
        `WH${i % 5}`,
        1000000 + i * 10000,
        900000 + i * 9000
      ])
    )
  },
  {
    name: 'runtime_working_capital.csv',
    questionLabel: 'Receivable, payable, and balance review',
    csv: csv(
      ['Kỳ', 'Khách hàng', 'Nhà cung cấp', 'Phải thu', 'Phải trả', 'Số dư cuối'],
      rows(35, i => [
        `2025-${String((i % 12) + 1).padStart(2, '0')}`,
        `Customer ${i % 7}`,
        `Supplier ${i % 4}`,
        1500000 + i * 10000,
        500000 + i * 5000,
        1000000 + i * 2000
      ])
    )
  },
  {
    name: 'runtime_stock_movement.csv',
    questionLabel: 'Stock movement and quantity flow',
    csv: csv(
      ['Ngày', 'Mã hàng', 'Tên hàng', 'Kho', 'Số lượng đặt', 'Số lượng nhận', 'Số lượng bán', 'Số lượng trả'],
      rows(35, i => [
        `2025-02-${String((i % 20) + 1).padStart(2, '0')}`,
        `SKU${i % 8}`,
        `Product ${i % 8}`,
        `WH${i % 3}`,
        100 + i,
        90 + i,
        60 + i,
        i % 5
      ])
    )
  },
  {
    name: 'runtime_healthcare_billing.csv',
    questionLabel: 'Value by employee, doctor, driver, or user',
    csv: csv(
      ['Ngày khám', 'Bệnh nhân', 'Bác sĩ', 'Tên thuốc', 'Dịch vụ', 'Tiền phải thu', 'Tiền mặt'],
      rows(32, i => [
        `2025-03-${String((i % 25) + 1).padStart(2, '0')}`,
        `BN${i % 10}`,
        `DR${i % 4}`,
        i % 2 === 0 ? 'Amoxicillin' : 'Paracetamol',
        i % 3 === 0 ? 'Khám tổng quát' : 'Bán thuốc',
        150000 + i * 5000,
        100000
      ])
    )
  },
  {
    name: 'runtime_control_status.csv',
    questionLabel: 'Approval or reconciliation flow',
    csv: csv(
      ['Ngày tạo', 'Số chứng từ', 'Người tạo', 'Trạng thái phê duyệt', 'Trạng thái đối soát', 'Tổng tiền'],
      rows(30, i => [
        `2025-04-${String((i % 20) + 1).padStart(2, '0')}`,
        `DOC${i}`,
        `User ${i % 6}`,
        i % 3 === 0 ? 'Chờ duyệt' : 'Đã duyệt',
        i % 4 === 0 ? 'Chưa đối soát' : 'Đã đối soát',
        500000 + i * 1000
      ])
    )
  }
];

async function uploadCsvAndUseDataset(page: import('@playwright/test').Page, runtimeCase: RuntimeCase) {
  await page.goto('http://localhost:5173/');
  await page.waitForSelector('input[type="file"]', { state: 'attached' });
  await page.setInputFiles('input[type="file"]', {
    name: runtimeCase.name,
    mimeType: 'text/csv',
    buffer: Buffer.from(runtimeCase.csv, 'utf-8')
  });

  await page.waitForSelector('button:has-text("Use this dataset"), button:has-text("Use selected dataset")', { timeout: 30000 });
  await page.click('button:has-text("Use this dataset"), button:has-text("Use selected dataset")');
  await expect(page.getByText('What do you want to understand?')).toBeVisible({ timeout: 30000 });
}

async function clickQuestion(page: import('@playwright/test').Page, questionLabel: string) {
  const label = page.getByText(questionLabel, { exact: true }).first();
  await label.scrollIntoViewIfNeeded();
  const questionCard = page
    .locator('div.rounded-md')
    .filter({ has: page.getByText(questionLabel, { exact: true }) })
    .filter({ has: page.getByRole('button', { name: 'Investigate' }) })
    .first();
  await expect(questionCard).toBeVisible({ timeout: 10000 });
  await questionCard.getByRole('button', { name: 'Investigate' }).click();
}

async function assertRuntimeExecuted(page: import('@playwright/test').Page, runtimeCase: RuntimeCase) {
  await page.waitForSelector('button:has-text("Run preview")', { timeout: 30000 });
  await page.getByRole('button', { name: 'Run preview' }).first().click();
  await expect(page.getByText('EXECUTED')).toBeVisible({ timeout: 30000 });

  const pageText = await page.locator('body').innerText();
  const forbidden = [
    'Execution Boundary Failed',
    'CANONICAL',
    'DUCKDB',
    'SQL preview is empty or blocked',
    'Trend shape expects a date/time dimension',
    'Summary shape requires at least one measure'
  ];

  for (const term of forbidden) {
    if (pageText.includes(term)) {
      throw new Error(`[${runtimeCase.name}] Runtime leaked forbidden error: ${term}`);
    }
  }

  await page.screenshot({
    path: `../../ui-audit/understanding-core-runtime-2026-06-16/${runtimeCase.name.replace(/[^a-zA-Z0-9_-]+/g, '_')}_executed.png`,
    fullPage: true
  });
}

test.describe('understanding-core runtime actions', () => {
  test.setTimeout(120000);

  test.beforeAll(() => {
    mkdirSync('../../ui-audit/understanding-core-runtime-2026-06-16', { recursive: true });
  });

  for (const runtimeCase of RUNTIME_CASES) {
    test(`runs question action for ${runtimeCase.name}`, async ({ page }) => {
      await uploadCsvAndUseDataset(page, runtimeCase);
      await clickQuestion(page, runtimeCase.questionLabel);
      await assertRuntimeExecuted(page, runtimeCase);
    });
  }
});
