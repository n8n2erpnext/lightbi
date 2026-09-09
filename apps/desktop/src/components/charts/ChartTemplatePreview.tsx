import React from 'react';
import type { VisualizationPatternIdV1 } from '../../lib/visualization-ontology';
import { VISUALIZATION_PATTERN_BY_ID_V1 } from '../../lib/visualization-ontology';
import { rendererCapabilityForPattern } from '../../lib/visualization-renderer-registry';
import { visualizationPalette } from '../../lib/visualization-palette';

export const ChartTemplatePreview: React.FC<{ patternId: VisualizationPatternIdV1 }> = ({ patternId }) => {
  const pattern = VISUALIZATION_PATTERN_BY_ID_V1.get(patternId)!;
  const family = rendererCapabilityForPattern(patternId).family;
  const colors = visualizationPalette({ family, colorSemantics: pattern.colorSemantics });
  const c = (index: number) => colors[index % colors.length];
  const bars = [32, 58, 44, 72, 50, 64];

  if (family === 'number') {
    return <div className="flex h-full flex-col justify-center px-4"><div className="text-[26px] font-semibold text-black/80">24.8K</div><div className="mt-2 h-1.5 w-20" style={{ background: c(0) }} /></div>;
  }
  if (family === 'donut') {
    return <div className="flex h-full items-center justify-center"><div className="h-[76px] w-[76px] rounded-full" style={{ background: `conic-gradient(${c(0)} 0 38%, ${c(1)} 38% 65%, ${c(2)} 65% 84%, ${c(3)} 84% 100%)`, WebkitMask: 'radial-gradient(circle at center, transparent 0 46%, #000 48%)', mask: 'radial-gradient(circle at center, transparent 0 46%, #000 48%)' }} /></div>;
  }
  if (['line','area','sparkline','control_chart'].includes(family)) {
    return <svg viewBox="0 0 220 92" className="h-full w-full" aria-hidden="true"><path d="M12 70 L48 54 L82 62 L116 32 L154 42 L205 18" fill={family === 'area' ? `${c(0)}22` : 'none'} stroke={c(0)} strokeWidth="3" />{family === 'control_chart' && <><path d="M12 26H205" stroke={c(1)} strokeDasharray="5 4" /><path d="M12 74H205" stroke={c(2)} strokeDasharray="5 4" /></>}</svg>;
  }
  if (family === 'small_multiples') {
    return <div className="grid h-full grid-cols-2 gap-2 p-2">{[0,1,2,3].map(i => <svg key={i} viewBox="0 0 100 40" className="h-full w-full"><polyline points="4,30 28,18 50,24 72,10 96,16" fill="none" stroke={c(i)} strokeWidth="2" /></svg>)}</div>;
  }
  if (['scatter','bubble'].includes(family)) {
    const points = [[25,66,5],[54,44,7],[84,58,4],[112,31,9],[145,48,6],[183,20,10]];
    return <svg viewBox="0 0 220 92" className="h-full w-full" aria-hidden="true">{points.map(([x,y,r],i) => <circle key={i} cx={x} cy={y} r={family === 'bubble' ? r : 5} fill={c(i)} fillOpacity="0.78" />)}</svg>;
  }
  if (family === 'box_plot') {
    return <svg viewBox="0 0 220 92" className="h-full w-full" aria-hidden="true">{[40,105,170].map((x,i) => <g key={x} stroke={c(i)} strokeWidth="2"><line x1={x} y1="14" x2={x} y2="78"/><rect x={x-16} y="30" width="32" height="30" fill={`${c(i)}18`}/><line x1={x-16} y1="45" x2={x+16} y2="45"/><line x1={x-8} y1="14" x2={x+8} y2="14"/><line x1={x-8} y1="78" x2={x+8} y2="78"/></g>)}</svg>;
  }
  if (['heatmap','cohort_heatmap','calendar_heatmap'].includes(family)) {
    return <svg viewBox="0 0 220 92" className="h-full w-full" aria-hidden="true">{Array.from({ length: 28 },(_,i) => { const x=10+(i%7)*29; const y=8+Math.floor(i/7)*20; return <rect key={i} x={x} y={y} width="22" height="14" rx="2" fill={colors[Math.min(colors.length-1, (i*3)%colors.length)]} fillOpacity={0.3+((i%5)*0.14)} />; })}</svg>;
  }
  if (family === 'funnel') {
    return <svg viewBox="0 0 220 92" className="h-full w-full" aria-hidden="true"><polygon points="18,8 202,8 180,28 40,28" fill={c(0)}/><polygon points="42,32 178,32 158,52 62,52" fill={c(1)}/><polygon points="68,56 152,56 136,76 84,76" fill={c(2)}/></svg>;
  }
  if (family === 'radar') {
    return <svg viewBox="0 0 220 92" className="h-full w-full" aria-hidden="true"><polygon points="110,8 177,34 152,82 68,82 43,34" fill="none" stroke="#cbd5e1"/><polygon points="110,18 158,38 142,68 78,74 58,38" fill={`${c(0)}22`} stroke={c(0)} strokeWidth="2"/><polygon points="110,30 146,42 132,74 88,60 70,42" fill={`${c(1)}16`} stroke={c(1)} strokeWidth="2"/></svg>;
  }
  if (family === 'sankey') {
    return <svg viewBox="0 0 220 92" className="h-full w-full" aria-hidden="true"><rect x="12" y="14" width="14" height="26" fill={c(0)}/><rect x="12" y="55" width="14" height="22" fill={c(1)}/><rect x="194" y="20" width="14" height="28" fill={c(2)}/><rect x="194" y="60" width="14" height="18" fill={c(3)}/><path d="M26 24 C95 20 120 24 194 30" stroke={c(0)} strokeOpacity=".35" strokeWidth="10" fill="none"/><path d="M26 64 C92 60 132 67 194 68" stroke={c(1)} strokeOpacity=".35" strokeWidth="8" fill="none"/></svg>;
  }
  if (family === 'timeline') {
    return <svg viewBox="0 0 220 92" className="h-full w-full" aria-hidden="true"><line x1="18" y1="46" x2="202" y2="46" stroke="#cbd5e1" strokeWidth="2"/>{[34,74,118,162,194].map((x,i)=><g key={x}><circle cx={x} cy="46" r="6" fill={c(i)}/><line x1={x} y1="46" x2={x} y2={i%2?68:24} stroke={c(i)} strokeWidth="2"/></g>)}</svg>;
  }
  if (family === 'table') {
    return <div className="h-full px-3 py-2">{['Metric','Evidence','Owner','Status'].map((row,i)=><div key={row} className="grid grid-cols-[1fr_1.4fr_.8fr] border-b border-black/[.07] py-1.5 text-[9px] text-black/40"><span>{row}</span><span className="h-2 w-16" style={{ background: `${c(i)}24` }} /><span className="h-2 w-8 bg-black/[.06]" /></div>)}</div>;
  }
  if (family === 'map') {
    return <svg viewBox="0 0 220 92" className="h-full w-full" aria-hidden="true"><path d="M22 59 C45 18 83 19 105 35 C127 50 158 16 198 39 L183 75 C146 83 116 61 83 76 C58 88 35 76 22 59Z" fill="#f8fafc" stroke="#cbd5e1"/>{[[58,52],[92,36],[122,58],[157,38],[177,64]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={5+i%3} fill={c(i)} fillOpacity=".78" />)}</svg>;
  }

  // Bar-like families: column, row, grouped, stacked, normalized, waterfall,
  // histogram, Pareto, bullet and diverging all get a truthful pattern-shaped hint.
  if (family === 'row' || family === 'diverging_bar' || family === 'bullet') {
    return <svg viewBox="0 0 220 92" className="h-full w-full" aria-hidden="true">{bars.slice(0,5).map((w,i) => <rect key={i} x={family === 'diverging_bar' && i%2 ? 110-w : 110} y={8+i*16} width={w} height="10" rx="2" fill={c(i)} />)}{family === 'bullet' && <line x1="162" y1="8" x2="162" y2="80" stroke={c(1)} strokeWidth="2" />}</svg>;
  }
  if (family === 'stacked_bar' || family === 'normalized_stacked') {
    return <svg viewBox="0 0 220 92" className="h-full w-full" aria-hidden="true">{[14,44,74].map((y,row)=><g key={y}><rect x="18" y={y} width="62" height="14" fill={c(0)}/><rect x="80" y={y} width="52" height="14" fill={c(1)}/><rect x="132" y={y} width={family==='normalized_stacked'?70:42+row*8} height="14" fill={c(2)}/></g>)}</svg>;
  }
  if (family === 'grouped_bar') {
    return <svg viewBox="0 0 220 92" className="h-full w-full" aria-hidden="true">{[0,1,2,3].flatMap(group => [0,1].map(series => <rect key={`${group}-${series}`} x={20+group*48+series*14} y={82-(30+group*8+series*10)} width="11" height={30+group*8+series*10} fill={c(series)} />))}</svg>;
  }
  if (family === 'waterfall') {
    const ys=[62,44,54,28,38]; return <svg viewBox="0 0 220 92" className="h-full w-full" aria-hidden="true">{ys.map((y,i)=><rect key={i} x={18+i*38} y={y} width="24" height={76-y} fill={c(i)} />)}</svg>;
  }
  if (family === 'pareto') {
    return <svg viewBox="0 0 220 92" className="h-full w-full" aria-hidden="true">{bars.map((h,i)=><rect key={i} x={16+i*31} y={82-h} width="20" height={h} fill={c(0)} />)}<polyline points="26,62 57,45 88,32 119,23 150,17 181,12" fill="none" stroke={c(1)} strokeWidth="2.5" /></svg>;
  }
  return <svg viewBox="0 0 220 92" className="h-full w-full" aria-hidden="true">{bars.map((h,i)=><rect key={i} x={16+i*31} y={82-h} width="20" height={h} rx="2" fill={c(i)} />)}</svg>;
};
