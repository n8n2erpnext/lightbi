import React from 'react';
import { Database, FileSpreadsheet } from 'lucide-react';
import { useAppRuntime } from '@lightbi/runtime';
import { useUiLanguage } from '../lib/ui-language';

export const DataSources: React.FC = () => {
  const { t } = useUiLanguage();
  const sourcesObj = useAppRuntime(s => s.datasources);
  const sources = Object.values(sourcesObj);
  


  return (
    <div className="flex-1 p-4 flex flex-col overflow-hidden">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">{t('Sources')}</h1>
        <p className="mt-1 text-[13px] text-gray-500">{t('Manage imported datasets and source profiles.')}</p>
      </div>


      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sources.map(source => (
          <div key={source.id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-gray-100 text-gray-700 rounded-lg">
                {source.type === 'CSV' || source.type === 'Excel' ? <FileSpreadsheet className="w-6 h-6" /> : <Database className="w-6 h-6" />}
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                source.status === 'Connected' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {source.status}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{source.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{source.type}</p>
            
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end space-x-2 text-sm">
              <button disabled title={t('Source editing is not available in this Beta')} className="cursor-not-allowed rounded px-3 py-1.5 text-gray-400">{t('Edit')}</button>
              <button disabled title={t('Source removal is not available in this Beta')} className="cursor-not-allowed rounded px-3 py-1.5 text-gray-400">{t('Remove')}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
