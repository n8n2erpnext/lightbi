import React from 'react';
import { X } from 'lucide-react';
import { useDisplayPreferences } from '../../stores/display-preferences-store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const DisplayPreferencesModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { preferences, updatePreferences, resetPreferences } = useDisplayPreferences();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-[600px] max-w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-medium text-gray-900">Display Preferences</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Locale</label>
              <select
                value={preferences.locale}
                onChange={(e) => updatePreferences({ locale: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              >
                <option value="en-US">English (US)</option>
                <option value="vi-VN">Vietnamese</option>
                <option value="ar-SA">Arabic (Saudi Arabia)</option>
              </select>
            </div>
            
            <div>
               <label className="block text-sm font-medium text-gray-700">Timezone</label>
               <select
                 value={preferences.timezone}
                 onChange={(e) => updatePreferences({ timezone: e.target.value })}
                 className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
               >
                 <option value="auto">Auto</option>
                 <option value="UTC">UTC</option>
                 <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</option>
               </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Number Style</label>
              <select
                value={preferences.numberStyle}
                onChange={(e) => updatePreferences({ numberStyle: e.target.value as any })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border"
              >
                <option value="plain">Plain</option>
                <option value="accounting">Accounting</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Currency Display</label>
              <select
                value={preferences.currencyDisplay}
                onChange={(e) => updatePreferences({ currencyDisplay: e.target.value as any })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border"
              >
                <option value="none">None</option>
                <option value="symbol">Symbol</option>
                <option value="code">Code</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Decimal Places</label>
              <select
                value={preferences.decimalPlaces}
                onChange={(e) => updatePreferences({ decimalPlaces: e.target.value === 'auto' ? 'auto' : Number(e.target.value) as any })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border"
              >
                <option value="auto">Auto</option>
                <option value="0">0</option>
                <option value="2">2</option>
                <option value="4">4</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Thousands Separator</label>
              <select
                value={preferences.thousandsSeparator}
                onChange={(e) => updatePreferences({ thousandsSeparator: e.target.value as any })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border"
              >
                <option value="locale">Locale Default</option>
                <option value="comma">Comma (,)</option>
                <option value="dot">Dot (.)</option>
                <option value="space">Space</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
             <div>
               <label className="block text-sm font-medium text-gray-700">Negative Style</label>
               <select
                 value={preferences.negativeStyle}
                 onChange={(e) => updatePreferences({ negativeStyle: e.target.value as any })}
                 className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border"
               >
                 <option value="minus">Minus Sign (-)</option>
                 <option value="parentheses">Parentheses ()</option>
               </select>
             </div>
             
             <div>
               <label className="block text-sm font-medium text-gray-700">Date Format</label>
               <select
                 value={preferences.dateFormat}
                 onChange={(e) => updatePreferences({ dateFormat: e.target.value as any })}
                 className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border"
               >
                 <option value="locale">Locale Default</option>
                 <option value="short">Short</option>
                 <option value="long">Long</option>
                 <option value="iso">ISO-like</option>
               </select>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
             <div>
               <label className="block text-sm font-medium text-gray-700">Time Format</label>
               <select
                 value={preferences.timeFormat}
                 onChange={(e) => updatePreferences({ timeFormat: e.target.value as any })}
                 className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border"
               >
                 <option value="locale">Locale Default</option>
                 <option value="12h">12-hour (AM/PM)</option>
                 <option value="24h">24-hour</option>
               </select>
             </div>
             
             <div>
               <label className="block text-sm font-medium text-gray-700">Datetime Format</label>
               <select
                 value={preferences.datetimeFormat}
                 onChange={(e) => updatePreferences({ datetimeFormat: e.target.value as any })}
                 className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border"
               >
                 <option value="locale">Locale Default</option>
                 <option value="compact">Compact</option>
                 <option value="detailed">Detailed</option>
               </select>
             </div>
          </div>
          
        </div>
        
        <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse rounded-b-lg border-t">
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 sm:ml-3 sm:w-auto sm:text-sm"
            onClick={onClose}
          >
            Done
          </button>
          <button
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            onClick={resetPreferences}
          >
            Reset to Default
          </button>
        </div>
      </div>
    </div>
  );
};
