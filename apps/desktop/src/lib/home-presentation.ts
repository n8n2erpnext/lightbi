export function getHomeGreeting(now = new Date()): string {
  const hour = now.getHours();
  const period = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : hour < 22 ? 'Good evening' : 'Working late';
  return `${period} 👋`;
}

export function createHomeChartOption(chartData: any) {
  if (!chartData?.theme_metadata?.data) return {};
  const meta = chartData.theme_metadata;
  return {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: meta.data.map((row: any) => row[meta.xAxis]), axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { color: '#4b5563' } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f3f4f6' } }, axisLabel: { color: '#4b5563' } },
    series: [{ data: meta.data.map((row: any) => Number(row[meta.yAxis[0]])), type: 'line', smooth: true, areaStyle: { opacity: 0.1 }, itemStyle: { color: '#111827' } }],
  };
}

export function presentDatasetTrust(score: number | null) {
  if (score === null) return { label: 'Waiting for data', className: 'bg-black/[0.04] text-black/55' };
  if (score >= 85) return { label: 'High trust', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (score >= 60) return { label: 'Review recommended', className: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'Needs cleaning', className: 'bg-rose-50 text-rose-700 border-rose-200' };
}

export function unavailableLegacyPresentation<T>(): T | null {
  return null;
}
