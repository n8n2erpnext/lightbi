import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bell, ExternalLink, Inbox, RefreshCw } from 'lucide-react';
import { useAnnouncementStore, type AppAnnouncement } from '../stores/announcement-store';
import { openExternalUrl } from '../lib/native-capabilities';
import { lightBIFrontendUrl } from '../lib/lightbi-routing';

const severityLabel = { info:'Information', success:'Update', warning:'Notice', critical:'Important' } as const;
const templates={
  general:{eyebrow:'LIGHTBI NOTICE',accent:'#2563eb',soft:'#eff6ff'}, promotion:{eyebrow:'LIGHTBI OFFER',accent:'#059669',soft:'#ecfdf5'},
  update:{eyebrow:'PRODUCT UPDATE',accent:'#4f46e5',soft:'#eef2ff'}, warning:{eyebrow:'IMPORTANT NOTICE',accent:'#d97706',soft:'#fffbeb'},
  hotfix:{eyebrow:'CRITICAL HOTFIX',accent:'#dc2626',soft:'#fef2f2'},
} as const;
function templateFor(item:AppAnnouncement){return templates[item.templateKind||'general']||templates.general;}

export const Notifications:React.FC=()=>{
  const store=useAnnouncementStore(); const navigate=useNavigate(); const params=useParams();
  const selected=store.items.find(item=>item.id===params.id) ?? store.items[0] ?? null;
  useEffect(()=>{ if(selected && store.unread(selected)) store.markRead(selected.id,selected.updatedAt); },[selected?.id,selected?.updatedAt]);
  const visual=selected?templateFor(selected):templates.general; const docsUrl=lightBIFrontendUrl('docs');
  return <div className="flex h-full w-full overflow-hidden bg-[#f6f7fb]">
    <section className="w-[360px] shrink-0 overflow-y-auto border-r border-black/10 bg-white/80">
      <div className="sticky top-0 z-10 border-b border-black/10 bg-white/95 px-5 py-4 backdrop-blur"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-sm font-semibold"><Inbox className="h-4 w-4"/>Inbox</div><button type="button" onClick={()=>void store.check(true)} className="inline-flex items-center gap-1 rounded-md border border-black/10 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600"><RefreshCw className="h-3 w-3"/>Refresh</button></div><p className="mt-1 text-xs text-black/45">LightBI product and service notifications are stored locally on this device.</p></div>
      {store.items.length===0?<div className="p-6 text-sm text-black/45">No notifications yet.</div>:store.items.map(item=>{
        const unread=store.unread(item),itemVisual=templateFor(item); return <button key={`${item.id}:${item.updatedAt}`} onClick={()=>navigate(`/notifications/${encodeURIComponent(item.id)}`)} className={`block w-full border-b border-black/5 px-5 py-4 text-left hover:bg-white ${selected?.id===item.id?'bg-white':''}`}>
          <div className="flex items-start gap-3"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{backgroundColor:unread?itemVisual.accent:'#cbd5e1'}}/><div className="min-w-0"><div className="truncate text-sm font-semibold text-slate-900">{item.title}</div><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.body}</p><div className="mt-2 text-[11px] text-slate-400">{new Date(item.updatedAt).toLocaleString()}</div></div></div>
        </button>;})}
    </section>
    <section className="flex-1 overflow-y-auto p-8 md:p-12">{selected?<article className="mx-auto max-w-[720px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]" style={{borderTop:`4px solid ${visual.accent}`}}>
      <header className="bg-[#080d1f] px-7 py-6 text-white md:px-8"><div className="text-[22px] font-bold tracking-tight">Light<span className="text-[#ffc400]">BI</span></div><div className="mt-1.5 text-xs text-[#a8b2c7]">Evidence-governed business analysis</div></header>
      <div className="px-7 py-8 md:px-8"><div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-[0.08em]" style={{backgroundColor:visual.soft,color:visual.accent}}><Bell className="h-3.5 w-3.5"/>{visual.eyebrow}</div><h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">{selected.title}</h1><div className="mt-2 text-sm text-slate-400">{severityLabel[selected.severity]} · {new Date(selected.updatedAt).toLocaleString()}</div><div className="mt-7 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{selected.body}</div>{selected.linkUrl&&<button onClick={()=>void openExternalUrl(selected.linkUrl!)} className="mt-7 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm">{selected.linkLabel||'Open link'}<ExternalLink className="h-4 w-4"/></button>}</div>
      <footer className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-100 bg-slate-50 px-7 py-4 text-xs text-slate-500 md:px-8"><span>LightBI</span><span>·</span><button type="button" onClick={()=>void openExternalUrl(docsUrl)} className="font-semibold text-blue-700 hover:underline">Documentation</button><span>·</span><span>support@thaiduy.digital</span></footer>
    </article>:<div className="flex h-full items-center justify-center text-sm text-black/40">Select a notification.</div>}</section>
  </div>;
};
