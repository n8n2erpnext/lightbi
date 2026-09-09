import React from 'react';
import { Plus, Sparkles } from 'lucide-react';

export const HomeSourceUnderstandingSummary: React.FC<{
  pendingLocalBatch: any;
  multiSourceReviewSources: any[];
  multiSourceBundles: any[];
  openLocalFilePicker: () => void;
  t: (value: string) => string;
}> = ({ pendingLocalBatch, multiSourceReviewSources, multiSourceBundles, openLocalFilePicker, t }) => (
  <section data-testid="source-understanding-workspace" className="mb-6 border-y border-[var(--lb-divider)] bg-white">
    <div className="flex flex-col gap-5 py-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">
          <Sparkles className="h-4 w-4" strokeWidth={1.7} />
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
      <div className="grid min-w-0 grid-cols-3 border-y border-[var(--lb-divider)] lg:min-w-[360px] lg:border-y-0 lg:border-l lg:divide-x lg:divide-[var(--lb-divider)]">
        {[
          [t('Sources'), Math.max(pendingLocalBatch.files.length, multiSourceReviewSources.length)],
          [t('Groups'), pendingLocalBatch.families.length],
          [t('Candidates'), multiSourceBundles.length],
        ].map(([label, value]) => (
          <div key={String(label)} className="px-3 py-3 lg:px-4">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
            <div className="mt-1 text-[20px] font-semibold text-slate-950">{value}</div>
          </div>
        ))}
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--lb-divider)] py-3">
      <p className="text-[11px] text-slate-500">{t('Suggestions are evidence candidates, never confirmed facts.')}</p>
      <button onClick={openLocalFilePicker} className="inline-flex min-h-9 items-center gap-2 border-l-2 border-blue-500 px-3 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-800">
        <Plus className="h-3.5 w-3.5" /> {t('Add or replace sources')}
      </button>
    </div>
  </section>
);
