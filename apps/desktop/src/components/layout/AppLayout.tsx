import React, { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAppRuntime } from "@lightbi/runtime";
import {
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  Database,
  FileText,
  FolderOpen,
  Home as HomeIcon,
  LogOut,
  RefreshCw,
  Search,
  Server,
  Settings,
  Sparkles,
  TerminalSquare,
  UserPlus,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useUiLanguage } from "../../lib/ui-language";
import { UiTranslationBoundary } from "./UiTranslationBoundary";
import {
  trackFeatureUsage,
  type LightBIFeature,
} from "../../lib/app-usage-telemetry";
import { useLightBIAccount } from "../../hooks/useLightBIAccount";
import { useUpdateStore } from "../../stores/update-store";
import { useAnnouncementStore } from "../../stores/announcement-store";
import { buildGenerationManifest } from "../../lib/generation-manifest";
import { DesktopCommandCenter, dispatchDesktopCommand } from "./DesktopCommandCenter";
import { UpdateNotificationMenu } from "./UpdateNotificationMenu";

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const isSidebarExpanded = !useAppRuntime(
    (s) => s.workspacePreferences.sidebarCollapsed,
  );
  const toggleSidebar = useAppRuntime((s) => s.toggleSidebar);
  const { t } = useUiLanguage();
  const lightbiAccount = useLightBIAccount();
  const updater = useUpdateStore();
  const announcements = useAnnouncementStore();
  const generation = buildGenerationManifest();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const startup = window.setTimeout(() => void updater.check(), 2500);
    const timer = window.setInterval(
      () => void updater.check(),
      6 * 60 * 60 * 1000,
    );
    return () => {
      window.clearTimeout(startup);
      window.clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    const startup = window.setTimeout(() => void announcements.check(), 4000);
    const timer = window.setInterval(() => void announcements.check(true), 30 * 60 * 1000);
    return () => {
      window.clearTimeout(startup);
      window.clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!accountMenuOpen) return;
    const outside = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node))
        setAccountMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountMenuOpen(false);
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    mainScrollRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  useEffect(() => {
    const feature: LightBIFeature = location.pathname.startsWith("/advanced")
      ? "advanced_mode"
      : location.pathname.startsWith("/investigation")
        ? "deep_ba"
        : location.pathname.startsWith("/dashboards")
          ? "dashboard"
          : location.pathname.startsWith("/charts")
            ? "chart"
            : location.pathname.startsWith("/datasources")
              ? "database_connect"
              : location.pathname.startsWith("/datasets")
                ? "data_import"
                : "easy_mode";
    trackFeatureUsage(feature);
  }, [location.pathname]);

  const navItems = [
    { name: t("New brief"), path: "/", icon: HomeIcon },
    { name: t("Decision briefs"), path: "/dashboards", icon: FileText },
    { name: t("Charts"), path: "/charts", icon: BarChart3 },
    { name: t("Datasets"), path: "/datasets", icon: Database },
    { name: t("Sources"), path: "/datasources", icon: Server },
    { name: t("Advanced"), path: "/advanced", icon: TerminalSquare },
  ];

  if (location.pathname === "/settings") {
    return (
      <UiTranslationBoundary>
        <main className="flex h-screen w-screen overflow-hidden bg-[#fbfbfa] text-[#202123]">
          <Outlet />
          <DesktopCommandCenter signedIn={Boolean(lightbiAccount.account)} accountLabel={lightbiAccount.account?.account.email} />
        </main>
      </UiTranslationBoundary>
    );
  }

  return (
    <UiTranslationBoundary>
      <div className="flex h-screen w-screen overflow-hidden bg-[#f5f5f4] text-[#202123]">
        {/* Sidebar */}
        <aside
          className={cn(
            "relative flex flex-col border-r border-black/10 bg-[#f1f1f0] transition-all duration-300",
            isSidebarExpanded ? "w-[56px] md:w-[280px]" : "w-[56px]",
          )}
        >
          {/* Header / Logo Area */}
          <div className="flex h-[64px] items-center gap-2 px-3">
            <button
              type="button"
              onClick={toggleSidebar}
              title={`${isSidebarExpanded ? t("Collapse sidebar") : t("Expand sidebar")} · Ctrl+B`}
              aria-label={isSidebarExpanded ? t("Collapse sidebar") : t("Expand sidebar")}
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-black/55 transition hover:bg-white/80 hover:text-black md:inline-flex"
            >
              {isSidebarExpanded ? <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.6} /> : <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={1.6} />}
            </button>
            <div className="flex min-w-0 flex-1 items-center">
              <img src="/branding/lightbi-icon.svg" alt="" className="h-8 w-8 flex-shrink-0 drop-shadow-sm" />
              {isSidebarExpanded && <img src="/branding/lightbi-wordmark.svg" alt="LightBI" className="ml-2.5 hidden h-5 w-[76px] object-contain md:block" />}
            </div>
            {isSidebarExpanded && <UpdateNotificationMenu />}
            {isSidebarExpanded && generation.channel === "internal" && <span title={generation.generation_id} className="hidden rounded-full bg-violet-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-700 md:inline">NEXT</span>}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <button type="button" onClick={() => dispatchDesktopCommand("search")} title="Search LightBI · Ctrl+K" className={cn("mb-4 flex h-10 w-full items-center rounded-xl border border-black/8 bg-white/65 px-3 text-sm text-black/60 shadow-sm transition hover:bg-white hover:text-black", !isSidebarExpanded ? "justify-center" : "justify-center md:justify-start")}>
              <Search className="h-4 w-4 shrink-0" strokeWidth={1.7} />
              {isSidebarExpanded && <><span className="ml-3 hidden flex-1 text-left md:block">{t("Search")}</span><kbd className="hidden rounded border border-black/8 bg-white px-1.5 py-0.5 text-[10px] text-black/35 md:block">Ctrl K</kbd></>}
            </button>
            {isSidebarExpanded && (
              <div className="mb-3 hidden px-2 text-[11px] font-medium text-black/40 md:block">
                {t("Workspace")}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              {navItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  reloadDocument={item.path === "/"}
                  className={({ isActive }) =>
                    cn(
                      "group flex h-11 items-center rounded-[12px] px-3 text-[14px] font-medium transition-all duration-200",
                      isActive
                        ? "bg-white text-[#202123] shadow-sm ring-1 ring-black/[0.06]"
                        : "text-black/68 hover:bg-white/65 hover:text-[#202123]",
                      !isSidebarExpanded
                        ? "justify-center"
                        : "justify-center md:justify-start",
                    )
                  }
                  title={item.name}
                >
                  <item.icon
                    className="h-4 w-4 flex-shrink-0 text-black/58 transition-colors group-hover:text-[#202123]"
                    strokeWidth={1.6}
                  />
                  {isSidebarExpanded && (
                    <span className="ml-3 hidden truncate md:block">
                      {item.name}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Bottom Navigation */}
          <div className="flex flex-col gap-2 p-3">
            <div ref={accountMenuRef} className="relative">
              {accountMenuOpen && (
                <div
                  className={cn(
                    "absolute bottom-[calc(100%+8px)] z-50 rounded-2xl border border-black/10 bg-white p-2 shadow-2xl",
                    isSidebarExpanded ? "left-0 right-0" : "left-0 w-64",
                  )}
                >
                  <div className="border-b border-black/8 px-3 py-2">
                    <div className="truncate text-sm font-semibold">
                      {lightbiAccount.account?.account.display_name ||
                        lightbiAccount.account?.account.email ||
                        "LightBI Desktop"}
                    </div>
                    {lightbiAccount.account && <div className="truncate text-xs text-black/45">
                      {`${lightbiAccount.account.entitlement.tier.toUpperCase()} · ${lightbiAccount.account.account.email}`}
                    </div>}
                  </div>
                  <NavLink
                    to="/datasets"
                    onClick={() => setAccountMenuOpen(false)}
                    className="mt-1 flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-black/75 hover:bg-black/[0.05]"
                  >
                    <FolderOpen className="h-4 w-4" />
                    {t("Project data")}
                  </NavLink>
                  <NavLink to="/settings" onClick={() => setAccountMenuOpen(false)} className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-black/75 hover:bg-black/[0.05]">
                    <Settings className="h-4 w-4" />{t("Settings")}
                  </NavLink>
                  <NavLink to="/settings?section=updates" onClick={() => setAccountMenuOpen(false)} className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-black/75 hover:bg-black/[0.05]">
                    <RefreshCw className="h-4 w-4" /><span className="flex-1">{t("Updates")}</span>{updater.status === "ready" && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">READY</span>}
                  </NavLink>
                  {lightbiAccount.account && <button type="button" onClick={() => { setAccountMenuOpen(false); dispatchDesktopCommand("invite"); }} className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm text-black/75 hover:bg-black/[0.05]">
                    <UserPlus className="h-4 w-4" />Invite to LightBI
                  </button>}
                  {lightbiAccount.account ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        void lightbiAccount.logout();
                      }}
                      className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm text-black/75 hover:bg-black/[0.05]"
                    >
                      <LogOut className="h-4 w-4" />
                      {t("Log out")}
                    </button>
                  ) : (
                    <NavLink
                      to="/settings?section=account"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-black/75 hover:bg-black/[0.05]"
                    >
                      <Sparkles className="h-4 w-4" />
                      Sign in
                    </NavLink>
                  )}
                </div>
              )}
              {isSidebarExpanded ? (
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((value) => !value)}
                  aria-expanded={accountMenuOpen}
                  className="hidden w-full rounded-[14px] border border-black/10 bg-white/80 p-3 text-left shadow-sm hover:bg-white md:block"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-amber-400 text-[11px] font-semibold text-black shadow-sm">
                      {lightbiAccount.account?.account.avatar_url ? (
                        <img
                          src={lightbiAccount.account.account.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-[#202123]">{lightbiAccount.account?.account.display_name || lightbiAccount.account?.account.email || "LightBI Desktop"}</div>
                      {lightbiAccount.account && <div className="truncate text-[11px] text-black/45">{lightbiAccount.account.account.email}</div>}
                    </div>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 text-black/35" strokeWidth={1.6} />
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((value) => !value)}
                  className="flex h-11 w-full items-center justify-center rounded-xl hover:bg-white/70"
                  title={
                    lightbiAccount.account?.account.email || "LightBI account"
                  }
                >
                  {lightbiAccount.account?.account.avatar_url ? (
                    <img
                      src={lightbiAccount.account.account.avatar_url}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                </button>
              )}
            </div>
          </div>

        </aside>

        {/* Main Content */}
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#fbfbfa]">
          <div
            ref={mainScrollRef}
            className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
          >
            <Outlet />
          </div>
        </main>
        <DesktopCommandCenter signedIn={Boolean(lightbiAccount.account)} accountLabel={lightbiAccount.account?.account.email} />
      </div>
    </UiTranslationBoundary>
  );
};
