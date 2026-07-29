import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
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

export const AppLayout: React.FC = () => {
  const isSidebarExpanded = !useAppRuntime(s => s.workspacePreferences.sidebarCollapsed);
  const toggleSidebar = useAppRuntime(s => s.toggleSidebar);

  const navItems = [
    { name: 'New brief', path: '/', icon: HomeIcon },
    { name: 'Decision briefs', path: '/dashboards', icon: FileText },
    { name: 'Charts', path: '/charts', icon: BarChart3 },
    { name: 'Datasets', path: '/datasets', icon: Database },
    { name: 'Sources', path: '/datasources', icon: Server },
    { name: 'Advanced', path: '/advanced', icon: TerminalSquare },
  ];

  const bottomNavItems = [
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
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
            <button disabled className="hidden h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg border border-black/10 bg-white/70 text-black/30 shadow-sm md:flex" title="Workspace alerts are not available in this Beta" aria-label="Workspace alerts are not available in this Beta">
              <Bell className="h-4 w-4" strokeWidth={1.6} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {isSidebarExpanded && (
            <div className="mb-3 hidden px-2 text-[11px] font-medium text-black/40 md:block">
              Workspace
            </div>
          )}
          <div className="flex flex-col gap-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
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
            <div className="hidden rounded-[14px] border border-black/10 bg-white/80 p-3 shadow-sm md:block">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-[11px] font-semibold text-black shadow-sm">
                  <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-[#202123]">LightBI Desktop</div>
                  <div className="truncate text-[11px] text-black/45">BA decision workspace</div>
                </div>
              </div>
              <NavLink
                to="/datasets"
                className="flex h-8 items-center gap-2 rounded-md px-2 text-[12px] font-medium text-black/65 hover:bg-black/[0.04] hover:text-[#202123]"
              >
                <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
                Project data
              </NavLink>
            </div>
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
          aria-label={isSidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isSidebarExpanded ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#fbfbfa]">
        <Outlet />
      </main>
    </div>
  );
};
