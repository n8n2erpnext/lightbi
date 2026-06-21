import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAppRuntime } from '@lightbi/runtime';
import { Home as HomeIcon, LayoutDashboard, PieChart, Database, Server, Settings, ChevronLeft, ChevronRight, TerminalSquare } from 'lucide-react';
import { cn } from '../../lib/utils';

export const AppLayout: React.FC = () => {
  const isSidebarExpanded = !useAppRuntime(s => s.workspacePreferences.sidebarCollapsed);
  const toggleSidebar = useAppRuntime(s => s.toggleSidebar);

  const navItems = [
    { name: 'Home', path: '/', icon: HomeIcon },
    { name: 'Dashboards', path: '/dashboards', icon: LayoutDashboard },
    { name: 'Charts', path: '/charts', icon: PieChart },
    { name: 'Datasets', path: '/datasets', icon: Database },
    { name: 'Data Sources', path: '/datasources', icon: Server },
    { name: 'Advanced', path: '/advanced', icon: TerminalSquare },
  ];

  const bottomNavItems = [
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 text-gray-800">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col bg-white border-r border-gray-200 transition-all duration-300 relative",
          isSidebarExpanded ? "w-[48px] md:w-[224px]" : "w-[48px]"
        )}
      >
        {/* Header / Logo Area */}
        <div className="h-14 flex items-center px-3 border-b border-gray-200">
          <img
            src="/branding/lightbi-icon.svg"
            alt=""
            className="w-7 h-7 flex-shrink-0"
          />
          {isSidebarExpanded && (
            <img
              src="/branding/lightbi-wordmark.svg"
              alt="LightBI"
              className="ml-3 hidden w-[54px] h-4 object-contain md:block"
            />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center h-8 px-2 rounded-md transition-colors text-[13px] font-medium",
                  isActive ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  !isSidebarExpanded ? "justify-center" : "justify-center md:justify-start"
                )
              }
              title={item.name}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
              {isSidebarExpanded && <span className="ml-3 hidden truncate md:block">{item.name}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Navigation */}
        <div className="p-2 border-t border-gray-200 flex flex-col gap-1">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center h-8 px-2 rounded-md transition-colors text-[13px] font-medium",
                  isActive ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  !isSidebarExpanded ? "justify-center" : "justify-center md:justify-start"
                )
              }
              title={item.name}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
              {isSidebarExpanded && <span className="ml-3 hidden truncate md:block">{item.name}</span>}
            </NavLink>
          ))}
        </div>

        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-16 z-10 hidden rounded-full border border-gray-200 bg-white p-1 text-gray-500 shadow-sm hover:text-gray-800 focus:outline-none md:block"
        >
          {isSidebarExpanded ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        <Outlet />
      </main>
    </div>
  );
};
