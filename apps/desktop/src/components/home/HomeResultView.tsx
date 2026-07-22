import React from 'react';
import ReactECharts from 'echarts-for-react';
import { ChevronRight } from 'lucide-react';
import { homeGuidance } from '../../content/home-guidance';

interface HomeResultViewProps {
  result: any;
  chartOption: any;
  onFollowUp: (question: string) => void;
}

export const HomeResultView: React.FC<HomeResultViewProps> = ({ result, chartOption, onFollowUp }) => (
  <div className="w-full mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6 mb-16">
    <div className="flex flex-col bg-white p-4 rounded-md border border-gray-200 shadow-sm w-full relative">
      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Execution Pipeline</div>
      <div className="flex items-center w-full">
        <div className="flex flex-col items-start px-2 w-1/4">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Question</span>
          <span className="text-[13px] text-gray-900 font-medium line-clamp-1" title={result.originalQuestion || 'Analyzed Query'}>"{result.originalQuestion || 'Analyzed Query'}"</span>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
        <div className="flex flex-col items-start px-4 w-1/4">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Template</span>
          <span className="text-[13px] text-gray-900 font-medium">{result.template.name}</span>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
        <div className="flex flex-col items-start px-4 w-1/4">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Chart</span>
          <span className="text-[13px] text-gray-900 font-medium capitalize">{result.chart.chart_type}</span>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
        <div className="flex flex-col items-start pl-4 w-1/4">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Insight</span>
          <span className="text-[13px] text-emerald-600 font-medium">{Math.round(result.insight.confidence * 100)}% Confidence</span>
        </div>
      </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white border border-transparent hover:border-gray-300 rounded-md p-5 shadow-sm flex flex-col transition-colors border-gray-200">
        <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Key Insight</h3>
        <p className="text-gray-700 text-sm leading-relaxed flex-1">{result.insight.observation_text}</p>
        <div className="mt-4 pt-3 border-t border-gray-100 text-[12px] text-gray-500 flex justify-between items-center">
          <span>Confidence Score</span>
          <span className="font-medium text-emerald-600">{Math.round(result.insight.confidence * 100)}%</span>
        </div>
      </div>
      <div className="lg:col-span-2 bg-white border border-transparent hover:border-gray-300 rounded-md p-5 shadow-sm flex flex-col transition-colors border-gray-200">
        <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-4">{result.chart.theme_metadata.title}</h3>
        <div className="w-full flex-1 min-h-[300px]">
          <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} notMerge />
        </div>
      </div>
    </div>
    <div className="mt-4 border-t border-gray-100 pt-8 flex flex-col items-center">
      <h3 className="text-xl font-medium text-gray-900 mb-6">{homeGuidance.sections.followUpActions}</h3>
      <div className="flex flex-wrap gap-3 justify-center">
        {homeGuidance.homeStates.analysisReady.actions.map((suggestion, idx) => (
          <button key={idx} onClick={() => onFollowUp(suggestion)} className="px-5 py-2.5 bg-white border border-gray-200 rounded-md text-[14px] font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm">
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  </div>
);
