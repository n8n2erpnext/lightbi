import React from 'react';
import { Globe, Monitor, Server } from 'lucide-react';
import { useUiLanguage } from '../../lib/ui-language';

interface HomeSourcePickerMenuProps {
  open: boolean;
  positionClass: string;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onLocalFile: () => void;
  onOnlineData: () => void;
  onDatabase: () => void;
}

export const HomeSourcePickerMenu: React.FC<HomeSourcePickerMenuProps> = ({ open, positionClass, menuRef, onLocalFile, onOnlineData, onDatabase }) => {
  const { t } = useUiLanguage();
  if (!open) return null;
  return (
    <div ref={menuRef} className={`absolute ${positionClass} w-64 overflow-hidden rounded-lg border border-black/10 bg-white py-2 text-left shadow-lg z-20 animate-in fade-in slide-in-from-top-2 duration-200`}>
      <button onClick={onLocalFile} className="flex w-full items-center px-4 py-3 text-[14px] font-medium text-[#202123] transition-colors hover:bg-black/[0.035]"><Monitor className="mr-3 h-4 w-4 text-black/55" strokeWidth={1.7} />{t('My Computer', 'Máy tính của tôi')}</button>
      <button onClick={onOnlineData} className="flex w-full items-center px-4 py-3 text-[14px] font-medium text-[#202123] transition-colors hover:bg-black/[0.035]"><Globe className="mr-3 h-4 w-4 text-black/55" strokeWidth={1.7} />{t('Online Data', 'Dữ liệu trực tuyến')}</button>
      <button onClick={onDatabase} className="flex w-full items-center px-4 py-3 text-[14px] font-medium text-[#202123] transition-colors hover:bg-black/[0.035]"><Server className="mr-3 h-4 w-4 text-black/55" strokeWidth={1.7} />{t('Database System', 'Hệ quản trị cơ sở dữ liệu')}</button>
    </div>
  );
};
