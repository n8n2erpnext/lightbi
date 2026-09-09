import React from 'react';
import { Database, FileSpreadsheet } from 'lucide-react';
import { useAppRuntime } from '@lightbi/runtime';
import { useUiLanguage } from '../lib/ui-language';

export const DataSources: React.FC = () => {
  const { t } = useUiLanguage();
  const sourcesObj = useAppRuntime(s => s.datasources);
  const sources = Object.values(sourcesObj);

  return (
    <div className="lb-page-scroll">
      <div className="lb-page-gutter flex flex-col gap-5">
        <header className="lb-page-header">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-black/45"><Database className="h-4 w-4" strokeWidth={1.7} />{t('Sources')}</div>
            <h1 className="text-[28px] font-semibold tracking-normal">{t('Data sources')}</h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-black/50">{t('Manage imported datasets and source profiles.')}</p>
          </div>
        </header>

        {sources.length === 0 ? (
          <section className="lb-document-section py-10 text-center">
            <Database className="mx-auto mb-3 h-8 w-8 text-black/25" />
            <h2 className="text-[15px] font-semibold">{t('No data sources yet')}</h2>
            <p className="mt-1 text-[13px] text-black/45">{t('Import data from New brief to create a source profile.')}</p>
          </section>
        ) : (
          <section data-testid="data-source-register" className="lb-flat-list">
            {sources.map(source => {
              const SourceIcon = source.type === 'CSV' || source.type === 'Excel' ? FileSpreadsheet : Database;
              const connected = source.status === 'Connected';
              return (
                <article key={source.id} className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-1 py-3 md:grid-cols-[auto_minmax(0,1fr)_180px_150px_auto] md:px-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[var(--lb-radius-default)] bg-black/[0.035] text-black/60"><SourceIcon className="h-4 w-4" strokeWidth={1.7} /></span>
                  <div className="min-w-0"><h2 className="truncate text-[14px] font-semibold">{source.name}</h2><p className="mt-0.5 text-[12px] text-black/45">{source.type}</p></div>
                  <div className="hidden text-[12px] text-black/45 md:block">{t('Source profile')}</div>
                  <div className={`hidden text-[12px] font-semibold md:block ${connected ? 'text-emerald-700' : 'text-black/45'}`}>{source.status}</div>
                  <div className="col-span-2 flex justify-end gap-3 text-[12px] md:col-span-1">
                    <button disabled title={t('Source editing is not available in this Beta')} className="cursor-not-allowed font-semibold text-black/30">{t('Edit')}</button>
                    <button disabled title={t('Source removal is not available in this Beta')} className="cursor-not-allowed font-semibold text-black/30">{t('Remove')}</button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
};
