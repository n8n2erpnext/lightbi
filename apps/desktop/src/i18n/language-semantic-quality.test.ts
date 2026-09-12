import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

type Catalog = {
  messages: Record<string, string>;
  patterns?: Array<{ source: string; target: string; flags?: string }>;
};
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
  'Stock Age': 'Tuổi tồn kho',
  'Stock Quantity Metric': 'Chỉ số số lượng tồn kho',
  'Inventory Aging': 'Tuổi tồn kho',
  'Delta': 'Chênh lệch',
  'Cost Delta': 'Chênh lệch chi phí',
  'Profit Delta': 'Chênh lệch lợi nhuận',
  'Revenue Delta': 'Chênh lệch doanh thu',
  'Artifact:': 'Định danh kết quả:',
  'Stage Name': 'Tên giai đoạn',
  'Manufacturing': 'Sản xuất',
  'Material': 'Vật tư',
  'Order ID': 'Mã đơn hàng',
  'Parquet File': 'Tệp Parquet',
  'Profitability Analysis': 'Phân tích khả năng sinh lời',
  'Stock Quantity': 'Số lượng tồn kho',
  'Reorder Level': 'Mức tồn tối thiểu',
  'Employee': 'Nhân viên',
  'Employee ID': 'Mã nhân viên',
  'Opportunity': 'Cơ hội kinh doanh',
  'Department': 'Phòng ban',
  'Category': 'Danh mục',
  'Credit': 'Có',
  'Debit': 'Nợ',
  'Field...': 'Trường dữ liệu...',
  'Field / Farm Plot': 'Cánh đồng / Lô đất',
  'Basic inventory snapshot': 'Tổng quan tồn kho cơ bản',
  'Inventory Age Bucket': 'Nhóm thời gian tồn kho',
  'Grain': 'Mức chi tiết',
  'Bar': 'Biểu đồ thanh',
  'Line': 'Biểu đồ đường',
  'Pie': 'Biểu đồ tròn',
  'Domain source:': 'Nguồn miền nghiệp vụ:',
  'Canonical evidence attached': 'Đã gắn bằng chứng chuẩn',
  'Raw-to-canonical data dictionary': 'Từ điển dữ liệu từ thô đến chuẩn',
  'Runtime Intent': 'Ý định thực thi',
  'Runtime Plan': 'Kế hoạch thực thi',
  'Runtime': 'Thực thi',
  'Canonical state': 'Trạng thái chuẩn',
  'Canonical context': 'Bối cảnh chuẩn',
  'Governed': 'Đã xác thực',
  'Governed action': 'Hành động đã xác thực',
};


const reviewedExactEnglish = new Set([
  'LightBI', 'Micro Brain', 'LightBI Secure Connection', 'Dashboard', 'Dashboards', 'Business View', 'Business view', 'Business Views', 'Theme',
  'REST API', 'GraphQL', 'BigQuery', 'DuckDB', 'Excel', 'MySQL', 'PostgreSQL', 'MariaDB', 'SQLite',
  'Webhook', 'Microsoft 365 Excel', 'EUR — Euro', 'Ctrl K', 'Core', 'Core API', 'Email', 'Schema', 'fk',
  'MiB', 'MiB /', 'Intelligence Pack', 'An Phat Retail', 'Gia Phuc', 'Hoa Binh Mart', 'Minh Long Trading', 'Nam Viet Shop',
  'Phuong Dong', 'Sai Gon Home', 'Thanh Cong', 'Inverter 1.5HP', 'Inverter 350L', 'OLED 55',
  'friend@example.com', 'support@thaiduy.digital', 'public.parent',
]);


