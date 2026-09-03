// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../lib/distribution-pairing', () => ({ lightBIDistributionEndpoint: () => 'https://distribution.test' }));
vi.mock('../lib/native-runtime', () => ({ isNativeLightBI: () => true }));
vi.mock('../lib/native-capabilities', () => ({ externalFetch: (input: string | URL, init?: RequestInit) => fetch(input, init) }));
import { useAnnouncementStore } from './announcement-store';
const item=(updatedAt='2026-08-31T14:00:00.000Z')=>({id:'ann_12345678-abcd',title:'Service notice',body:'Scheduled work tonight.',severity:'warning' as const,templateKind:'warning' as const,dismissible:true,startsAt:null,endsAt:null,linkLabel:'Status',linkUrl:'https://lightbi.example/status',updatedAt});
describe('announcement inbox store',()=>{
  beforeEach(()=>{localStorage.clear();useAnnouncementStore.setState({items:[],checkedAt:null,error:''});vi.restoreAllMocks();});
  it('pulls validated app notifications and rejects unsafe links',async()=>{const fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({announcements:[item(),{...item(),id:'bad',linkUrl:'javascript:alert(1)'}]}),{status:200}));await useAnnouncementStore.getState().check(true);expect(fetcher).toHaveBeenCalledWith('https://distribution.test/api/announcements?channel=app',{cache:'no-store'});expect(useAnnouncementStore.getState().items.map(x=>x.id)).toEqual(['ann_12345678-abcd']);});
  it('persists notification content locally and tracks read state by revision',async()=>{vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({announcements:[item()]}),{status:200}));await useAnnouncementStore.getState().check(true);expect(JSON.parse(localStorage.getItem('lightbi-announcement-inbox-v1')||'[]')[0].body).toBe('Scheduled work tonight.');expect(useAnnouncementStore.getState().unreadCount()).toBe(1);useAnnouncementStore.getState().markRead(item().id,item().updatedAt);expect(useAnnouncementStore.getState().unreadCount()).toBe(0);});

  it('accepts governed template kinds while preserving legacy cached announcements',async()=>{const legacy={...item()};delete (legacy as any).templateKind;vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({announcements:[legacy,{...item(),id:'ann_hotfix-12345678',templateKind:'hotfix',severity:'critical'},{...item(),id:'ann_badtempl-12345678',templateKind:'raw_html'}]}),{status:200}));await useAnnouncementStore.getState().check(true);expect(useAnnouncementStore.getState().items.map(x=>x.id).sort()).toEqual(['ann_12345678-abcd','ann_hotfix-12345678']);});
  it('keeps read history but marks a revised notification unread again',async()=>{vi.spyOn(globalThis,'fetch').mockResolvedValueOnce(new Response(JSON.stringify({announcements:[item()]}),{status:200})).mockResolvedValueOnce(new Response(JSON.stringify({announcements:[item('2026-08-31T15:00:00.000Z')]}),{status:200}));await useAnnouncementStore.getState().check(true);useAnnouncementStore.getState().markRead(item().id,item().updatedAt);await useAnnouncementStore.getState().check(true);expect(useAnnouncementStore.getState().items[0]?.updatedAt).toBe('2026-08-31T15:00:00.000Z');expect(useAnnouncementStore.getState().unreadCount()).toBe(1);});
  it('archives only the current local revision and lets a newer Distribution revision return to Inbox',async()=>{
    vi.spyOn(globalThis,'fetch').mockResolvedValueOnce(new Response(JSON.stringify({announcements:[item()]}),{status:200})).mockResolvedValueOnce(new Response(JSON.stringify({announcements:[item('2026-08-31T16:00:00.000Z')]}),{status:200}));
    await useAnnouncementStore.getState().check(true);
    useAnnouncementStore.getState().archive(item().id,item().updatedAt);
    expect(useAnnouncementStore.getState().activeItems()).toHaveLength(0);
    expect(useAnnouncementStore.getState().archivedItems()).toHaveLength(1);
    expect(useAnnouncementStore.getState().unreadCount()).toBe(0);
    await useAnnouncementStore.getState().check(true);
    expect(useAnnouncementStore.getState().activeItems()[0]?.updatedAt).toBe('2026-08-31T16:00:00.000Z');
    expect(useAnnouncementStore.getState().unreadCount()).toBe(1);
  });

  it('delete tombstones only the current revision and preserves non-dismissible Distribution notices',async()=>{
    const locked={...item(),id:'ann_locked-12345678',dismissible:false};
    vi.spyOn(globalThis,'fetch').mockResolvedValueOnce(new Response(JSON.stringify({announcements:[item(),locked]}),{status:200})).mockResolvedValueOnce(new Response(JSON.stringify({announcements:[item(),locked]}),{status:200})).mockResolvedValueOnce(new Response(JSON.stringify({announcements:[item('2026-08-31T17:00:00.000Z'),locked]}),{status:200}));
    await useAnnouncementStore.getState().check(true);
    useAnnouncementStore.getState().remove(item().id,item().updatedAt);
    useAnnouncementStore.getState().archive(locked.id,locked.updatedAt);
    expect(useAnnouncementStore.getState().items.some(entry=>entry.id===locked.id)).toBe(true);
    expect(useAnnouncementStore.getState().isArchived(locked)).toBe(false);
    await useAnnouncementStore.getState().check(true);
    expect(useAnnouncementStore.getState().items.some(entry=>entry.id===item().id)).toBe(false);
    await useAnnouncementStore.getState().check(true);
    expect(useAnnouncementStore.getState().items.find(entry=>entry.id===item().id)?.updatedAt).toBe('2026-08-31T17:00:00.000Z');
  });

});
