import { useDisplayPreferences } from '../stores/display-preferences-store';

export type UiLanguage = 'en' | 'vi';

export function pickUiText(language: UiLanguage, english: string, vietnamese: string): string {
  return language === 'vi' ? vietnamese : english;
}

const VI_BUSINESS_TEXT: Record<string, string> = {
  'Governed analysis scope': 'Phạm vi phân tích có quản trị',
  'Result coverage': 'Phạm vi kết quả',
  'Data reliability caveats': 'Lưu ý về độ tin cậy dữ liệu',
  'Validate before operational action': 'Xác minh trước khi hành động vận hành',
  'Investigate risk drivers': 'Điều tra các tác nhân rủi ro',
  'Primary chart generated from the executed preview result.': 'Biểu đồ chính được tạo từ kết quả phân tích đã thực thi.',
  'This decision brief is based on full file execution.': 'Bản phân tích này dựa trên việc thực thi toàn bộ tệp dữ liệu.',
  'LightBI found caveats that may affect the decision.': 'LightBI phát hiện các lưu ý có thể ảnh hưởng đến quyết định.',
  'Run or refine the preview to expose stronger business insights.': 'Hãy chạy hoặc tinh chỉnh phân tích để làm rõ thêm các phát hiện nghiệp vụ.',
  'The action-candidate limitation remains active.': 'Giới hạn đối với hành động đề xuất vẫn đang được áp dụng.',
  'The metric preflight limitation remains active.': 'Giới hạn kiểm tra chỉ số trước khi chạy vẫn đang được áp dụng.',
  'How is sales revenue changing over time?': 'Doanh thu bán hàng thay đổi như thế nào theo thời gian?',
  'Which products contribute the most sales revenue?': 'Sản phẩm nào đóng góp nhiều doanh thu nhất?',
  'Which stores or warehouses contribute the most sales revenue?': 'Cửa hàng hoặc kho nào đóng góp nhiều doanh thu nhất?',
  'Which product categories contribute the most sales revenue?': 'Ngành hàng nào đóng góp nhiều doanh thu nhất?',
  'Which salespeople contribute the most sales revenue?': 'Nhân viên bán hàng nào đóng góp nhiều doanh thu nhất?',
  'How is sales revenue distributed by payment method?': 'Doanh thu phân bổ theo phương thức thanh toán như thế nào?',
  'How is quantity sold changing over time?': 'Số lượng bán thay đổi như thế nào theo thời gian?',
  'Which products account for the most quantity sold?': 'Sản phẩm nào có số lượng bán cao nhất?',
  'How many governed commercial transactions are present?': 'Có bao nhiêu giao dịch thương mại hợp lệ?',
  'What inventory is on hand at the available as-of basis?': 'Tồn kho hiện có tại thời điểm ghi nhận là bao nhiêu?',
  'Which items hold the most inventory at the as-of basis?': 'Mặt hàng nào có lượng tồn kho cao nhất tại thời điểm ghi nhận?',
  'Which warehouses hold the most inventory at the as-of basis?': 'Kho nào có lượng tồn kho cao nhất tại thời điểm ghi nhận?',
  'What is the inventory balance for each item and warehouse at the as-of basis?': 'Tồn kho theo từng mặt hàng và kho tại thời điểm ghi nhận là bao nhiêu?',
  'How many governed deliveries are present?': 'Có bao nhiêu lượt giao hàng hợp lệ?',
  'How are governed deliveries distributed by status?': 'Các lượt giao hàng phân bổ theo trạng thái như thế nào?',
  'Which deliveries are on time or delayed?': 'Những lượt giao hàng nào đúng giờ hoặc bị trễ?',
  'Which routes handle the most deliveries?': 'Tuyến nào xử lý nhiều lượt giao hàng nhất?',
  'Which vehicles handle the most deliveries?': 'Phương tiện nào thực hiện nhiều lượt giao hàng nhất?',
  'How are deliveries distributed by driver?': 'Các lượt giao hàng phân bổ theo tài xế như thế nào?',
  'How is delivery volume changing over time?': 'Sản lượng giao hàng thay đổi như thế nào theo thời gian?',
  'Which vehicles have on-time or delayed deliveries?': 'Phương tiện nào giao đúng giờ hoặc bị trễ?',
  'How are governed shipments distributed by current location?': 'Các lô hàng phân bổ theo vị trí hiện tại như thế nào?',
  'How are governed shipments distributed by service group?': 'Các lô hàng phân bổ theo nhóm dịch vụ như thế nào?',
  'How are governed shipments distributed by load status?': 'Các lô hàng phân bổ theo trạng thái tải như thế nào?',
  'How are governed shipments distributed by stock age?': 'Các lô hàng phân bổ theo tuổi tồn như thế nào?',
  'How many governed trips are present?': 'Có bao nhiêu chuyến vận chuyển hợp lệ?',
  'Which routes carry the most governed trips?': 'Tuyến nào có nhiều chuyến vận chuyển nhất?',
  'How are governed trips distributed by driver?': 'Các chuyến vận chuyển phân bổ theo tài xế như thế nào?',
  'How are governed trips distributed by on-time status?': 'Các chuyến vận chuyển phân bổ theo trạng thái đúng giờ như thế nào?',
  'What is the governed average quality score?': 'Điểm chất lượng trung bình hợp lệ là bao nhiêu?',
  'How does quality score vary by performance rank?': 'Điểm chất lượng thay đổi theo xếp hạng hiệu suất như thế nào?',
  'How are source records distributed by team or group?': 'Các bản ghi phân bổ theo đội hoặc nhóm như thế nào?',
  'How are source records distributed by role or position?': 'Các bản ghi phân bổ theo vai trò hoặc vị trí như thế nào?',
  'How are source records distributed by person or participant?': 'Các bản ghi phân bổ theo cá nhân hoặc người tham gia như thế nào?',
  'How are source records distributed by coach or lead?': 'Các bản ghi phân bổ theo người hướng dẫn hoặc trưởng nhóm như thế nào?',
  'How are source records distributed by previous campaign outcome?': 'Các bản ghi phân bổ theo kết quả chiến dịch trước như thế nào?',
  'How are source records distributed by customer segment?': 'Các bản ghi phân bổ theo phân khúc khách hàng như thế nào?',
  'How are source records distributed by contact?': 'Các bản ghi phân bổ theo hình thức liên hệ như thế nào?',
  'How are source records distributed by campaign?': 'Các bản ghi phân bổ theo chiến dịch như thế nào?',
  'How is governed gross profit changing over compatible periods?': 'Lợi nhuận gộp thay đổi như thế nào giữa các kỳ có thể so sánh?',
  'Status breakdown': 'Phân bổ theo trạng thái',
  'Inventory aging and backlog risk': 'Tuổi tồn kho và rủi ro tồn đọng',
  'Inventory value exposure': 'Giá trị tồn kho có rủi ro',
  'Stock movement and quantity flow': 'Biến động kho và luồng số lượng',
  'Catalog composition by category': 'Cơ cấu danh mục theo nhóm',
  'Catalog records by product or item': 'Danh mục theo sản phẩm hoặc mặt hàng',
  'Operational workload by owner or manager': 'Khối lượng vận hành theo người phụ trách',
  'Review mappings and source evidence': 'Xem lại ánh xạ và bằng chứng nguồn',
  'Ready now': 'Sẵn sàng',
  'Needs confirmation': 'Cần xác nhận',
  'Needs mapping review': 'Cần xem lại ánh xạ',
  'Safety blocked': 'Đã chặn để an toàn',
  'Unsupported': 'Chưa hỗ trợ',
  'Filtered rows from chart': 'Các dòng được lọc từ biểu đồ',
  'Clear selection': 'Bỏ lựa chọn',
  'Record count': 'Số bản ghi',
  'Row count': 'Số dòng',
};

