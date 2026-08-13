import { describe, expect, it } from 'vitest';
import { localizeBusinessText, localizeUiSurfaceText, pickUiText } from './ui-language';

describe('shared UI language boundary', () => {
  it('keeps English engine contracts unchanged in English mode', () => {
    const source = 'sales_revenue was calculated from 1,500 full-source rows.';
    expect(localizeBusinessText('en', source)).toBe(source);
    expect(pickUiText('en', 'Back', 'Quay lại')).toBe('Back');
  });

  it('localizes generated BA evidence without depending on a sample filename', () => {
    expect(localizeBusinessText('vi', 'sales_revenue was calculated from 1,500 full-source rows.'))
      .toBe('sales_revenue được tính từ 1,500 dòng của toàn bộ nguồn.');
    expect(localizeBusinessText('vi', 'Route A is the largest contributor for delivery_count.'))
      .toBe('Route A là nhóm đóng góp lớn nhất cho delivery_count.');
    expect(localizeBusinessText('vi', 'sales_revenue decreased from 2026-05 to 2026-06.'))
      .toBe('sales_revenue giảm từ 2026-05 đến 2026-06.');
  });

  it('localizes common evidence and decision labels', () => {
    expect(localizeBusinessText('vi', 'Governed analysis scope')).toBe('Phạm vi phân tích có quản trị');
    expect(localizeBusinessText('vi', 'This decision brief is based on full file execution.'))
      .toBe('Bản phân tích này dựa trên việc thực thi toàn bộ tệp dữ liệu.');
  });
  it('localizes canonical question titles and purposes through one shared boundary', () => {
    expect(localizeBusinessText('vi', 'How many governed deliveries are present?'))
      .toBe('Có bao nhiêu lượt giao hàng hợp lệ?');
    expect(localizeBusinessText('vi', 'How is governed gross profit changing over compatible periods?'))
      .toBe('Lợi nhuận gộp thay đổi như thế nào giữa các kỳ có thể so sánh?');
    expect(localizeBusinessText('vi', 'Review governed sales revenue across compatible event or reporting-period basis.'))
      .toBe('Phân tích sales revenue trên các kỳ sự kiện hoặc kỳ báo cáo có thể so sánh.');
  });

  it('localizes legacy and dynamic presentation copy without changing data values', () => {
    expect(localizeUiSurfaceText('vi', 'Analysis Blocked')).toBe('Phân tích đã bị chặn');
    expect(localizeUiSurfaceText('vi', 'Ready now: 4')).toBe('Sẵn sàng: 4');
    expect(localizeUiSurfaceText('vi', '2,243 rows matched: Ngưỡng tồn = ton3-7ngay'))
      .toBe('2,243 dòng phù hợp: Ngưỡng tồn = ton3-7ngay');
    expect(localizeUiSurfaceText('vi', 'Mã kho xuất')).toBe('Mã kho xuất');
    expect(localizeUiSurfaceText('en', 'Analysis Blocked')).toBe('Analysis Blocked');
  });
});
