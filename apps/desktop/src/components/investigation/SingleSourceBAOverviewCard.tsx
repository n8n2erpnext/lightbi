import React from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, Lightbulb, TrendingDown, TrendingUp } from 'lucide-react';
import type { SingleSourceBAOverview, SingleSourceKpi } from '../../lib/single-source-ba-overview';
import type { DisplayPreferences } from '../../stores/display-preferences-store';

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
  const positiveTrend = (overview.trendChange ?? 0) >= 0;
  return <div className="mb-5 overflow-hidden rounded-[20px] border border-emerald-200 bg-emerald-50/50 shadow-sm" data-testid="single-source-ba-overview">
    <header className="border-b border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-blue-50 px-6 py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700"><CheckCircle2 className="h-4 w-4" />Phân tích toàn bộ nguồn</div>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">Bản phân tích nghiệp vụ từ {overview.rowCount.toLocaleString(preferences.locale)} dòng dữ liệu</h3>
          <p className="mt-1 max-w-3xl text-[13px] leading-5 text-slate-600">LightBI đã tổng hợp chỉ số, xu hướng, mức đóng góp và bất thường từ toàn bộ file — không chỉ từ các điểm đang hiện trên biểu đồ.</p>
        </div>
        {overview.trendChange !== null && <div className={`flex min-w-[170px] items-center gap-3 rounded-xl border bg-white px-4 py-3 ${positiveTrend ? 'border-emerald-200' : 'border-red-200'}`}>
          {positiveTrend ? <TrendingUp className="h-5 w-5 text-emerald-600" /> : <TrendingDown className="h-5 w-5 text-red-600" />}
          <div><div className="text-[10px] uppercase text-slate-400">Kỳ cuối so với kỳ đầu</div><div className={`text-lg font-bold ${positiveTrend ? 'text-emerald-700' : 'text-red-700'}`}>{positiveTrend ? '+' : ''}{(overview.trendChange * 100).toFixed(1)}%</div></div>
        </div>}
      </div>
    </header>

    <div className="space-y-5 p-5">
      <section>
        <h4 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600"><BarChart3 className="h-4 w-4 text-blue-600" />Các chỉ số chính</h4>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {overview.kpis.map(kpi => <div key={kpi.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-[11px] font-semibold uppercase text-slate-400">{kpi.label}</div>
            <div className="mt-1 break-words text-xl font-bold text-slate-950">{formatKpi(kpi, preferences)}</div>
          </div>)}
        </div>
      </section>

      {overview.findings.length > 0 && <section className="grid gap-3 lg:grid-cols-3">
        {overview.findings.map((finding, index) => <div key={finding} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-amber-700"><Lightbulb className="h-4 w-4" />Phát hiện {index + 1}</div>
          <p className="mt-2 text-[13px] leading-5 text-amber-950">{finding}</p>
        </div>)}
      </section>}

      {overview.breakdowns.length > 0 && <section>
        <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-slate-600">Doanh thu đến từ đâu?</h4>
        <div className="grid gap-4 lg:grid-cols-2">
          {overview.breakdowns.map(breakdown => <article key={breakdown.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3"><h5 className="text-[14px] font-semibold text-slate-900">Theo {breakdown.label.toLowerCase()}</h5><span className="text-[10px] text-slate-400">{breakdown.physicalColumn}</span></div>
            <div className="mt-3 space-y-3">
              {breakdown.top.map((entry, index) => <div key={entry.label}>
                <div className="mb-1 flex items-center justify-between gap-3 text-[12px]"><span className="min-w-0 truncate font-medium text-slate-700">{index + 1}. {entry.label}</span><span className="shrink-0 text-slate-500">{formatMoney(entry.value, preferences)} Â· {(entry.share * 100).toFixed(1)}%</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(2, entry.share * 100)}%` }} /></div>
              </div>)}
            </div>
          </article>)}
        </div>
      </section>}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-white p-4">
          <h4 className="text-[12px] font-semibold uppercase tracking-wide text-emerald-700">Nên làm gì tiếp theo?</h4>
          <ol className="mt-3 space-y-2 text-[13px] leading-5 text-slate-700">
            <li>1. Mở nhóm đóng góp lớn nhất để kiểm tra sản phẩm, cửa hàng và nhân viên tạo ra kết quả.</li>
            <li>2. So sánh nhóm tăng trưởng với nhóm suy giảm trước khi thay đổi giá, chiết khấu hoặc phân bổ nguồn lực.</li>
            <li>3. Kiểm tra các dòng bất thường và chất lượng dữ liệu trước khi dùng kết quả cho quyết định tài chính.</li>
          </ol>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h4 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-amber-700"><AlertTriangle className="h-4 w-4" />Giới hạn bằng chứng</h4>
          <ul className="mt-3 space-y-2 text-[12px] leading-5 text-amber-950">{overview.limitations.map(item => <li key={item}>â€¢ {item}</li>)}</ul>
        </div>
      </section>
    </div>
  </div>;
};
