import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Database, Download, FileSpreadsheet, ShieldCheck, Sparkles } from 'lucide-react';
import { createCleanDataHandoff, savePowerBiWorkbook, type CleanDataHandoffResultV1 } from '../lib/clean-data-handoff';
import { saveExcelAnalysisWorkbook } from '../lib/analysis-workbook';
import { useAnalysisExportStore } from '../stores/analysis-export-store';
import { useAdvancedSourceStore } from '../stores/advanced-source-store';
import { useDisplayPreferences } from '../stores/display-preferences-store';
import { useUiLanguage } from '../lib/ui-language';

export const Datasets: React.FC = () => {
  const { preferences } = useDisplayPreferences();
  const { t } = useUiLanguage();
  const sources = useAdvancedSourceStore(state => state.sources);
  const analysisPlan = useAnalysisExportStore(state => state.plan);
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? '');
  const source = sources.find(item => item.id === sourceId) ?? sources[0];
  const [tableId, setTableId] = useState(source?.tables[0]?.id ?? '');
  const table = source?.tables.find(item => item.id === tableId) ?? source?.tables[0];
  const [result, setResult] = useState<CleanDataHandoffResultV1 | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const [analysisSaveNotice, setAnalysisSaveNotice] = useState('');

  useEffect(() => {
    if (!source) return;
    if (!source.tables.some(item => item.id === tableId)) setTableId(source.tables[0]?.id ?? '');
    setResult(null);
    setError('');
  }, [source?.id]);

  const transformationCount = useMemo(() => result?.artifact.auditTrail.reduce((sum, item) => sum + item.affectedValues, 0) ?? 0, [result]);

  const prepare = async () => {
    if (!source || !table) return;
    setIsBuilding(true);
    setError('');
    setResult(null);
    try {
      setResult(await createCleanDataHandoff(source, table));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not prepare the clean-data handoff.'));
    } finally {
      setIsBuilding(false);
    }
  };

  const savePackage = async () => {
    if (!result) return;
    setError(''); setSaveNotice('');
    try {
      const saved = await savePowerBiWorkbook(result);
      setSaveNotice(saved.usedSaveAs
        ? t(`Saved as ${saved.locationLabel}.`)
        : t(`Saved automatically to ${saved.locationLabel}.`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not save the Power BI package.'));
    }
  };

  const saveAnalysisPackage = async () => {
    if (!result || !analysisPlan) return;
    setError(''); setAnalysisSaveNotice('');
    try {
      const saved = await saveExcelAnalysisWorkbook(analysisPlan, { cleanData: result });
      setAnalysisSaveNotice(saved.usedSaveAs
        ? t(`Saved Excel analysis as ${saved.locationLabel}.`)
        : t(`Saved Excel analysis automatically to ${saved.locationLabel}.`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not save the Excel analysis workbook.'));
    }
  };

  if (!sources.length) {
    return (
      <div className="lb-page-scroll">
        <div className="lb-page-gutter">
          <section className="lb-reading-column lb-document-section py-12 text-center">
            <Database className="mx-auto mb-4 h-9 w-9 text-black/25" />
            <h1 className="text-[24px] font-semibold text-[var(--lb-ink)]">{t('No project data yet')}</h1>
            <p className="mt-2 text-[14px] leading-6 text-black/50">{t('Import a file from New brief. LightBI will preserve the raw source and prepare a clean handoff here.')}</p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="lb-page-scroll">
      <div className="lb-page-gutter flex flex-col gap-5">
        <header className="lb-page-header">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-black/45"><Sparkles className="h-4 w-4" strokeWidth={1.7} />{t('Clean data handoff')}</div>
            <h1 className="text-[28px] font-semibold tracking-normal">{t('Prepare data for Power BI and analysts')}</h1>
            <p className="mt-2 max-w-3xl text-[14px] leading-6 text-black/50">{t('LightBI creates a new, traceable copy. The imported source is never changed.')}</p>
          </div>
          <div className="flex items-center gap-2 text-[12px] font-semibold text-emerald-700"><ShieldCheck className="h-4 w-4" />{t('Non-destructive by design')}</div>
        </header>

        <section className="lb-document-section !pt-0">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
            <label className="text-[12px] font-semibold text-black/60">{t('Source')}
              <select value={source?.id} onChange={event => setSourceId(event.target.value)} className="lb-control mt-2 w-full px-3 py-2 text-[var(--lb-ink)]">
                {sources.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="text-[12px] font-semibold text-black/60">{t('Table or sheet')}
              <select value={table?.id} onChange={event => { setTableId(event.target.value); setResult(null); }} className="lb-control mt-2 w-full px-3 py-2 text-[var(--lb-ink)]">
                {source?.tables.map(item => <option key={item.id} value={item.id}>{item.name} · {item.rowCount.toLocaleString(preferences.locale)}</option>)}
              </select>
            </label>
            <button data-testid="prepare-clean-handoff" disabled={!table || isBuilding} onClick={() => void prepare()} className="lb-action-primary md:min-w-44">
              {isBuilding ? t('Preparing…') : t('Prepare clean copy')}
            </button>
          </div>

          {table && <div className="lb-divider-grid mt-5 grid-cols-1 sm:grid-cols-3 sm:divide-x sm:divide-[var(--lb-divider)]">
            <div className="px-1 py-4 sm:px-5"><div className="text-[11px] uppercase tracking-wide text-black/35">{t('Rows')}</div><div className="mt-1 text-2xl font-semibold">{table.rowCount.toLocaleString(preferences.locale)}</div></div>
            <div className="px-1 py-4 sm:px-5"><div className="text-[11px] uppercase tracking-wide text-black/35">{t('Columns')}</div><div className="mt-1 text-2xl font-semibold">{table.columns.length}</div></div>
            <div className="px-1 py-4 sm:px-5"><div className="text-[11px] uppercase tracking-wide text-black/35">{t('Understanding')}</div><div className="mt-1 text-[15px] font-semibold">{source?.canonicalSourceBoundary ? t('Canonical evidence attached') : t('Physical profile available')}</div></div>
          </div>}
          {error && <div role="alert" className="mt-4 border-l-2 border-red-500 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>}
        </section>

        {result && <section data-testid="clean-handoff-result" className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 border-y border-emerald-200 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-700"><CheckCircle2 className="h-4 w-4" />{t('Clean handoff ready')}</div>
              <h2 className="mt-2 text-[22px] font-semibold text-[var(--lb-ink)]">{result.artifact.output.rowCount.toLocaleString(preferences.locale)} {t('rows prepared without changing the source')}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button data-testid="download-powerbi-package" onClick={() => void savePackage()} className="lb-action-primary"><Download className="mr-2 h-4 w-4" />{t('Save Power BI package as…')}</button>
              {analysisPlan && <button data-testid="download-excel-analysis-package" onClick={() => void saveAnalysisPackage()} className="lb-action-primary"><FileSpreadsheet className="mr-2 h-4 w-4" />{t('Save Excel analysis / Pivot as…')}</button>}
            </div>
          </div>

          {saveNotice && <div role="status" data-testid="clean-handoff-save-notice" className="border-l-2 border-emerald-500 bg-emerald-50 px-4 py-3 text-[13px] font-medium text-emerald-800">{saveNotice}</div>}
          {analysisSaveNotice && <div role="status" data-testid="analysis-workbook-save-notice" className="border-l-2 border-blue-500 bg-blue-50 px-4 py-3 text-[13px] font-medium text-blue-800">{analysisSaveNotice}</div>}

          <div className="lb-divider-grid grid-cols-2 md:grid-cols-4 md:divide-x md:divide-[var(--lb-divider)]">
            <div className="px-1 py-4 md:px-5"><div className="text-[11px] uppercase tracking-wide text-black/35">{t('Clean rows')}</div><div className="mt-1 text-2xl font-semibold">{result.artifact.output.rowCount.toLocaleString(preferences.locale)}</div></div>
            <div className="px-1 py-4 md:px-5"><div className="text-[11px] uppercase tracking-wide text-black/35">{t('Data dictionary')}</div><div className="mt-1 text-2xl font-semibold">{result.artifact.lineage.length} {t('fields')}</div></div>
            <div className="px-1 py-4 md:px-5"><div className="text-[11px] uppercase tracking-wide text-black/35">{t('Safe changes')}</div><div className="mt-1 text-2xl font-semibold">{transformationCount.toLocaleString(preferences.locale)}</div></div>
            <div className="px-1 py-4 md:px-5"><div className="text-[11px] uppercase tracking-wide text-black/35">{t('Source state')}</div><div className="mt-1 text-[15px] font-semibold text-emerald-700">{t('Preserved')}</div></div>
          </div>

          <div className={`grid border-y border-[var(--lb-divider)] ${analysisPlan ? 'lg:grid-cols-3 lg:divide-x lg:divide-[var(--lb-divider)]' : 'lg:grid-cols-2 lg:divide-x lg:divide-[var(--lb-divider)]'}`}>
            <div className="px-1 py-5 lg:px-5">
              <h3 className="font-semibold"><FileSpreadsheet className="mr-2 inline h-4 w-4 text-blue-600" />{t('Power BI workbook contents')}</h3>
              <ul className="mt-3 space-y-2 text-[13px] text-black/55"><li>• Clean Data</li><li>• Data Dictionary</li><li>• Transformation Audit</li><li>• Handoff Manifest</li></ul>
            </div>
            {analysisPlan && <div data-testid="excel-analysis-context" className="bg-blue-50/30 px-1 py-5 lg:px-5">
              <h3 className="font-semibold text-blue-950"><FileSpreadsheet className="mr-2 inline h-4 w-4 text-blue-600" />{t('Excel Analysis / Pivot workbook')}</h3>
              <p className="mt-2 text-[13px] text-blue-900/70">{analysisPlan.title} · {analysisPlan.perspectiveId}</p>
              <ul className="mt-3 space-y-2 text-[13px] text-blue-900/80"><li>• Pivot View (formula-driven from governed summary)</li><li>• Analysis Summary + source-bound evidence</li><li>• Clean Data + Data Dictionary</li><li>• Transformation Audit + Decision Notes</li></ul>
            </div>}
            <div className="px-1 py-5 lg:px-5">
              <h3 className="font-semibold">{t('Inferred grain and keys')}</h3>
              <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 text-[13px]"><dt className="text-black/45">{t('Row form')}</dt><dd>{result.artifact.grain.structuralForm}</dd><dt className="text-black/45">{t('Time basis')}</dt><dd>{result.artifact.grain.temporalMode}</dd><dt className="text-black/45">{t('Candidate keys')}</dt><dd>{result.artifact.candidateKeys.join(', ') || t('Not confirmed')}</dd></dl>
            </div>
          </div>

          <div className="border-y border-[var(--lb-divider)] bg-white">
            <div className="border-b border-[var(--lb-divider)] px-1 py-4 text-[14px] font-semibold">{t('Raw-to-canonical data dictionary')}</div>
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-left text-[13px]"><thead className="sticky top-0 bg-[var(--lb-surface-subtle)] text-black/45"><tr><th className="px-4 py-3">{t('Raw field')}</th><th className="px-4 py-3">{t('Clean field')}</th><th className="px-4 py-3">{t('Meaning')}</th><th className="px-4 py-3">{t('Quality')}</th></tr></thead><tbody>
                {result.artifact.lineage.map(item => <tr key={`${item.sourceColumn}:${item.outputColumn}`} className="border-t border-[var(--lb-divider)]"><td className="px-4 py-3 font-medium text-[var(--lb-ink)]">{item.sourceColumn}</td><td className="px-4 py-3 text-blue-700">{item.outputColumn}</td><td className="px-4 py-3">{item.semanticConcept ?? t('Not confirmed')} · {item.semanticState}</td><td className="px-4 py-3">{item.qualityIssues.join(', ') || t('No material issue')}</td></tr>)}
              </tbody></table>
            </div>
          </div>
        </section>}
      </div>
    </div>
  );
};
