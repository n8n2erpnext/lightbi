import { test, expect } from '@playwright/test';

type SyntheticCase = {
  name: string;
  csv: string;
  expected: string[];
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

const CASES: SyntheticCase[] = [
  {
    name: 'profit_margin_business_export.csv',
    csv: csv(
      ['Tháng', 'Khu vực', 'Sản phẩm', 'Doanh thu', 'Giá vốn', 'Lợi nhuận', 'Biên lợi nhuận'],
      rows(40, i => [
        `2025-${String((i % 12) + 1).padStart(2, '0')}`,
        `Region ${i % 4}`,
        `Item ${i % 8}`,
        10000000 + i * 10000,
        7000000 + i * 5000,
        3000000 + i * 5000,
        0.3
      ])
    ),
    expected: ['Profitability', 'Profit or margin performance', 'Money trend', 'Location performance']
  },
  {
    name: 'accounting_receivable_payable.csv',
    csv: csv(
      ['Kỳ', 'Khách hàng', 'Nhà cung cấp', 'Công nợ', 'Phải thu', 'Phải trả', 'Số dư cuối'],
      rows(40, i => [
        `2025-${String((i % 12) + 1).padStart(2, '0')}`,
        `Customer ${i % 8}`,
        `Supplier ${i % 5}`,
        2000000 + i * 10000,
        1500000 + i * 10000,
        500000 + i * 5000,
        1000000 + i * 2000
      ])
    ),
    expected: ['Working capital', 'Receivable, payable, and balance review', 'Value by customer or patient']
  },
  {
    name: 'stock_movement_export.csv',
    csv: csv(
      ['Ngày', 'Mã hàng', 'Tên hàng', 'Kho', 'Số lượng đặt', 'Số lượng nhận', 'Số lượng bán', 'Số lượng trả', 'Phiếu nhập', 'Chuyển kho'],
      rows(45, i => [
        `2025-02-${String((i % 20) + 1).padStart(2, '0')}`,
        `SKU${i % 10}`,
        `Product ${i % 10}`,
        `WH${i % 3}`,
        100 + i,
        90 + i,
        60 + i,
        i % 5,
        `GRN${i}`,
        `TF${i % 12}`
      ])
    ),
    expected: ['Stock movement', 'Stock movement and quantity flow', 'Item performance']
  },
  {
    name: 'healthcare_billing_export.csv',
    csv: csv(
      ['Ngày khám', 'Bệnh nhân', 'Bác sĩ', 'Tên thuốc', 'Dịch vụ', 'Tiền phải thu', 'Tiền mặt', 'Trạng thái thanh toán'],
      rows(35, i => [
        `2025-01-${String((i % 28) + 1).padStart(2, '0')}`,
        `BN${i % 12}`,
        `DR${i % 4}`,
        i % 2 === 0 ? 'Amoxicillin' : 'Paracetamol',
        i % 3 === 0 ? 'Khám tổng quát' : 'Bán thuốc',
        150000 + i * 5000,
        100000,
        i % 4 === 0 ? 'Chưa thu' : 'Đã thu'
      ])
    ),
    expected: ['Money trend', 'Item performance', 'Actor performance', 'Customer/person contribution', 'Payment behavior']
  },
  {
    name: 'approval_reconciliation_export.csv',
    csv: csv(
      ['Ngày tạo', 'Số chứng từ', 'Người tạo', 'Trạng thái phê duyệt', 'Trạng thái đối soát', 'Tổng tiền'],
      rows(30, i => [
        `2025-03-${String((i % 20) + 1).padStart(2, '0')}`,
        `DOC${i}`,
        `User ${i % 6}`,
        i % 3 === 0 ? 'Chờ duyệt' : 'Đã duyệt',
        i % 4 === 0 ? 'Chưa đối soát' : 'Đã đối soát',
        500000 + i * 1000
      ])
    ),
    expected: ['Control status', 'Approval or reconciliation flow', 'Status flow']
  }
];

test.describe('understanding-core synthetic UI coverage', () => {
  test.setTimeout(90000);

  for (const synthetic of CASES) {
    test(`suggests universal questions for ${synthetic.name}`, async ({ page }) => {
      await page.goto('http://localhost:5173/');
      await page.waitForSelector('input[type="file"]', { state: 'attached' });
      await page.setInputFiles('input[type="file"]', {
        name: synthetic.name,
        mimeType: 'text/csv',
        buffer: Buffer.from(synthetic.csv, 'utf-8')
      });

      await page.waitForSelector('button:has-text("Use this dataset"), button:has-text("Use selected dataset")', { timeout: 30000 });
      await page.click('button:has-text("Use this dataset"), button:has-text("Use selected dataset")');
      await expect(page.getByText('What do you want to understand?')).toBeVisible({ timeout: 30000 });

      const bodyText = await page.locator('body').innerText();
      for (const expected of synthetic.expected) {
        if (!bodyText.includes(expected)) {
          throw new Error(`Missing expected universal question/lens "${expected}" for ${synthetic.name}`);
        }
      }

      if (bodyText.includes('No columns detected. Cannot suggest analysis capabilities.')) {
        throw new Error('Stale no-columns warning leaked into understanding-core UI');
      }
      if (bodyText.includes('Advanced guided views unavailable')) {
        throw new Error('Legacy guided views block leaked into understanding-core UI');
      }
    });
  }
});
