import React from 'react';
import { Plus, Sparkles } from 'lucide-react';

export const HomeSourceUnderstandingSummary: React.FC<{
  pendingLocalBatch: any;
  multiSourceReviewSources: any[];
  multiSourceBundles: any[];
  openLocalFilePicker: () => void;
  t: (value: string) => string;
}> = ({ pendingLocalBatch, multiSourceReviewSources, multiSourceBundles, openLocalFilePicker, t }) => (
  <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.05)]">
    <div className="flex flex-col gap-5 px-5 py-5 md:px-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="max-w-3xl">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
          <Sparkles className="h-4 w-4" />
          {t('Source understanding workspace')}
        </div>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-slate-950 md:text-[30px]">
          {pendingLocalBatch.status === 'reading' ? t('Understanding your sources') : t('Review what LightBI found')}
        </h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-5 text-slate-600">
          {pendingLocalBatch.status === 'reading'
            ? t('LightBI is inspecting each complete source, separating schemas and preserving source identity.')
            : t('Choose a supported analysis, confirm only the missing evidence, then build a governed dataset. No source is combined automatically.')}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 lg:min-w-[360px]">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('Sources')}</div>
          <div className="mt-1 text-[20px] font-semibold text-slate-950">
            {Math.max(pendingLocalBatch.files.length, multiSourceReviewSources.length)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('Groups')}</div>
          <div className="mt-1 text-[20px] font-semibold text-slate-950">{pendingLocalBatch.families.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('Candidates')}</div>
          <div className="mt-1 text-[20px] font-semibold text-slate-950">{multiSourceBundles.length}</div>
        </div>
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-3 md:px-6">
      <p className="text-[11px] text-slate-500">{t('Suggestions are evidence candidates, never confirmed facts.')}</p>
      <button onClick={openLocalFilePicker} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-800">
        <Plus className="h-3.5 w-3.5" /> {t('Add or replace sources')}
      </button>
    </div>
  </section>
);
