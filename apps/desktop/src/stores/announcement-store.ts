import { create } from 'zustand';
import { lightBIDistributionEndpoint } from '../lib/distribution-pairing';
import { externalFetch } from '../lib/native-capabilities';
import { isNativeLightBI } from '../lib/native-runtime';

export type AppAnnouncement = {
  id: string; title: string; body: string;
  severity: 'info'|'success'|'warning'|'critical'; templateKind?: 'general'|'promotion'|'update'|'warning'|'hotfix';
  dismissible: boolean; startsAt: string|null; endsAt: string|null;
  linkLabel: string|null; linkUrl: string|null; updatedAt: string;
};

type RevisionMap = Record<string,string>;
type AnnouncementStore = {
  items: AppAnnouncement[]; checkedAt: number|null; error: string;
  check: (force?: boolean) => Promise<void>;
  markRead: (id:string, updatedAt:string) => void;
  archive: (id:string, updatedAt:string) => void;
  restore: (id:string, updatedAt:string) => void;
  remove: (id:string, updatedAt:string) => void;
  unread: (item:AppAnnouncement) => boolean;
  isArchived: (item:AppAnnouncement) => boolean;
  activeItems: () => AppAnnouncement[];
  archivedItems: () => AppAnnouncement[];
  unreadCount: () => number;
};
let checkPromise: Promise<void>|null = null;
const INBOX_KEY='lightbi-announcement-inbox-v1';
const READ_KEY='lightbi-read-announcements-v1';
const ARCHIVE_KEY='lightbi-archived-announcements-v1';
const DELETE_KEY='lightbi-deleted-announcements-v1';

function readJson<T>(key:string, fallback:T):T { try { return JSON.parse(localStorage.getItem(key)||'') as T; } catch { return fallback; } }
function saveJson(key:string,value:unknown){ try { localStorage.setItem(key,JSON.stringify(value)); } catch { /* local inbox must never block the app */ } }
function valid(item:any): item is AppAnnouncement {
  if (!(item && typeof item.id==='string' && /^ann_[a-z0-9-]{8,80}$/u.test(item.id) && typeof item.title==='string' && item.title.length<=160 && typeof item.body==='string' && item.body.length<=1200 && ['info','success','warning','critical'].includes(item.severity) && (item.templateKind==null || ['general','promotion','update','warning','hotfix'].includes(item.templateKind)) && typeof item.updatedAt==='string')) return false;
  if (item.linkUrl!=null) { try { if (new URL(String(item.linkUrl)).protocol!=='https:') return false; } catch { return false; } }
  return true;
}
function cachedInbox():AppAnnouncement[] { return readJson<unknown[]>(INBOX_KEY,[]).filter(valid).slice(0,100); }
function sameRevision(map:RevisionMap,item:AppAnnouncement){ return map[item.id]===item.updatedAt; }
function mergeInbox(current:AppAnnouncement[], incoming:AppAnnouncement[]):AppAnnouncement[] {
  const deleted=readJson<RevisionMap>(DELETE_KEY,{});
  const map=new Map<string,AppAnnouncement>();
  for (const item of current) if(!sameRevision(deleted,item)) map.set(item.id,item);
  for (const item of incoming) {
    if(sameRevision(deleted,item)) continue;
    const prior=map.get(item.id);
    if (!prior || Date.parse(item.updatedAt)>=Date.parse(prior.updatedAt)) map.set(item.id,item);
  }
  return [...map.values()].sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt)).slice(0,100);
}

export const useAnnouncementStore=create<AnnouncementStore>((set,get)=>({
  items: typeof localStorage==='undefined'?[]:cachedInbox(), checkedAt:null,error:'',
  check:(force=false)=>{
    if(!isNativeLightBI()) return Promise.resolve();
    if(checkPromise) return checkPromise;
    if(!force&&get().checkedAt&&Date.now()-Number(get().checkedAt)<30*60*1000) return Promise.resolve();
    checkPromise=(async()=>{ try {
      const response=await externalFetch(`${lightBIDistributionEndpoint()}/api/announcements?channel=app`,{cache:'no-store'});
      if(!response.ok) throw new Error('Announcement service unavailable.');
      const payload=await response.json() as {announcements?:unknown[]};
      const incoming=(payload.announcements||[]).filter(valid);
      const items=mergeInbox(get().items,incoming); saveJson(INBOX_KEY,items);
      set({items,checkedAt:Date.now(),error:''});
    } catch(cause) { set({checkedAt:Date.now(),error:cause instanceof Error?cause.message:'Announcement check failed.'}); }
    finally { checkPromise=null; } })();
    return checkPromise;
  },
  markRead:(id,updatedAt)=>{ const read=readJson<RevisionMap>(READ_KEY,{}); read[id]=updatedAt; saveJson(READ_KEY,read); set({items:[...get().items]}); },
  archive:(id,updatedAt)=>{ const item=get().items.find(entry=>entry.id===id&&entry.updatedAt===updatedAt); if(!item || item.dismissible===false) return; const archived=readJson<RevisionMap>(ARCHIVE_KEY,{}); archived[id]=updatedAt; saveJson(ARCHIVE_KEY,archived); get().markRead(id,updatedAt); },
  restore:(id,updatedAt)=>{ const archived=readJson<RevisionMap>(ARCHIVE_KEY,{}); if(archived[id]===updatedAt){ delete archived[id]; saveJson(ARCHIVE_KEY,archived); set({items:[...get().items]}); } },
  remove:(id,updatedAt)=>{ const item=get().items.find(entry=>entry.id===id&&entry.updatedAt===updatedAt); if(!item || item.dismissible===false) return; const deleted=readJson<RevisionMap>(DELETE_KEY,{}); deleted[id]=updatedAt; saveJson(DELETE_KEY,deleted); const items=get().items.filter(entry=>!(entry.id===id&&entry.updatedAt===updatedAt)); saveJson(INBOX_KEY,items); set({items}); },
  unread:(item)=>readJson<RevisionMap>(READ_KEY,{})[item.id]!==item.updatedAt,
  isArchived:(item)=>sameRevision(readJson<RevisionMap>(ARCHIVE_KEY,{}),item),
  activeItems:()=>{ const archived=readJson<RevisionMap>(ARCHIVE_KEY,{}); return get().items.filter(item=>!sameRevision(archived,item)); },
  archivedItems:()=>{ const archived=readJson<RevisionMap>(ARCHIVE_KEY,{}); return get().items.filter(item=>sameRevision(archived,item)); },
  unreadCount:()=>{ const read=readJson<RevisionMap>(READ_KEY,{}); const archived=readJson<RevisionMap>(ARCHIVE_KEY,{}); return get().items.filter(item=>!sameRevision(archived,item)&&read[item.id]!==item.updatedAt).length; },
}));