/**
 * Localizes deterministic text emitted by the analysis engines. The engines
 * keep stable English contracts; presentation surfaces translate them here so
 * every source type (single, multi-file, connector, or future plugin) behaves
 * consistently without dataset-specific branches.
 */
export function localizeBusinessText(language: UiLanguage, value: string | null | undefined): string {
  const text = String(value ?? '').trim();
  if (!text || language !== 'vi') return text;
  if (VI_BUSINESS_TEXT[text]) return VI_BUSINESS_TEXT[text];

  const rules: Array<[RegExp, (...parts: string[]) => string]> = [
    [/^Review governed (.+) across compatible event or reporting-period basis\.$/i, subject => `Phân tích ${subject} trên các kỳ sự kiện hoặc kỳ báo cáo có thể so sánh.`],
    [/^Rank governed (.+) by a compatible (.+) dimension\.$/i, (metric, dimension) => `Xếp hạng ${metric} theo chiều phân tích ${dimension} phù hợp.`],
    [/^Describe governed (.+) by a canonically resolved (.+) without claiming channel causality\.$/i, (metric, dimension) => `Mô tả ${metric} theo ${dimension} đã được nhận diện, không suy diễn quan hệ nhân quả.`],
    [/^Count governed (.+) identities without relabeling (.+) as (.+)\.$/i, (entity, excluded, label) => `Đếm định danh ${entity} hợp lệ mà không gán nhầm ${excluded} thành ${label}.`],
    [/^Break down governed (.+) identities by a canonically resolved (.+)\.$/i, (entity, dimension) => `Phân tích định danh ${entity} hợp lệ theo ${dimension} đã được nhận diện.`],
    [/^(.+) was calculated from ([\d,.]+) full-source rows\.$/i, (metric, rows) => `${metric} được tính từ ${rows} dòng của toàn bộ nguồn.`],
    [/^(.+) is the largest contributor for (.+)\.$/i, (group, metric) => `${group} là nhóm đóng góp lớn nhất cho ${metric}.`],
    [/^(.+) is the weakest group in this preview result\.$/i, group => `${group} là nhóm thấp nhất trong kết quả phân tích.`],
    [/^(.+) varies sharply across (.+) segments\.$/i, (metric, dimension) => `${metric} biến động mạnh giữa các nhóm ${dimension}.`],
    [/^(.+) (increased|decreased) from (.+) to (.+)\.$/i, (metric, direction, from, to) => `${metric} ${direction.toLowerCase() === 'increased' ? 'tăng' : 'giảm'} từ ${from} đến ${to}.`],
    [/^(.+) (increased|decreased) in the latest period compared with the previous period\.$/i, (metric, direction) => `${metric} ${direction.toLowerCase() === 'increased' ? 'tăng' : 'giảm'} ở kỳ mới nhất so với kỳ trước.`],
    [/^(.+) has (low|moderate|high) data trust and is exploratory only\.(.*)$/i, (source, level, suffix) => `${source} có độ tin cậy dữ liệu ${level.toLowerCase() === 'high' ? 'cao' : level.toLowerCase() === 'moderate' ? 'trung bình' : 'thấp'} và kết quả chỉ mang tính khám phá.${suffix}`],
    [/^(.+) full-source rows\.$/i, rows => `${rows} dòng của toàn bộ nguồn.`],
    [/^Rows returned: (.+)$/i, rows => `Số dòng trả về: ${rows}`],
    [/^Reported row count: (.+)$/i, rows => `Số dòng báo cáo: ${rows}`],
    [/^Execution scope: full file$/i, () => 'Phạm vi thực thi: toàn bộ tệp'],
    [/^Perspective: (.+)$/i, perspective => `Góc nhìn: ${perspective}`],
    [/^Highest: (.+)$/i, value => `Cao nhất: ${value}`],
    [/^Lowest: (.+)$/i, value => `Thấp nhất: ${value}`],
    [/^Median (group value|segment): (.+)$/i, (_kind, value) => `Trung vị: ${value}`],
    [/^Gap to median: (.+)$/i, value => `Chênh lệch so với trung vị: ${value}`],
    [/^Top share: (.+)$/i, value => `Tỷ trọng nhóm đầu: ${value}`],
    [/^Top 3 share: (.+)$/i, value => `Tỷ trọng 3 nhóm đầu: ${value}`],
    [/^Change: (.+)$/i, value => `Thay đổi: ${value}`],
    [/^Period change: (.+)$/i, value => `Thay đổi theo kỳ: ${value}`],
    [/^Top (.+) drives (.+)$/i, (dimension, metric) => `${dimension} đóng góp cao nhất cho ${metric}`],
    [/^Lowest (.+) by (.+)$/i, (dimension, metric) => `${dimension} thấp nhất theo ${metric}`],
    [/^Segment spread in (.+)$/i, dimension => `Mức phân tán giữa các nhóm ${dimension}`],
    [/^Outlier risk in (.+)$/i, metric => `Rủi ro giá trị bất thường của ${metric}`],
    [/^How are governed (.+) distributed by (.+)\?$/i, (entity, dimension) => `${entity} hợp lệ phân bổ theo ${dimension} như thế nào?`],
    [/^Which (.+) contains the most (.+)\?$/i, (dimension, metric) => `${dimension} nào có ${metric} lớn nhất?`],
  ];

  for (const [pattern, translate] of rules) {
    const match = text.match(pattern);
    if (match) return translate(...match.slice(1));
  }

  return text
    .replace(/^Governed restriction:\s*/i, 'Giới hạn quản trị: ')
    .replace(/Primary chart generated from the executed preview result\.?/gi, 'Biểu đồ chính được tạo từ kết quả phân tích đã thực thi.')
    .replace(/full-source rows/gi, 'dòng của toàn bộ nguồn')
    .replace(/sales revenue/gi, 'doanh thu bán hàng')
    .replace(/delivery count/gi, 'số lượt giao hàng')
    .replace(/record_count/gi, 'số bản ghi')
    .replace(/row_count/gi, 'số dòng')
    .replace(/current location/gi, 'vị trí hiện tại')
    .replace(/service group/gi, 'nhóm dịch vụ')
    .replace(/load status/gi, 'trạng thái tải')
    .replace(/stock age/gi, 'tuổi tồn')
    .replace(/owner or manager/gi, 'người phụ trách');
}

export function useUiLanguage() {
  const language = useDisplayPreferences((state) => state.preferences.language);
  return {
    language,
    t: (english: string, vietnamese: string) => pickUiText(language, english, vietnamese),
    localize: (value: string | null | undefined) => localizeBusinessText(language, value),
  };
}
