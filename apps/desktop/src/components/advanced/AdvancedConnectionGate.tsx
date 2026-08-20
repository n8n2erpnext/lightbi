import React from 'react';
import { FileSpreadsheet, Loader2, Play, Plug } from 'lucide-react';
import type { AdvancedConnection, AdvancedConnectionProfile, AdvancedProviderPlugin } from '../../lib/advanced-api';
import type { AdvancedWorkspaceSource } from '../../stores/advanced-source-store';

type AdvancedConnectionGateProps = {
  orderedSources: AdvancedWorkspaceSource[];
  preferredSourceId: string | null;
  isConnecting: boolean;
  profiles: AdvancedConnectionProfile[];
  providerPlugins: AdvancedProviderPlugin[];
  selectedProfileId: string;
  connectionProvider: AdvancedConnection['provider'];
  connectionName: string;
  connectionUrl: string;
  databaseName: string;
  tlsMode: string;
  safeMode: AdvancedConnectionProfile['safeMode'];
  profileGroupName: string;
  profileTagName: string;
  sshHost: string;
  sshUser: string;
  sshPort: number;
  saveProfile: boolean;
  connectionError: string;
  onOpenFileSource: (source: AdvancedWorkspaceSource) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onProviderChange: (provider: AdvancedConnection['provider']) => void;
  onProfileChange: (profileId: string) => void;
  onConnectionNameChange: (value: string) => void;
  onConnectionUrlChange: (value: string) => void;
  onDatabaseNameChange: (value: string) => void;
  onTlsModeChange: (value: string) => void;
  onSafeModeChange: (value: AdvancedConnectionProfile['safeMode']) => void;
  onProfileGroupNameChange: (value: string) => void;
  onProfileTagNameChange: (value: string) => void;
  onSshHostChange: (value: string) => void;
  onSshUserChange: (value: string) => void;
  onSshPortChange: (value: number) => void;
  onSaveProfileChange: (value: boolean) => void;
};

