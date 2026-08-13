import { describe, expect, it } from 'vitest';
import {
  getAvailableLanguages,
  getLanguageMetadata,
  translateCatalogMessage,
} from './language-registry';

describe('language catalog registry', () => {
  it('auto-discovers language JSON files', () => {
    const codes = getAvailableLanguages().map((language) => language.code);
    expect(codes).toContain('en');
    expect(codes).toContain('vi');
  });

  it('provides locale metadata for display formatting', () => {
    expect(getLanguageMetadata('vi')).toMatchObject({
      code: 'vi',
      locale: 'vi-VN',
      direction: 'ltr',
    });
    expect(getLanguageMetadata('vi-VN')).toMatchObject({
      code: 'vi',
      locale: 'vi-VN',
    });
  });

  it('translates catalog messages and safely falls back to English source text', () => {
    expect(translateCatalogMessage('vi', 'Dashboard')).toBe('Bảng điều khiển');
    expect(translateCatalogMessage('vi', 'Uncatalogued sentence')).toBe('Uncatalogued sentence');
    expect(translateCatalogMessage('zh-CN', 'Dashboard')).toBe('Dashboard');
  });

  it('uses language-package patterns for dynamic UI sentences', () => {
    expect(translateCatalogMessage('vi-VN', '25 of 100 rows selected for export')).toBe('Đã chọn 25 / 100 dòng để xuất');
  });

  it('translates legacy Vietnamese engine output when English is selected', () => {
    expect(translateCatalogMessage('en', 'Phân tích tồn kho')).toBe('Inventory analysis');
    expect(translateCatalogMessage('en-US', 'Bình quân tồn cuối')).toBe('Average tồn cuối');
    expect(translateCatalogMessage('en', 'Uncatalogued sentence')).toBe('Uncatalogued sentence');
    expect(translateCatalogMessage('en', 'LightBI cho máy tính')).toBe('LightBI Desktop');
    expect(translateCatalogMessage('en', 'Ngôn ngữ hiển thị')).toBe('Display language');
    expect(translateCatalogMessage('en', 'Kho A là nhóm xuất hiện nhiều nhất theo chiều chi nhánh (42.0%, n=21).'))
      .toBe('Kho A appears most often in chi nhánh (42.0%, n=21).');
    expect(translateCatalogMessage('en', 'Tồn cuối kỳ cuối giảm 12.5% so với kỳ đầu trong file.'))
      .toBe('Tồn cuối decreased 12.5% in the final period versus the first period in the file.');
  });

  it('translates dynamic comparison evidence without mixing languages', () => {
    expect(translateCatalogMessage('vi', 'Store A had the largest negative revenue movement (-120).'))
      .toBe('Store A có mức giảm doanh thu lớn nhất (-120).');
    expect(translateCatalogMessage('vi', 'Quantity changed by -86, so volume likely contributed to the movement.'))
      .toBe('Số lượng thay đổi -86, vì vậy biến động sản lượng có thể đã góp phần tạo ra thay đổi này.');
  });

  it('translates every dynamic layer of the deep BA investigation framework', () => {
    const cases: Array<[string, string]> = [
      ['Largest contribution by branch', 'Mức đóng góp lớn nhất theo branch'],
      ['Store A leads this breakdown with 42.5% across 170 rows.', 'Store A đứng đầu phân rã này với 42.5% trên 170 dòng.'],
      ['Inventory health is only partially testable. Verify Aging / dead stock, Turnover before attributing the result to these drivers.', 'Phân rã này hiện chỉ kiểm chứng được một phần. Cần bổ sung các tín hiệu còn thiếu trước khi quy kết kết quả cho các yếu tố này.'],
      ['12 rows are above the IQR threshold and should be reviewed individually.', '12 dòng vượt ngưỡng IQR và cần được kiểm tra riêng.'],
      ['Store A represents 55.0% of the analyzed scope.', 'Store A chiếm 55.0% phạm vi đã phân tích.'],
      ['Which records and sub-groups explain concentration risk?', 'Những bản ghi và nhóm con nào giải thích phát hiện này?'],
      ['Can we add Aging / dead stock, Turnover to test the driver hypothesis?', 'Có thể bổ sung các tín hiệu còn thiếu để kiểm chứng giả thuyết về yếu tố tác động không?'],
      ['Inventory / Stock decomposition is incomplete', 'Phân rã nghiệp vụ chưa đầy đủ'],
      ['Previous period unavailable', 'Chưa có kỳ trước'],
      ['Evidence limitation 2', 'Giới hạn bằng chứng 2'],
    ];
    for (const [source, expected] of cases) expect(translateCatalogMessage('vi', source)).toBe(expected);
  });

  it('keeps generated workbook, perspective, and BA result copy fully Vietnamese', () => {
    const cases: Array<[string, string]> = [
      ['1 file ready', '1 tệp sẵn sàng'],
      ['· 6 sheets', '· 6 trang tính'],
      ['Analyze 2 selected sheets', 'Phân tích 2 trang tính đã chọn'],
      ['331 rows · 9 columns', '331 dòng · 9 cột'],
      ['3 evidence-backed perspectives', '3 góc nhìn dựa trên bằng chứng'],
      ['Business analysis from 331 data rows', 'Phân tích nghiệp vụ từ 331 dòng dữ liệu'],
      ['Business analysis from a representative sample of 1,000 / 14,862 rows', 'Phân tích nghiệp vụ từ mẫu đại diện 1,000 / 14,862 dòng'],
      ['Inventory has moderate data trust and is exploratory only. Main finding: Store A is the largest contributor for record_count.', 'Inventory có độ tin cậy dữ liệu ở mức cần thận trọng và kết quả chỉ mang tính khám phá. Phát hiện chính: Store A là nhóm đóng góp lớn nhất cho record_count.'],
      ['2 unusual values may distort this analysis.', '2 giá trị bất thường có thể làm sai lệch kết quả phân tích.'],
      ['Most extreme: 272,015.23', 'Bất thường nhất: 272,015.23'],
      ['Row 2: 272,015.23', 'Dòng 2: 272,015.23'],
      ['bar chart', 'biểu đồ cột'],
      ['table', 'bảng dữ liệu'],
      ['Aging / dead stock', 'Tuổi tồn / hàng chết'],
      ['HIGH', 'CAO'],
      ['6 sources contain 3 business roles across 2 reporting periods.', '6 nguồn chứa 3 vai trò nghiệp vụ trong 2 kỳ báo cáo.'],
      ['2 sources · 1 business role · 2 periods', '2 nguồn · 1 vai trò nghiệp vụ · 2 kỳ'],
      ['LightBI analyzed 2 complete sources across 2 reporting periods.', 'LightBI đã phân tích đầy đủ 2 nguồn trong 2 kỳ báo cáo.'],
      ['Sales Revenue has the largest relative movement (10.2%). This is the strongest place to begin; it is an observation, not yet a cause.', 'Sales Revenue có mức biến động tương đối lớn nhất (10.2%). Đây là điểm nên kiểm tra đầu tiên; hiện mới là quan sát, chưa phải kết luận nguyên nhân.'],
      ['What drove the change in Sales Revenue from 2026-05 to 2026-06?', 'Yếu tố nào liên quan đến thay đổi của Sales Revenue từ 2026-05 đến 2026-06?'],
      ['Using VND from Settings.', 'Đang sử dụng VND từ Cài đặt.'],
      ['Governed restriction: The action-candidate limitation remains active.', 'Hạn chế quản trị: Giới hạn đối với hành động đề xuất vẫn đang được áp dụng.'],
    ];
    for (const [source, expected] of cases) expect(translateCatalogMessage('vi', source)).toBe(expected);
  });
});
