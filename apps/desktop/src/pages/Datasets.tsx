import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Database, Download, FileSpreadsheet, ShieldCheck, Sparkles } from 'lucide-react';
import { createCleanDataHandoff, savePowerBiWorkbook, type CleanDataHandoffResultV1 } from '../lib/clean-data-handoff';
import { useAdvancedSourceStore } from '../stores/advanced-source-store';
import { useDisplayPreferences } from '../stores/display-preferences-store';
import { useUiLanguage } from '../lib/ui-language';

export const Datasets: React.FC = () => {
  const { preferences } = useDisplayPreferences();
  const { t } = useUiLanguage();
  const sources = useAdvancedSourceStore(state => state.sources);
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? '');
  const source = sources.find(item => item.id === sourceId) ?? sources[0];
  const [tableId, setTableId] = useState(source?.tables[0]?.id ?? '');
  const table = source?.tables.find(item => item.id === tableId) ?? source?.tables[0];
  const [result, setResult] = useState<CleanDataHandoffResultV1 | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState('');
  const [saveNotice, setSaveNotice] = useState('');

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

  if (!sources.length) {
    return (
      <div className="flex-1 overflow-auto bg-[#fafafa] p-8">
        <div className="mx-auto max-w-5xl rounded-3xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <Database className="mx-auto mb-4 h-10 w-10 text-gray-400" />
          <h1 className="text-2xl font-semibold text-gray-900">{t('No project data yet')}</h1>
          <p className="mt-2 text-gray-500">{t('Import a file from New brief. LightBI will preserve the raw source and prepare a clean handoff here.')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-[#fafafa] p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-[#071022] p-7 text-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-300"><Sparkles className="h-4 w-4" />{t('Clean data handoff')}</div>
              <h1 className="text-3xl font-semibold">{t('Prepare data for Power BI and analysts')}</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">{t('LightBI creates a new, traceable copy. The imported source is never changed.')}</p>
            </div>
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-200"><ShieldCheck className="mr-2 inline h-5 w-5" />{t('Non-destructive by design')}</div>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="text-sm font-medium text-gray-700">{t('Source')}
              <select value={source?.id} onChange={event => setSourceId(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900">
                {sources.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700">{t('Table or sheet')}
              <select value={table?.id} onChange={event => { setTableId(event.target.value); setResult(null); }} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900">
            {source?.tables.map(item => <option key={item.id} value={item.id}>{item.name} · {item.rowCount.toLocaleString(preferences.locale)}</option>)}
              </select>
            </label>
            <button data-testid="prepare-clean-handoff" disabled={!table || isBuilding} onClick={() => void prepare()} className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300">
              {isBuilding ? t('Preparing…') : t('Prepare clean copy')}
            </button>
          </div>
          {table && <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-gray-50 p-4"><div className="text-xs uppercase text-gray-400">{t('Rows')}</div><div className="mt-1 text-2xl font-semibold">{table.rowCount.toLocaleString(preferences.locale)}</div></div>
            <div className="rounded-2xl bg-gray-50 p-4"><div className="text-xs uppercase text-gray-400">{t('Columns')}</div><div className="mt-1 text-2xl font-semibold">{table.columns.length}</div></div>
            <div className="rounded-2xl bg-gray-50 p-4"><div className="text-xs uppercase text-gray-400">{t('Understanding')}</div><div className="mt-1 text-lg font-semibold">{source?.canonicalSourceBoundary ? t('Canonical evidence attached') : t('Physical profile available')}</div></div>
          </div>}
          {error && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        </section>

        {result && <section data-testid="clean-handoff-result" className="space-y-5 rounded-3xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-emerald-700"><CheckCircle2 className="h-5 w-5" />{t('Clean handoff ready')}</div>
            <h2 className="mt-2 text-2xl font-semibold text-gray-950">{result.artifact.output.rowCount.toLocaleString(preferences.locale)} {t('rows prepared without changing the source')}</h2>
            </div>
            <button data-testid="download-powerbi-package" onClick={() => void savePackage()} className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"><Download className="mr-2 inline h-4 w-4" />{t('Save Power BI package as…')}</button>
          </div>
          {saveNotice && <div role="status" data-testid="clean-handoff-save-notice" className="rounded-xl border border-emerald-200 bg-white p-4 text-sm font-medium text-emerald-800">{saveNotice}</div>}

          <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-white p-4"><div className="text-xs uppercase text-gray-400">{t('Clean rows')}</div><div className="mt-1 text-2xl font-semibold">{result.artifact.output.rowCount.toLocaleString(preferences.locale)}</div></div>
            <div className="rounded-2xl bg-white p-4"><div className="text-xs uppercase text-gray-400">{t('Data dictionary')}</div><div className="mt-1 text-2xl font-semibold">{result.artifact.lineage.length} {t('fields')}</div></div>
              <div className="rounded-2xl bg-white p-4"><div className="text-xs uppercase text-gray-400">{t('Safe changes')}</div><div className="mt-1 text-2xl font-semibold">{transformationCount.toLocaleString(preferences.locale)}</div></div>
            <div className="rounded-2xl bg-white p-4"><div className="text-xs uppercase text-gray-400">{t('Source state')}</div><div className="mt-1 text-lg font-semibold text-emerald-700">{t('Preserved')}</div></div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="font-semibold"><FileSpreadsheet className="mr-2 inline h-5 w-5 text-blue-600" />{t('Power BI workbook contents')}</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-600"><li>• Clean Data</li><li>• Data Dictionary</li><li>• Transformation Audit</li><li>• Handoff Manifest</li></ul>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="font-semibold">{t('Inferred grain and keys')}</h3>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><dt className="text-gray-500">{t('Row form')}</dt><dd>{result.artifact.grain.structuralForm}</dd><dt className="text-gray-500">{t('Time basis')}</dt><dd>{result.artifact.grain.temporalMode}</dd><dt className="text-gray-500">{t('Candidate keys')}</dt><dd>{result.artifact.candidateKeys.join(', ') || t('Not confirmed')}</dd></dl>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-4 font-semibold">{t('Raw-to-canonical data dictionary')}</div>
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-left text-sm"><thead className="sticky top-0 bg-gray-50 text-gray-500"><tr><th className="px-5 py-3">{t('Raw field')}</th><th className="px-5 py-3">{t('Clean field')}</th><th className="px-5 py-3">{t('Meaning')}</th><th className="px-5 py-3">{t('Quality')}</th></tr></thead><tbody>
                {result.artifact.lineage.map(item => <tr key={`${item.sourceColumn}:${item.outputColumn}`} className="border-t border-gray-100"><td className="px-5 py-3 font-medium text-gray-900">{item.sourceColumn}</td><td className="px-5 py-3 text-blue-700">{item.outputColumn}</td><td className="px-5 py-3">{item.semanticConcept ?? t('Not confirmed')} · {item.semanticState}</td><td className="px-5 py-3">{item.qualityIssues.join(', ') || t('No material issue')}</td></tr>)}
              </tbody></table>
            </div>
          </div>
        </section>}
      </div>
    </div>
  );
};
