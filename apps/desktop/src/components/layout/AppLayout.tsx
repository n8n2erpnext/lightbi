import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAppRuntime } from '@lightbi/runtime';
import { Home as HomeIcon, LayoutDashboard, PieChart, Database, Server, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
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
          isSidebarExpanded ? "w-[224px]" : "w-[48px]"
        )}
      >
        {/* Header / Logo Area */}
        <div className="h-14 flex items-center px-3 border-b border-gray-200">
          <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 bg-gray-900 rounded">
            <span className="text-white font-bold text-xs">L</span>
          </div>
          {isSidebarExpanded && <span className="ml-3 font-semibold text-sm">LightBI</span>}
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
                  !isSidebarExpanded && "justify-center"
                )
              }
              title={item.name}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
              {isSidebarExpanded && <span className="ml-3 truncate">{item.name}</span>}
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
                  !isSidebarExpanded && "justify-center"
                )
              }
              title={item.name}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
              {isSidebarExpanded && <span className="ml-3 truncate">{item.name}</span>}
            </NavLink>
          ))}
        </div>

        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-16 bg-white border border-gray-200 rounded-full p-1 text-gray-500 hover:text-gray-800 focus:outline-none shadow-sm z-10"
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
