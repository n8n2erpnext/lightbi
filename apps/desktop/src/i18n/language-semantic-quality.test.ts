import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

type Catalog = { messages: Record<string, string> };
const root = path.dirname(fileURLToPath(import.meta.url));
const en = JSON.parse(fs.readFileSync(path.join(root, 'languages', 'en.json'), 'utf8')) as Catalog;
const vi = JSON.parse(fs.readFileSync(path.join(root, 'languages', 'vi.json'), 'utf8')) as Catalog;

const glossary: Record<string, string> = {
  'Margin': 'Biên lợi nhuận',
  'Margin %': 'Biên lợi nhuận %',
  'Target': 'Mục tiêu',
  'Actual': 'Thực tế',
  'Lead': 'Khách hàng tiềm năng',
  'Patient': 'Bệnh nhân',
  'Quotation': 'Báo giá',
  'Purchase Order': 'Đơn mua hàng',
  'Sales Order': 'Đơn bán hàng',
  'Payable': 'Công nợ phải trả',
  'Receivable': 'Công nợ phải thu',
  'Commission': 'Hoa hồng',
  'Shift': 'Ca làm',
  'Planning': 'Lập kế hoạch',
  'Stock Value': 'Giá trị tồn kho',
  'Stock Quantity': 'Số lượng tồn kho',
  'Reorder Level': 'Mức tồn tối thiểu',
  'Employee': 'Nhân viên',
  'Employee ID': 'Mã nhân viên',
  'Opportunity': 'Cơ hội bán hàng',
  'Department': 'Phòng ban',
  'Category': 'Danh mục',
  'Credit': 'Có',
  'Debit': 'Nợ',
  'Field...': 'Trường dữ liệu...',
  'Field / Farm Plot': 'Cánh đồng / Lô đất',
  'Basic inventory snapshot': 'Tổng quan tồn kho cơ bản',
  'Inventory Age Bucket': 'Nhóm thời gian tồn kho',
  'Grain': 'Mức chi tiết',
  'Bar': 'Biểu đồ cột',
  'Line': 'Biểu đồ đường',
  'Pie': 'Biểu đồ tròn',
  'Domain source:': 'Nguồn miền nghiệp vụ:',
  'Canonical evidence attached': 'Đã gắn bằng chứng chuẩn',
  'Raw-to-canonical data dictionary': 'Từ điển dữ liệu từ thô đến chuẩn',
  'Runtime Intent': 'Ý định thực thi',
  'Runtime Plan': 'Kế hoạch thực thi',
};


const reviewedExactEnglish = new Set([
  'LightBI', 'Micro Brain', 'LightBI Secure Connection', 'Dashboard', 'Dashboards', 'Theme',
  'REST API', 'GraphQL', 'BigQuery', 'DuckDB', 'Excel', 'MySQL', 'PostgreSQL', 'MariaDB', 'SQLite',
  'Webhook', 'Microsoft 365 Excel', 'EUR — Euro', 'Ctrl K', 'Core', 'Core API', 'Email', 'Schema', 'fk',
  'MiB', 'MiB /', 'Intelligence Pack', 'An Phat Retail', 'Gia Phuc', 'Hoa Binh Mart', 'Minh Long Trading', 'Nam Viet Shop',
  'Phuong Dong', 'Sai Gon Home', 'Thanh Cong', 'Inverter 1.5HP', 'Inverter 350L', 'OLED 55',
  'friend@example.com', 'support@thaiduy.digital',
]);

const intentionallyEnglish: Record<string, string> = {
  'Dashboard': 'Dashboard',
  'Dashboards': 'Dashboard',
  'Theme': 'Theme',
  'REST API': 'REST API',
  'Micro Brain': 'Micro Brain',
};

function placeholders(value: string): string[] {
  return value.match(/\{[^{}]+\}|%\([^)]+\)[#0 +\-.\d]*[a-zA-Z]|%[sdif]|\$\{[^}]+\}/g)?.sort() ?? [];
}

describe('Vietnamese semantic translation quality', () => {
  it('keeps English and Vietnamese catalogs on the same message key set', () => {
    expect(Object.keys(vi.messages).sort()).toEqual(Object.keys(en.messages).sort());
  });

  it('keeps reviewed business terminology source-aware', () => {
    for (const [source, expected] of Object.entries(glossary)) expect(vi.messages[source], source).toBe(expected);
  });

  it('keeps reviewed technical vocabulary in English where that is the product convention', () => {
    for (const [source, expected] of Object.entries(intentionallyEnglish)) expect(vi.messages[source], source).toBe(expected);
  });

  it('does not leave full English UI copy untranslated outside the reviewed technical/proper-name allowlist', () => {
    const untranslated = Object.entries(vi.messages)
      .filter(([source, translated]) => source === translated && en.messages[source] === source)
      .filter(([source]) => /^[\x00-\x7F]+$/.test(source) && /[A-Za-z]/.test(source))
      .filter(([source]) => !reviewedExactEnglish.has(source))
      .sort(([left], [right]) => left.localeCompare(right));
    expect(untranslated).toEqual([]);
  });

  it('preserves interpolation placeholders across English and Vietnamese catalogs', () => {
    const mismatches: string[] = [];
    for (const [source, translated] of Object.entries(vi.messages)) {
      const english = en.messages[source];
      if (!english) continue;
      const left = placeholders(english);
      const right = placeholders(translated);
      if (JSON.stringify(left) !== JSON.stringify(right)) mismatches.push(`${source}: ${left.join(',')} != ${right.join(',')}`);
    }
    expect(mismatches).toEqual([]);
  });

  it('rejects known machine-translation artifacts', () => {
    const forbidden = [
      'tập tin sàn gỗ', 'Tên sân khấu', 'Giá trị cổ phiếu', 'Phong trào chứng khoán',
      'Chỉ huy', 'Kiên nhẫn', 'Thông thoáng', 'Nhiệm vụ', 'quy hoạch', 'Trích dẫn',
      'trình điều khiển', 'xuất khẩu', 'Khoảng không quảng cáo', 'Ứng viên được phỏng vấn',
      'cơ quan phê duyệt', 'thứ nguyên', 'được giải quyết', 'BAo',
    ];
    const bad: string[] = [];
    for (const [source, translated] of Object.entries(vi.messages)) {
      for (const artifact of forbidden) if (translated.includes(artifact)) bad.push(`${source} => ${translated}`);
    }
    expect(bad).toEqual([]);
  });
});
