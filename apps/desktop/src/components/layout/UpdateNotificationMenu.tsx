import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Inbox, RefreshCw } from "lucide-react";
import { useAnnouncementStore } from "../../stores/announcement-store";

export const UpdateNotificationMenu: React.FC = () => {
  const navigate = useNavigate();
  const announcements = useAnnouncementStore();
  const [open, setOpen] = useState(false);
  const reference = useRef<HTMLDivElement>(null);
  const unreadCount = announcements.unreadCount();
  const unread = announcements.items.filter((item) => announcements.unread(item));
  const hasCriticalAnnouncement = unread.some((item) => item.severity === "critical");

  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (!reference.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div ref={reference} className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-black/55 transition hover:bg-white/80 hover:text-black"
        title={unreadCount ? `${unreadCount} unread LightBI notification${unreadCount === 1 ? "" : "s"}` : "LightBI notifications"}
        aria-label="LightBI notifications"
        aria-expanded={open}
      >
        <Bell className="h-[17px] w-[17px]" strokeWidth={1.6} />
        {unreadCount > 0 && (
          <span className={`absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none text-white ring-2 ring-[#f1f1f0] ${hasCriticalAnnouncement ? "bg-red-500" : "bg-blue-600"}`}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-2xl border border-black/10 bg-white p-4 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black/45"><Inbox className="h-4 w-4" />Inbox</div>
            <button type="button" onClick={() => void announcements.check(true)} className="rounded-lg p-1.5 text-black/40 hover:bg-black/[0.05] hover:text-black" title="Refresh notifications"><RefreshCw className="h-3.5 w-3.5" /></button>
          </div>
          {unread.slice(0, 3).map((item) => (
            <button key={`${item.id}:${item.updatedAt}`} onClick={() => { announcements.markRead(item.id, item.updatedAt); setOpen(false); navigate(`/notifications/${encodeURIComponent(item.id)}`); }} className={`mt-3 block w-full rounded-xl border p-3 text-left ${item.severity === "critical" ? "border-red-100 bg-red-50" : item.severity === "warning" ? "border-amber-100 bg-amber-50" : item.severity === "success" ? "border-emerald-100 bg-emerald-50" : "border-blue-100 bg-blue-50"}`}>
              <div className="font-semibold text-slate-900">{item.title}</div>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{item.body}</p>
            </button>
          ))}
          {unread.length === 0 && <div className="mt-3 rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500">No unread notifications.</div>}
          <button type="button" onClick={() => { setOpen(false); navigate('/notifications'); }} className="mt-3 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Open notification inbox{unreadCount ? ` · ${unreadCount} unread` : ''}
          </button>
        </div>
      )}
    </div>
  );
};
