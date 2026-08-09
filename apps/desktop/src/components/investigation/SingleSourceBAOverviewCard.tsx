import React from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, Lightbulb, TrendingDown, TrendingUp } from 'lucide-react';
import type { SingleSourceBAOverview, SingleSourceKpi } from '../../lib/single-source-ba-overview';
import type { DisplayPreferences } from '../../stores/display-preferences-store';
import { pickUiText, useUiLanguage, type UiLanguage } from '../../lib/ui-language';

const EN_SINGLE_SOURCE_TEXT: Record<string, string> = {
  'Phân tích hoạt động & hiệu suất': 'Activity & performance analysis',
  'Phân tích dữ liệu theo góc nhìn đã chọn': 'Selected-perspective data analysis',
  'Phân tích khách hàng': 'Customer analysis',
  'Phân tích tài chính': 'Financial analysis',
  'Phân tích hiệu suất': 'Performance analysis',
  'Phân tích khách hàng & kết quả': 'Customer & outcome analysis',
  'Phân tích tài chính & kết quả': 'Financial & outcome analysis',
  'Phân tích hiệu suất & kết quả': 'Performance & outcome analysis',
  'Phân tích tồn kho': 'Inventory analysis',
  'Phân tích vận hành & logistics': 'Operations & logistics analysis',
  'Phân tích doanh thu': 'Revenue analysis',
  'Bản ghi tập trung ở nhóm nào?': 'Where are records concentrated?',
  'Kết quả khác nhau theo nhóm nào?': 'How do outcomes differ by group?',
  'Tồn kho tập trung ở đâu?': 'Where is inventory concentrated?',
  'Hoạt động phân bố ở đâu?': 'Where is operational activity concentrated?',
  'Doanh thu đến từ đâu?': 'Where does revenue come from?',
  'Số bản ghi': 'Records',
  'Số trường dữ liệu': 'Data fields',
  'Mức đầy đủ dữ liệu': 'Data completeness',
  'Tỷ lệ kết quả tích cực': 'Positive outcome rate',
  'Thời lượng bình quân': 'Average duration',
  'Số lần tương tác bình quân': 'Average interactions',
  'Bản ghi tồn kho': 'Inventory records',
  'Lượt giao hàng': 'Deliveries',
  'Tổng chi phí giao hàng': 'Total delivery cost',
  'Tổng giá trị COD': 'Total COD exposure',
  'Tổng lượng tồn': 'Total inventory',
  'Thời gian chờ bình quân': 'Average waiting time',
  'Tỷ lệ hoàn tất/đúng hẹn': 'Completion/on-time rate',
  'Doanh thu': 'Revenue',
  'Số đơn hàng': 'Orders',
  'Số lượng bán': 'Quantity sold',
  'Doanh thu bình quân/đơn': 'Average order value',
  'Chiết khấu bình quân': 'Average discount',
  'Tổng chiết khấu': 'Total discount',
  'Kho': 'Warehouse',
  'Sản phẩm': 'Product',
  'Nhóm hàng': 'Category',
  'Trạng thái': 'Status',
  'Trạng thái giao hàng': 'Delivery status',
  'Vị trí hiện tại': 'Current location',
  'Dịch vụ': 'Service',
  'Đơn vị vận chuyển': 'Carrier',
  'Kho / trung tâm': 'Warehouse / hub',
  'Tuyến': 'Route',
  'Nơi gửi': 'Origin',
  'Nơi nhận': 'Destination',
  'Tài xế': 'Driver',
  'Phương tiện': 'Vehicle',
  'Ngành hàng': 'Category',
  'Thương hiệu': 'Brand',
  'Chi nhánh / cửa hàng': 'Branch / store',
  'Nhân viên bán hàng': 'Salesperson',
  'Phương thức thanh toán': 'Payment method',
  'Trạng thái đơn hàng': 'Order status',
  'Kết quả mô tả phân bố và ngoại lệ trong dữ liệu, không tự khẳng định quan hệ nhân quả.': 'The result describes distributions and exceptions in the data; it does not establish causality.',
  'Kết quả mô tả mối liên hệ và mức đóng góp trong dữ liệu, không tự khẳng định quan hệ nhân quả.': 'The result describes relationships and contribution in the data; it does not establish causality.',
  'File chưa có đủ nhiều kỳ thời gian để đánh giá xu hướng đáng tin cậy.': 'The file does not contain enough time periods for a reliable trend assessment.',
  'Không tìm thấy định danh đơn hàng; số bản ghi không được diễn giải thành số đơn hàng.': 'No order identity was found; record count is not interpreted as order count.',
  'Không có trường thời gian hàng-dòng đủ rõ để so sánh xu hướng theo kỳ.': 'No sufficiently clear row-level time field is available for period trend comparison.',
  'Không có mốc thời gian đủ rõ để so sánh xu hướng theo kỳ.': 'No sufficiently clear time field is available for period trend comparison.',
  'Mở nhóm lớn nhất và nhóm ít xuất hiện để kiểm tra cấu trúc, ngoại lệ và tính đại diện.': 'Open the largest and least frequent groups to review structure, exceptions, and representativeness.',
  'Xác nhận ý nghĩa nghiệp vụ của các trường phân loại trước khi dùng phân bố để ra quyết định.': 'Confirm the business meaning of categorical fields before using their distribution for decisions.',
  'Chọn thêm một chỉ số số học hoặc mục tiêu nếu cần so sánh hiệu quả giữa các nhóm.': 'Select an additional numeric metric or target when comparing performance between groups.',
  'So sánh nhóm cao và thấp theo đúng chiều phân tích đã chọn; kiểm tra cỡ mẫu trước khi ưu tiên hành động.': 'Compare high and low groups within the selected dimension and verify sample sizes before prioritizing action.',
  'Mở các bản ghi của nhóm chênh lệch lớn nhất để xác nhận chất lượng dữ liệu và bối cảnh vận hành.': 'Open records from the group with the largest gap to confirm data quality and operational context.',
  'Đối chiếu thêm mục tiêu hoặc kỳ chuẩn nếu nguồn có cung cấp; kết quả mô tả không tự chứng minh quan hệ nhân quả.': 'Compare against a target or baseline period when available; descriptive results do not establish causality.',
  'Các chỉ số được mô tả theo dữ liệu nguồn và góc nhìn đã chọn; chưa có bằng chứng để suy luận quan hệ nhân quả.': 'Metrics are described from source evidence and the selected perspective; there is no evidence for causal inference.',
  'So sánh nhóm có tỷ lệ kết quả cao và thấp, đồng thời kiểm tra cỡ mẫu trước khi hành động.': 'Compare groups with high and low outcome rates and verify sample sizes before acting.',
  'Kiểm tra kênh, phân khúc và mức tương tác có liên hệ với kết quả; không diễn giải thành quan hệ nhân quả.': 'Check how channel, segment, and interaction level relate to outcomes without interpreting the relationship as causal.',
  'Mở các bản ghi của nhóm yếu nhất để xác nhận chất lượng dữ liệu và tìm nguyên nhân vận hành.': 'Open records from the weakest group to confirm data quality and investigate operational causes.',
  'Tỷ lệ được tính từ nhãn kết quả có trong nguồn; cần xác nhận ý nghĩa nghiệp vụ của giá trị tích cực.': 'Rates are calculated from outcome labels in the source; confirm the business meaning of a positive value.',
  'Dữ liệu mô tả mối liên hệ theo nhóm, không tự chứng minh tác động nhân quả.': 'The data describes group-level relationships and does not establish causal impact.',
  'Kiểm tra các kho và mặt hàng tập trung lớn nhất.': 'Review the warehouses and items with the largest concentrations.',
  'Đối chiếu nhóm tồn thấp, tồn cao và dữ liệu thiếu trước khi điều chuyển hàng.': 'Compare low-stock, high-stock, and missing-data groups before transferring inventory.',
  'Theo dõi biến động theo kỳ và xác nhận đơn vị đo.': 'Track period movement and confirm units of measure.',
  'Kiểm tra nhóm trạng thái, tuyến hoặc đơn vị vận chuyển có ngoại lệ lớn nhất.': 'Review the status, route, or carrier group with the largest exception.',
  'Đối chiếu thời gian chờ, chi phí và tỷ lệ đúng hẹn theo kho hoặc tuyến.': 'Compare waiting time, cost, and on-time rate by warehouse or route.',
  'Mở các bản ghi bất thường trước khi điều chỉnh năng lực vận hành.': 'Open anomalous records before changing operational capacity.',
  'Mở nhóm đóng góp lớn nhất để kiểm tra sản phẩm, cửa hàng và nhân viên tạo ra kết quả.': 'Open the largest contribution group to review the products, stores, and staff behind the result.',
  'So sánh nhóm tăng trưởng với nhóm suy giảm trước khi thay đổi giá, chiết khấu hoặc phân bổ nguồn lực.': 'Compare growing and declining groups before changing price, discount, or resource allocation.',
  'Kiểm tra các dòng bất thường và chất lượng dữ liệu trước khi dùng kết quả cho quyết định tài chính.': 'Review anomalous rows and data quality before using the result for a financial decision.',
};

