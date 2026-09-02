import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Command, Copy, Mail, Search, UserPlus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppRuntime } from '@lightbi/runtime';
import { desktopCommandById, desktopCommands, displayAccelerator, matchesAccelerator } from '../../lib/desktop-commands';
import { openExternalUrl } from '../../lib/native-capabilities';
import { isNativeLightBI } from '../../lib/native-runtime';
import { useUpdateStore } from '../../stores/update-store';
import { buildGenerationManifest } from '../../lib/generation-manifest';

const INVITE_URL = 'https://lightbi.thaiduy.digital/';
const DOCUMENTATION_URL = buildGenerationManifest().channel === 'internal' ? 'https://lightbi-next.thaiduy.digital/docs' : (desktopCommandById('documentation')?.target ?? 'https://lightbi.thaiduy.digital/docs');
const KEYBOARD_SHORTCUTS_URL = `${DOCUMENTATION_URL.replace(/\/$/u, '')}/keyboard-shortcuts`;

type DesktopCommandCenterProps = {
  signedIn: boolean;
  accountLabel?: string | null;
};

type Overlay = 'palette' | 'shortcuts' | 'invite' | null;


export const dispatchDesktopCommand = (id: string) => {
  window.dispatchEvent(new CustomEvent('lightbi-desktop-command', { detail: id }));
};
export const DesktopCommandCenter: React.FC<DesktopCommandCenterProps> = ({ signedIn, accountLabel }) => {
  const navigate = useNavigate();
  const toggleSidebar = useAppRuntime((state) => state.toggleSidebar);
  const updater = useUpdateStore();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [query, setQuery] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);

  const visibleCommands = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return desktopCommands.filter((command) => {
      if (command.id === 'invite' && !signedIn) return false;
      if (!needle) return true;
      return `${command.label} ${command.group}`.toLowerCase().includes(needle);
    });
  }, [query, signedIn]);

  const closeOverlay = useCallback(() => {
    setOverlay(null);
    setQuery('');
    setInviteCopied(false);
  }, []);

  const execute = useCallback(async (id: string) => {
    const command = desktopCommandById(id);
    if (!command) return;
    if (command.kind === 'route') {
      closeOverlay();
      navigate(command.target);
      return;
    }
    if (command.kind === 'url') {
      closeOverlay();
      await openExternalUrl(command.target);
      return;
    }
    if (command.target === 'command-palette') {
      setOverlay('palette');
      setQuery('');
      return;
    }
    if (command.target === 'toggle-sidebar') {
      closeOverlay();
      toggleSidebar();
      return;
    }
    if (command.target === 'keyboard-shortcuts') {
      setOverlay('shortcuts');
      return;
    }
    if (command.target === 'check-updates') {
      closeOverlay();
      navigate('/settings?section=updates');
      void updater.check(true);
      return;
    }
    if (command.target === 'invite') {
      if (!signedIn) {
        navigate('/settings?section=account');
        return;
      }
      setOverlay('invite');
    }
  }, [closeOverlay, navigate, signedIn, toggleSidebar, updater]);
  useEffect(() => {
    const custom = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (typeof id === 'string') void execute(id);
    };
    window.addEventListener('lightbi-desktop-command', custom);
    return () => window.removeEventListener('lightbi-desktop-command', custom);
  }, [execute]);

  useEffect(() => {
    if (!isNativeLightBI()) return;
    let disposed = false;
    let unlisten: undefined | (() => void);
    void import('@tauri-apps/api/event').then(async ({ listen }) => {
      if (disposed) return;
      unlisten = await listen<string>('lightbi://desktop-command', (event) => void execute(event.payload));
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [execute]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && overlay) {
        event.preventDefault();
        closeOverlay();
        return;
      }
      const editable = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || (event.target instanceof HTMLElement && event.target.isContentEditable);
      for (const command of desktopCommands) {
        if (!matchesAccelerator(event, command.accelerator)) continue;
        if (editable && !['search', 'settings'].includes(command.id)) return;
        if (command.id === 'invite' && !signedIn) return;
        event.preventDefault();
        void execute(command.id);
        return;
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [closeOverlay, execute, overlay, signedIn]);

  if (!overlay) return null;

  const panel = 'w-[min(640px,calc(100vw-32px))] rounded-3xl border border-black/10 bg-white shadow-[0_24px_80px_rgba(15,23,42,.22)]';
  return <div className="fixed inset-0 z-[120] flex items-start justify-center bg-black/20 px-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) closeOverlay(); }}>
    <section className={panel} role="dialog" aria-modal="true" aria-label={overlay === 'palette' ? 'Search LightBI' : overlay === 'shortcuts' ? 'Keyboard shortcuts' : 'Invite to LightBI'}>
      <div className="flex items-center justify-between border-b border-black/8 px-5 py-4">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-900">{overlay === 'palette' ? <Search className="h-4 w-4" /> : overlay === 'shortcuts' ? <Command className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}{overlay === 'palette' ? 'Search LightBI' : overlay === 'shortcuts' ? 'Keyboard shortcuts' : 'Invite to LightBI'}</div>
        <button type="button" onClick={closeOverlay} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close"><X className="h-4 w-4" /></button>
      </div>
      {overlay === 'palette' && <div className="p-3">
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && visibleCommands[0]) void execute(visibleCommands[0].id); }} placeholder="Search commands and sections…" className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-blue-400 focus:bg-white" />
        <div className="mt-2 max-h-[52vh] overflow-y-auto py-1">
          {visibleCommands.length ? visibleCommands.map((command) => <button key={command.id} type="button" onClick={() => void execute(command.id)} className="flex w-full items-center justify-between gap-4 rounded-xl px-3 py-3 text-left text-sm hover:bg-slate-100"><span><span className="block font-medium text-slate-900">{command.label}</span><span className="mt-0.5 block text-xs text-slate-400">{command.group}</span></span>{command.accelerator && <kbd className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-500">{displayAccelerator(command.accelerator)}</kbd>}</button>) : <div className="px-3 py-8 text-center text-sm text-slate-400">No matching LightBI command.</div>}
        </div>
      </div>}
      {overlay === 'shortcuts' && <div className="max-h-[64vh] overflow-y-auto p-4">
        <p className="mb-3 px-2 text-sm leading-6 text-slate-500">The same registry drives native menu accelerators and in-app shortcuts, so the labels stay consistent.</p>
        {(['File', 'Edit', 'View', 'Help'] as const).map((group) => <div key={group} className="mb-4"><div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group}</div>{desktopCommands.filter((command) => command.group === group && command.accelerator && (command.id !== 'invite' || signedIn)).map((command) => <div key={command.id} className="flex items-center justify-between rounded-xl px-2 py-2.5 text-sm"><span className="text-slate-700">{command.label}</span><kbd className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500">{displayAccelerator(command.accelerator)}</kbd></div>)}</div>)}
        <button type="button" onClick={() => void openExternalUrl(KEYBOARD_SHORTCUTS_URL)} className="mx-2 inline-flex items-center gap-2 text-sm font-semibold text-blue-700"><BookOpen className="h-4 w-4" />Open keyboard shortcut guide</button>
      </div>}
      {overlay === 'invite' && <div className="p-5">
        <p className="text-sm leading-6 text-slate-600">Share LightBI with a teammate or friend. This sends no account data and does not create a seat or entitlement.</p>
        {accountLabel && <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">Signed in as <strong className="text-slate-700">{accountLabel}</strong></div>}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={async () => { await navigator.clipboard.writeText(INVITE_URL); setInviteCopied(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Copy className="h-4 w-4" />{inviteCopied ? 'Copied invite link' : 'Copy invite link'}</button>
          <button type="button" onClick={() => void openExternalUrl(`mailto:?subject=${encodeURIComponent('Try LightBI')}&body=${encodeURIComponent(`I use LightBI for local-first business analysis. You can try it here: ${INVITE_URL}`)}`)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"><Mail className="h-4 w-4" />Open email app</button>
        </div>
      </div>}
    </section>
  </div>;
};
