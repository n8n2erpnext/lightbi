import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAppRuntime } from '@lightbi/runtime';
import {
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  FolderOpen,
  Home as HomeIcon,
  Server,
  Settings,
  Sparkles,
  TerminalSquare,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useUiLanguage } from '../../lib/ui-language';
import { UiTranslationBoundary } from './UiTranslationBoundary';
import { trackFeatureUsage, type LightBIFeature } from '../../lib/app-usage-telemetry';
import { useLightBIAccount } from '../../hooks/useLightBIAccount';
import { useUpdateStore } from '../../stores/update-store';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const isSidebarExpanded = !useAppRuntime(s => s.workspacePreferences.sidebarCollapsed);
  const toggleSidebar = useAppRuntime(s => s.toggleSidebar);
  const { t } = useUiLanguage();
  const lightbiAccount = useLightBIAccount();
  const updater = useUpdateStore();
  const [notificationsOpen,setNotificationsOpen]=useState(false);
  const notificationRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{void updater.check();const timer=window.setInterval(()=>void updater.check(),6*60*60*1000);return()=>window.clearInterval(timer);},[]);
  useEffect(()=>{if(!notificationsOpen)return;const close=(event:MouseEvent)=>{if(!notificationRef.current?.contains(event.target as Node))setNotificationsOpen(false);};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close);},[notificationsOpen]);

  useEffect(() => {
    const feature: LightBIFeature = location.pathname.startsWith('/advanced') ? 'advanced_mode'
      : location.pathname.startsWith('/investigation') ? 'deep_ba'
      : location.pathname.startsWith('/dashboards') ? 'dashboard'
      : location.pathname.startsWith('/charts') ? 'chart'
      : location.pathname.startsWith('/datasources') ? 'database_connect'
      : location.pathname.startsWith('/datasets') ? 'data_import' : 'easy_mode';
    trackFeatureUsage(feature);
  }, [location.pathname]);

  const navItems = [
    { name: t('New brief'), path: '/', icon: HomeIcon },
    { name: t('Decision briefs'), path: '/dashboards', icon: FileText },
    { name: t('Charts'), path: '/charts', icon: BarChart3 },
    { name: t('Datasets'), path: '/datasets', icon: Database },
    { name: t('Sources'), path: '/datasources', icon: Server },
    { name: t('Advanced'), path: '/advanced', icon: TerminalSquare },
  ];

  const bottomNavItems = [
    { name: t('Settings'), path: '/settings', icon: Settings },
  ];

  return (
    <UiTranslationBoundary>
    <div className="flex h-screen w-screen overflow-hidden bg-[#f5f5f4] text-[#202123]">
      {/* Sidebar */}
      <aside
        className={cn(
          "relative flex flex-col border-r border-black/10 bg-[#f1f1f0] transition-all duration-300",
          isSidebarExpanded ? "w-[56px] md:w-[280px]" : "w-[56px]"
        )}
      >
        {/* Header / Logo Area */}
        <div className="flex h-[72px] items-center justify-between px-4">
          <div className="flex min-w-0 items-center">
            <img
              src="/branding/lightbi-icon.svg"
              alt=""
              className="h-9 w-9 flex-shrink-0 drop-shadow-sm"
            />
            {isSidebarExpanded && (
              <img
                src="/branding/lightbi-wordmark.svg"
                alt="LightBI"
                className="ml-3 hidden h-5 w-[76px] object-contain md:block"
              />
            )}
          </div>
          {isSidebarExpanded && (
            <div ref={notificationRef} className="relative hidden md:block"><button onClick={()=>setNotificationsOpen(value=>!value)} className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white/70 text-black/55 shadow-sm hover:bg-white" title="LightBI notifications" aria-label="LightBI notifications"><Bell className="h-4 w-4" strokeWidth={1.6} />{updater.status==='available'&&<span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white"/>}</button>{notificationsOpen&&<div className="absolute left-0 top-10 z-50 w-80 rounded-xl border border-black/10 bg-white p-4 shadow-2xl"><div className="text-xs font-semibold uppercase tracking-wider text-black/40">Notifications</div>{updater.status==='available'?<div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3"><div className="font-semibold text-slate-900">LightBI {updater.manifest?.version} is available</div><p className="mt-1 text-xs leading-5 text-slate-600">{updater.manifest?.release_notes||'A new verified Beta is ready.'}</p><div className="mt-3 flex gap-2"><button onClick={()=>{if(window.confirm('Save or finish any unsaved work before continuing. Start the verified installer and close LightBI?'))void updater.install();}} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">Update & Restart</button><button onClick={()=>setNotificationsOpen(false)} className="rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700">Later</button></div></div>:<div className="mt-3 text-sm text-slate-500">{updater.status==='checking'?'Checking for updates…':updater.status==='failed'?updater.error:'You are up to date.'}</div>}</div>}</div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {isSidebarExpanded && (
            <div className="mb-3 hidden px-2 text-[11px] font-medium text-black/40 md:block">
              {t('Workspace')}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              reloadDocument={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  "group flex h-11 items-center rounded-[12px] px-3 text-[14px] font-medium transition-all duration-200",
                  isActive ? "bg-white text-[#202123] shadow-sm ring-1 ring-black/[0.06]" : "text-black/68 hover:bg-white/65 hover:text-[#202123]",
                  !isSidebarExpanded ? "justify-center" : "justify-center md:justify-start"
                )
              }
              title={item.name}
            >
              <item.icon className="h-4 w-4 flex-shrink-0 text-black/58 transition-colors group-hover:text-[#202123]" strokeWidth={1.6} />
              {isSidebarExpanded && <span className="ml-3 hidden truncate md:block">{item.name}</span>}
            </NavLink>
          ))}
          </div>
        </nav>

        {/* Bottom Navigation */}
        <div className="flex flex-col gap-2 p-3">
          {isSidebarExpanded && (
            <NavLink to="/settings" className="hidden rounded-[14px] border border-black/10 bg-white/80 p-3 shadow-sm hover:bg-white md:block">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-amber-400 text-[11px] font-semibold text-black shadow-sm">
                  {lightbiAccount.account?.account.avatar_url ? <img src={lightbiAccount.account.account.avatar_url} alt="" className="h-full w-full object-cover" /> : <Sparkles className="h-4 w-4" strokeWidth={1.8} />}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-[#202123]">{lightbiAccount.account?.account.display_name || lightbiAccount.account?.account.email || 'LightBI Desktop'}</div>
                  <div className="truncate text-[11px] text-black/45">{lightbiAccount.account ? `${lightbiAccount.account.entitlement.tier.toUpperCase()} · ${lightbiAccount.account.account.email}` : t('BA decision workspace')}</div>
                </div>
              </div>
              <div className="flex h-8 items-center gap-2 rounded-md px-2 text-[12px] font-medium text-black/65">
                <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
                {lightbiAccount.account ? t('Settings') : t('Project data')}
              </div>
            </NavLink>
          )}
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex h-11 items-center rounded-[12px] px-3 text-[14px] font-medium transition-colors",
                  isActive ? "bg-white text-[#202123] shadow-sm ring-1 ring-black/[0.06]" : "text-black/65 hover:bg-white/65 hover:text-[#202123]",
                  !isSidebarExpanded ? "justify-center" : "justify-center md:justify-start"
                )
              }
              title={item.name}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.6} />
              {isSidebarExpanded && <span className="ml-3 hidden truncate md:block">{item.name}</span>}
            </NavLink>
          ))}
        </div>

        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-[86px] z-10 hidden rounded-full border border-black/10 bg-white p-1.5 text-black/45 shadow-sm transition-colors hover:text-[#202123] focus:outline-none md:block"
          aria-label={isSidebarExpanded ? t('Collapse sidebar') : t('Expand sidebar')}
        >
          {isSidebarExpanded ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#fbfbfa]">
        <Outlet />
      </main>
    </div>
    </UiTranslationBoundary>
  );
};