function overviewText(language: UiLanguage, value: string): string {
  const english = EN_SINGLE_SOURCE_TEXT[value] ?? value
    .replace(/^Bình quân (.+)$/i, 'Average $1')
    .replace(/^Thấp nhất (.+)$/i, 'Minimum $1')
    .replace(/^Cao nhất (.+)$/i, 'Maximum $1')
    .replace(/^Chỉ số (.+) khác nhau theo nhóm nào\?$/i, 'How does $1 differ by group?')
    .replace(/^Doanh thu kỳ cuối (tăng|giảm) (.+)% so với kỳ đầu trong file\.$/i, (_match, direction, change) => `Revenue in the final period ${direction === 'tăng' ? 'increased' : 'decreased'} ${change}% versus the first period in the file.`)
    .replace(/^Có ([\d,.]+) dòng doanh thu cao bất thường theo ngưỡng IQR, nên kiểm tra trước khi ra quyết định\.$/i, 'There are $1 unusually high-revenue rows under the IQR rule; review them before making a decision.')
    .replace(/^(.+) đóng góp (.+)% doanh thu, là nhóm đóng góp lớn nhất\.$/i, '$1 contributes $2% of revenue, the largest contribution group.')
    .replace(/^(.+) là nhóm lớn nhất, chiếm (.+)% phạm vi đã phân tích\.$/i, '$1 is the largest group, representing $2% of the analyzed scope.')
    .replace(/^Có ([\d,.]+) bản ghi thời gian chờ cao bất thường theo ngưỡng IQR\.$/i, 'There are $1 unusually high waiting-time records under the IQR rule.')
    .replace(/^([\d,.]+) trong ([\d,.]+) bản ghi có kết quả tích cực \((.+)%\)\.$/i, '$1 of $2 records have a positive outcome ($3%).')
    .replace(/^(.+) là nhóm lớn nhất trong chiều (.+) \((.+)%, n=(.+)\)\.$/i, '$1 is the largest group in $2 ($3%, n=$4).')
    .replace(/^(.+) là nhóm nhỏ nhất trong chiều (.+) \((.+)%, n=(.+)\)\.$/i, '$1 is the smallest group in $2 ($3%, n=$4).')
    .replace(/^(.+) có tỷ lệ kết quả tích cực cao nhất trong chiều (.+) \((.+)%, n=(.+)\)\.$/i, '$1 has the highest positive outcome rate in $2 ($3%, n=$4).')
    .replace(/^(.+) là nhóm cần xem trước trong chiều (.+) \((.+)%, n=(.+)\)\.$/i, '$1 is the first group to review in $2 ($3%, n=$4).')
    .replace(/^([\d,.]+) trong ([\d,.]+) bản ghi có trạng thái hoàn tất hoặc đúng hẹn\.$/i, '$1 of $2 records have a completed or on-time status.')
    .replace(/^Trạng thái có ([\d,.]+) giá trị; LightBI chỉ phân tích phân bố và không tự gán mã trạng thái thành hoàn tất\/đúng hẹn\.$/i, 'Status has $1 values; LightBI analyzes their distribution without relabeling status codes as completed or on-time.')
    .replace(/^Chỉ số (.+) có giá trị bình quân (.+), thấp nhất (.+) và cao nhất (.+)\.$/i, '$1 averages $2, with a minimum of $3 and a maximum of $4.')
    .replace(/^(.+) có mức bình quân (.+) cao nhất trong chiều (.+) \((.+), n=(.+)\)\.$/i, '$1 has the highest average $2 in $3 ($4, n=$5).')
    .replace(/^(.+) là nhóm cần kiểm tra trước trong chiều (.+) \((.+), n=(.+)\)\.$/i, '$1 is the first group to review in $2 ($3, n=$4).')
    .replace(/^Theo (.+)$/i, 'By $1');
  return pickUiText(language, english);
}

