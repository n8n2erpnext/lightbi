import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Plus } from 'lucide-react';
import { useAppRuntime } from '@lightbi/runtime';
import { useUiLanguage } from '../lib/ui-language';
import { getLanguageMetadata } from '../i18n/language-registry';

export const Dashboards: React.FC = () => {
  const navigate = useNavigate();
  const { t, language } = useUiLanguage();
  const dashboardsObj = useAppRuntime(s => s.dashboards);
  const createDashboard = useAppRuntime(s => s.createDashboard);
  const dashboards = Object.values(dashboardsObj);

  const handleCreateDashboard = () => {
    const id = createDashboard(t('Decision dashboard'));
    navigate(`/dashboards/${id}`);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-[#fbfbfa] px-5 py-8 text-[#202123] md:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-black/45"><LayoutDashboard className="h-4 w-4" strokeWidth={1.7} /> {t('Dashboards')}</div>
            <h1 className="text-[28px] font-semibold tracking-normal">{t('Decision dashboards')}</h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-black/50">{t('Assemble reusable chart cards into operational views that can refresh when datasets change.')}</p>
          </div>
          <button onClick={handleCreateDashboard} className="inline-flex h-10 items-center gap-2 rounded-md bg-gray-900 px-3 text-[13px] font-medium text-white hover:bg-black"><Plus className="h-4 w-4" /> {t('New dashboard')}</button>
        </header>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {dashboards.map(dashboard => (
            <Link key={dashboard.id} to={`/dashboards/${dashboard.id}`} className="rounded-lg border border-black/10 bg-white p-5 shadow-sm transition-colors hover:bg-black/[0.02]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-[16px] font-semibold">{dashboard.name}</h2>
                  <p className="mt-1 text-[13px] text-black/45">{dashboard.widgets.length} {t('chart cards')}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600"><LayoutDashboard className="h-4 w-4" /></div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {Array.from({ length: Math.max(3, Math.min(6, dashboard.widgets.length || 3)) }, (_, index) => (
                  <div key={index} className={`h-12 rounded border ${index < dashboard.widgets.length ? 'border-blue-100 bg-blue-50' : 'border-dashed border-black/10 bg-[#fbfbfa]'}`} />
                ))}
              </div>
              <div className="mt-4 text-[12px] text-black/40">{t('Updated')} {dashboard.updatedAt ? new Date(dashboard.updatedAt).toLocaleDateString(getLanguageMetadata(language).locale) : t('recently')}</div>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
};
