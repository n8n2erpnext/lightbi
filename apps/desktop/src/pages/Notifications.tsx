import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bell, ExternalLink, Inbox, RefreshCw } from 'lucide-react';
import { useAnnouncementStore } from '../stores/announcement-store';
import { openExternalUrl } from '../lib/native-capabilities';

const severityLabel = { info:'Information', success:'Update', warning:'Notice', critical:'Important' } as const;
export const Notifications:React.FC=()=>{
  const store=useAnnouncementStore(); const navigate=useNavigate(); const params=useParams();
  const selected=store.items.find(item=>item.id===params.id) ?? store.items[0] ?? null;
  useEffect(()=>{ if(selected && store.unread(selected)) store.markRead(selected.id,selected.updatedAt); },[selected?.id,selected?.updatedAt]);
  return <div className="flex h-full w-full overflow-hidden bg-[#fbfbfa]">
    <section className="w-[360px] shrink-0 overflow-y-auto border-r border-black/10 bg-white/70">
      <div className="sticky top-0 z-10 border-b border-black/10 bg-white/95 px-5 py-4 backdrop-blur"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-sm font-semibold"><Inbox className="h-4 w-4"/>Inbox</div><button type="button" onClick={()=>void store.check(true)} className="inline-flex items-center gap-1 rounded-md border border-black/10 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600"><RefreshCw className="h-3 w-3"/>Refresh</button></div><p className="mt-1 text-xs text-black/45">LightBI product and service notifications are stored locally on this device.</p></div>
      {store.items.length===0?<div className="p-6 text-sm text-black/45">No notifications yet.</div>:store.items.map(item=>{
        const unread=store.unread(item); return <button key={`${item.id}:${item.updatedAt}`} onClick={()=>navigate(`/notifications/${encodeURIComponent(item.id)}`)} className={`block w-full border-b border-black/5 px-5 py-4 text-left hover:bg-white ${selected?.id===item.id?'bg-white':''}`}>
          <div className="flex items-start gap-3"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${unread?'bg-blue-600':'bg-black/15'}`}/><div className="min-w-0"><div className="truncate text-sm font-semibold text-slate-900">{item.title}</div><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.body}</p><div className="mt-2 text-[11px] text-slate-400">{new Date(item.updatedAt).toLocaleString()}</div></div></div>
        </button>;})}
    </section>
    <section className="flex-1 overflow-y-auto p-8 md:p-12">{selected?<article className="mx-auto max-w-3xl"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black/40"><Bell className="h-4 w-4"/>{severityLabel[selected.severity]}</div><h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{selected.title}</h1><div className="mt-2 text-sm text-slate-400">{new Date(selected.updatedAt).toLocaleString()}</div><div className="mt-8 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{selected.body}</div>{selected.linkUrl&&<button onClick={()=>void openExternalUrl(selected.linkUrl!)} className="mt-8 inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">{selected.linkLabel||'Open link'}<ExternalLink className="h-4 w-4"/></button>}</article>:<div className="flex h-full items-center justify-center text-sm text-black/40">Select a notification.</div>}</section>
  </div>;
};