const sourceAwareRules: Array<{
  name: string;
  source: RegExp;
  translated: (value: string) => boolean;
}> = [
  { name: 'dashboard', source: /\bdashboards?\b/i, translated: value => /dashboard/i.test(value) },
  { name: 'workspace', source: /\bworkspace\b/i, translated: value => /Khu làm việc/i.test(value) },
  { name: 'schema', source: /\bschema\b/i, translated: value => /Schema/i.test(value) },
  { name: 'margin', source: /\bmargin\b/i, translated: value => /biên lợi nhuận/i.test(value) },
  { name: 'perspective', source: /\bperspectives?\b/i, translated: value => /góc nhìn/i.test(value) },
  { name: 'confidence', source: /\bconfidence\b/i, translated: value => /tin cậy/i.test(value) },
  { name: 'business view', source: /\bbusiness views?\b/i, translated: value => /Business View/i.test(value) },
  { name: 'dimension', source: /\bdimensions?\b/i, translated: value => /chiều/i.test(value) },
  { name: 'delta', source: /\bdelta\b/i, translated: value => /chênh lệch/i.test(value) },
  { name: 'stock-not-equity', source: /\bstock\b/i, translated: value => !/chứng khoán/i.test(value) },
  { name: 'aging', source: /\baging\b/i, translated: value => /tuổi|thời gian tồn/i.test(value) },
];

const intentionallyEnglish: Record<string, string> = {
  'Dashboard': 'Dashboard',
  'Dashboards': 'Dashboard',
  'Business View': 'Business View',
  'Business view': 'Business View',
  'Business Views': 'Business View',
  'Theme': 'Theme',
  'REST API': 'REST API',
  'Micro Brain': 'Micro Brain',
};

function placeholders(value: string): string[] {
  return value.match(/\{[^{}]+\}|%\([^)]+\)[#0 +\-.\d]*[a-zA-Z]|%[sdif]|\$\{[^}]+\}/g)?.sort() ?? [];
}

function captureGroupCount(source: string): number {
  let count = 0;
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\\') {
      index += 1;
      continue;
    }
    if (source[index] !== '(') continue;
    if (source[index + 1] !== '?') {
      count += 1;
      continue;
    }
    if (source[index + 2] === '<' && source[index + 3] !== '=' && source[index + 3] !== '!') count += 1;
  }
  return count;
}

function numericReplacementReferences(target: string): number[] {
  return [...target.matchAll(/\$(\d+)/g)].map((match) => Number(match[1]));
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

  it('keeps high-risk product terms source-aware across the complete catalog', () => {
    const violations: string[] = [];
    for (const [source, translated] of Object.entries(vi.messages)) {
      for (const rule of sourceAwareRules) {
        if (rule.source.test(source) && !rule.translated(translated)) {
          violations.push(`${rule.name}: ${source} => ${translated}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('keeps dynamic translation patterns valid, unique, and lossless', () => {
    const issues: string[] = [];
    const seen = new Set<string>();
    for (const [index, pattern] of (vi.patterns ?? []).entries()) {
      const identity = `${pattern.source}/${pattern.flags ?? 'i'}`;
      if (seen.has(identity)) issues.push(`duplicate pattern ${index + 1}: ${identity}`);
      seen.add(identity);
      try {
        new RegExp(pattern.source, pattern.flags ?? 'i');
      } catch (error) {
        issues.push(`invalid pattern ${index + 1}: ${String(error)}`);
        continue;
      }
      const captureCount = captureGroupCount(pattern.source);
      const references = new Set(numericReplacementReferences(pattern.target));
      for (let capture = 1; capture <= captureCount; capture += 1) {
        if (!references.has(capture)) issues.push(`pattern ${index + 1} drops $${capture}: ${pattern.source}`);
      }
      for (const reference of references) {
        if (reference > captureCount) issues.push(`pattern ${index + 1} references missing $${reference}: ${pattern.source}`);
      }
    }
    expect(issues).toEqual([]);
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
      'cơ quan phê duyệt', 'thứ nguyên', 'được giải quyết', 'BAo', 'Đền bù', 'Ứng viên được phỏng vấn',
    ];
    const bad: string[] = [];
    for (const [source, translated] of Object.entries(vi.messages)) {
      for (const artifact of forbidden) if (translated.includes(artifact)) bad.push(`${source} => ${translated}`);
    }
    expect(bad).toEqual([]);
  });
});