function formatKpi(kpi: SingleSourceKpi, preferences: DisplayPreferences): string {
  if (kpi.kind === 'money') return new Intl.NumberFormat(preferences.locale, {
    style: preferences.currencyDisplay === 'none' ? 'decimal' : 'currency',
    currency: preferences.currencyCode,
    currencyDisplay: preferences.currencyDisplay === 'code' ? 'code' : 'symbol',
    maximumFractionDigits: 0,
  }).format(kpi.value);
  if (kpi.kind === 'percent') return new Intl.NumberFormat(preferences.locale, { style: 'percent', maximumFractionDigits: 1 }).format(kpi.value);
  return new Intl.NumberFormat(preferences.locale, { maximumFractionDigits: 2 }).format(kpi.value);
}

function formatMoney(value: number, preferences: DisplayPreferences): string {
  return formatKpi({ id: '', label: '', value, kind: 'money' }, preferences);
}

export const SingleSourceBAOverviewCard: React.FC<{
  overview: SingleSourceBAOverview;
  preferences: DisplayPreferences;
}> = ({ overview, preferences }) => {
  const { language, t } = useUiLanguage();
  const positiveTrend = (overview.trendChange ?? 0) >= 0;
  return <div className="mb-5 overflow-hidden rounded-[20px] border border-emerald-200 bg-emerald-50/50 shadow-sm" data-testid="single-source-ba-overview">
    <header className="border-b border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-blue-50 px-6 py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700"><CheckCircle2 className="h-4 w-4" />{overviewText(language, overview.analysisLabel)}</div>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">{overview.isRepresentativeSample ? t(`Business analysis from a representative sample of ${overview.rowCount.toLocaleString(preferences.locale)} / ${overview.sourceRowCount.toLocaleString(preferences.locale)} rows`) : t(`Business analysis from ${overview.rowCount.toLocaleString(preferences.locale)} data rows`)}</h3>
          <p className="mt-1 max-w-3xl text-[13px] leading-5 text-slate-600">{overview.isRepresentativeSample ? t('The segments and exceptions below are inferred from a representative sample; chart metrics are still calculated by the governed engine over the full source.') : t('LightBI summarized metrics, trends, contribution, and exceptions from the full file—not only the points visible in the chart.')}</p>
        </div>
        {overview.trendChange !== null && <div className={`flex min-w-[170px] items-center gap-3 rounded-xl border bg-white px-4 py-3 ${positiveTrend ? 'border-emerald-200' : 'border-red-200'}`}>
          {positiveTrend ? <TrendingUp className="h-5 w-5 text-emerald-600" /> : <TrendingDown className="h-5 w-5 text-red-600" />}
          <div><div className="text-[10px] uppercase text-slate-400">{t('Final vs first period')}</div><div className={`text-lg font-bold ${positiveTrend ? 'text-emerald-700' : 'text-red-700'}`}>{positiveTrend ? '+' : ''}{(overview.trendChange * 100).toFixed(1)}%</div></div>
        </div>}
      </div>
    </header>

    <div className="space-y-5 p-5">
      <section>
        <h4 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600"><BarChart3 className="h-4 w-4 text-blue-600" />{t('Key metrics')}</h4>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {overview.kpis.map(kpi => <div key={kpi.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-[11px] font-semibold uppercase text-slate-400">{overviewText(language, kpi.label)}</div>
            <div className="mt-1 break-words text-xl font-bold text-slate-950">{formatKpi(kpi, preferences)}</div>
          </div>)}
        </div>
      </section>

      {overview.findings.length > 0 && <section className="grid gap-3 lg:grid-cols-3">
        {overview.findings.map((finding, index) => <div key={finding} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-amber-700"><Lightbulb className="h-4 w-4" />{t('Finding')} {index + 1}</div>
          <p className="mt-2 text-[13px] leading-5 text-amber-950">{overviewText(language, finding)}</p>
        </div>)}
      </section>}

      {overview.breakdowns.length > 0 && <section>
        <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-slate-600">{overviewText(language, overview.breakdownHeading)}</h4>
        <div className="grid gap-4 lg:grid-cols-2">
          {overview.breakdowns.map(breakdown => <article key={breakdown.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3"><h5 className="text-[14px] font-semibold text-slate-900">{t('By')} {overviewText(language, breakdown.label).toLocaleLowerCase(preferences.locale)}</h5><span className="text-[10px] text-slate-400">{breakdown.physicalColumn}</span></div>
            <div className="mt-3 space-y-3">
              {breakdown.top.map((entry, index) => <div key={entry.label}>
                <div className="mb-1 flex items-center justify-between gap-3 text-[12px]"><span className="min-w-0 truncate font-medium text-slate-700">{index + 1}. {entry.label}</span><span className="shrink-0 text-slate-500">{breakdown.valueKind === 'money' ? formatMoney(entry.value, preferences) : formatKpi({ id: '', label: '', value: entry.value, kind: breakdown.valueKind === 'percent' ? 'percent' : 'number' }, preferences)} · {breakdown.valueKind === 'percent' ? `n=${entry.rowCount.toLocaleString(preferences.locale)}` : `${(entry.share * 100).toFixed(1)}%`}</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(2, entry.share * 100)}%` }} /></div>
              </div>)}
            </div>
          </article>)}
        </div>
      </section>}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-white p-4">
          <h4 className="text-[12px] font-semibold uppercase tracking-wide text-emerald-700">{t('What should happen next?')}</h4>
          <ol className="mt-3 space-y-2 text-[13px] leading-5 text-slate-700">
            {overview.recommendedActions.map((item, index) => <li key={item}>{index + 1}. {overviewText(language, item)}</li>)}
          </ol>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h4 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-amber-700"><AlertTriangle className="h-4 w-4" />{t('Evidence limitations')}</h4>
          <ul className="mt-3 space-y-2 text-[12px] leading-5 text-amber-950">{overview.limitations.map(item => <li key={item}>• {overviewText(language, item)}</li>)}</ul>
        </div>
      </section>
    </div>
  </div>;
};