export const AdvancedConnectionGate: React.FC<AdvancedConnectionGateProps> = ({
  orderedSources,
  preferredSourceId,
  isConnecting,
  profiles,
  providerPlugins,
  selectedProfileId,
  connectionProvider,
  connectionName,
  connectionUrl,
  databaseName,
  tlsMode,
  safeMode,
  profileGroupName,
  profileTagName,
  sshHost,
  sshUser,
  sshPort,
  saveProfile,
  connectionError,
  onOpenFileSource,
  onSubmit,
  onProviderChange,
  onProfileChange,
  onConnectionNameChange,
  onConnectionUrlChange,
  onDatabaseNameChange,
  onTlsModeChange,
  onSafeModeChange,
  onProfileGroupNameChange,
  onProfileTagNameChange,
  onSshHostChange,
  onSshUserChange,
  onSshPortChange,
  onSaveProfileChange,
}) => (
  <div className="flex flex-1 items-start justify-center overflow-auto bg-gray-50 p-3 sm:p-8">
    <div className="mt-4 w-full max-w-3xl space-y-5 sm:mt-8">
      {orderedSources.length > 0 && <section className="border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
          <FileSpreadsheet className="h-4 w-4 text-blue-600" />
          <div><h2 className="text-sm font-semibold text-gray-900">Datasets understood in Simple</h2><p className="text-[11px] text-gray-500">Open the original file or online workbook without importing or profiling it again.</p></div>
        </div>
        <div className="divide-y divide-gray-100">
          {orderedSources.map(source => <div key={source.id} className="flex min-w-0 items-center gap-3 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-blue-50 text-blue-700"><FileSpreadsheet className="h-4 w-4" /></div>
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate text-[12px] font-medium text-gray-800">{source.name}</span>{source.id === preferredSourceId && <span className="shrink-0 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-emerald-700">Current</span>}</div><p className="truncate text-[10px] text-gray-500">{source.sourceKind === 'online_link' ? 'Online link' : 'Local file'} · {source.tables.length} table{source.tables.length === 1 ? '' : 's'} · {source.tables.reduce((sum, table) => sum + table.rowCount, 0).toLocaleString()} rows</p></div>
            <button type="button" disabled={isConnecting} onClick={() => onOpenFileSource(source)} className="flex h-8 shrink-0 items-center gap-1.5 bg-blue-600 px-3 text-[11px] font-medium text-white hover:bg-blue-700 disabled:opacity-50">{isConnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Open</button>
          </div>)}
        </div>
      </section>}
      <form className="w-full border border-gray-200 bg-white p-4 shadow-sm sm:p-6" onSubmit={onSubmit}>
        <div className="mb-5 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center bg-blue-50 text-blue-700"><Plug className="h-4 w-4" /></div><div><h2 className="text-sm font-semibold text-gray-900">Open database session</h2><p className="text-[12px] text-gray-500">Credentials stay in backend memory for this server session.</p></div></div>
        <label className="mb-1 block text-[11px] font-medium text-gray-600" htmlFor="advanced-provider">Provider</label>
        <select id="advanced-provider" className="mb-4 h-9 w-full border border-gray-300 bg-white px-3 text-sm" value={connectionProvider} onChange={event => onProviderChange(event.target.value as AdvancedConnection['provider'])}>
          {providerPlugins.map(provider => (
            <option key={provider.manifest.id} value={provider.manifest.id}>{provider.manifest.displayName}</option>
          ))}
        </select>
        {profiles.length > 0 && <><label className="mb-1 block text-[11px] font-medium text-gray-600" htmlFor="advanced-profile">Saved profile</label><select id="advanced-profile" className="mb-4 h-9 w-full border border-gray-300 bg-white px-3 text-sm" value={selectedProfileId} onChange={event => onProfileChange(event.target.value)}><option value="">New connection</option>{profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.groupName ? `${profile.groupName} / ` : ''}{profile.name} · {profile.provider}{profile.tagName ? ` · ${profile.tagName}` : ''}</option>)}</select></>}
        <label className="mb-1 block text-[11px] font-medium text-gray-600" htmlFor="advanced-name">Connection name</label>
        <input id="advanced-name" className="mb-4 h-9 w-full border border-gray-300 px-3 text-sm outline-none focus:border-blue-500" value={connectionName} onChange={event => onConnectionNameChange(event.target.value)} required />
        <label className="mb-1 block text-[11px] font-medium text-gray-600" htmlFor="advanced-url">Connection URL, ADO string, or SQLite path</label>
        <input id="advanced-url" aria-label="Connection URL or SQLite path" type="password" disabled={Boolean(selectedProfileId)} className="h-9 w-full border border-gray-300 px-3 font-mono text-sm outline-none focus:border-blue-500 disabled:bg-gray-100" placeholder={selectedProfileId ? 'Encrypted credential from profile' : connectionProvider === 'mongodb' ? 'mongodb+srv://user:password@cluster/database' : connectionProvider === 'sqlite' ? 'sqlite:///path/to/database.db' : connectionProvider === 'sqlserver' ? 'server=tcp:host,1433;database=db;user=user;password=...' : `${connectionProvider}://user:password@host/database`} value={connectionUrl} onChange={event => onConnectionUrlChange(event.target.value)} required={!selectedProfileId} />
        {connectionProvider === 'mongodb' && <><label className="mb-1 mt-4 block text-[11px] font-medium text-gray-600" htmlFor="advanced-database">Database override</label><input id="advanced-database" className="h-9 w-full border border-gray-300 px-3 text-sm" value={databaseName} onChange={event => onDatabaseNameChange(event.target.value)} placeholder="Optional when present in URL" /></>}
        {!selectedProfileId && <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block"><span className="text-[11px] font-medium text-gray-600">TLS policy</span><select className="mt-1 h-8 w-full border border-gray-300 bg-white px-2 text-[11px]" value={tlsMode} onChange={event => onTlsModeChange(event.target.value)}><option value="driver-default">Driver default</option><option value="require">Require TLS</option><option value="verify-full">Verify full</option></select></label>
          <label className="block"><span className="text-[11px] font-medium text-gray-600">Safe mode</span><select className="mt-1 h-8 w-full border border-gray-300 bg-white px-2 text-[11px]" value={safeMode} onChange={event => onSafeModeChange(event.target.value as AdvancedConnectionProfile['safeMode'])}><option value="confirm_writes">Confirm writes</option><option value="read_only">Read only</option><option value="off">Off</option></select></label>
          <input className="h-8 border border-gray-300 px-2 text-[11px]" value={profileGroupName} onChange={event => onProfileGroupNameChange(event.target.value)} placeholder="Profile group" />
          <input className="h-8 border border-gray-300 px-2 text-[11px]" value={profileTagName} onChange={event => onProfileTagNameChange(event.target.value)} placeholder="Profile tag" />
          <input className="h-8 border border-gray-300 px-2 text-[11px]" value={sshHost} onChange={event => onSshHostChange(event.target.value)} placeholder="SSH host" />
          <div className="flex gap-2"><input className="h-8 min-w-0 flex-1 border border-gray-300 px-2 text-[11px]" value={sshUser} onChange={event => onSshUserChange(event.target.value)} placeholder="SSH user" /><input type="number" className="h-8 w-16 border border-gray-300 px-2 text-[11px]" value={sshPort} onChange={event => onSshPortChange(Number(event.target.value) || 22)} /></div>
          <label className="col-span-2 flex items-center gap-2 text-[11px] text-gray-600"><input type="checkbox" checked={saveProfile} onChange={event => onSaveProfileChange(event.target.checked)} /> Save encrypted profile</label>
        </div>}
        {connectionError && <div className="mt-3 border-l-2 border-red-500 bg-red-50 px-3 py-2 text-[12px] text-red-700">{connectionError}</div>}
        <button type="submit" disabled={isConnecting} className="mt-5 flex h-9 items-center gap-2 bg-gray-900 px-4 text-[12px] font-medium text-white hover:bg-gray-800 disabled:opacity-50">{isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />} Connect</button>
      </form>
    </div>
  </div>
);
