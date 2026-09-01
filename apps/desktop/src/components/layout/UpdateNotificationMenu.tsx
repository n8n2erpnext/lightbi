import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useUpdateStore } from "../../stores/update-store";
import { useAnnouncementStore } from "../../stores/announcement-store";

export const UpdateNotificationMenu: React.FC = () => {
  const updater = useUpdateStore();
  const navigate = useNavigate();
  const announcements = useAnnouncementStore();
  const [open, setOpen] = useState(false);
  const reference = useRef<HTMLDivElement>(null);
  const updateActive = [
    "available",
    "downloading",
    "verifying",
    "ready",
    "installing",
    "failed",
  ].includes(updater.status);
  const unreadCount = announcements.unreadCount();
  const active = updateActive || unreadCount > 0;
  const hasCriticalAnnouncement = announcements.items.some((item) => item.severity === "critical");

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

  const preparing =
    updater.status === "available" ||
    updater.status === "downloading" ||
    updater.status === "verifying";
  const linux = updater.artifact?.kind === "deb";
  return (
    <div ref={reference} className="relative hidden md:block">
      <button
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white/70 text-black/55 shadow-sm hover:bg-white"
        title="LightBI notifications"
        aria-label="LightBI notifications"
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" strokeWidth={1.6} />
        {active && (
          <span
            className={`absolute right-1 top-1 h-2 w-2 rounded-full ring-2 ring-white ${updater.status === "failed" || hasCriticalAnnouncement ? "bg-red-500" : updater.status === "ready" ? "bg-emerald-500" : "bg-blue-600"}`}
          />
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-10 z-50 w-80 rounded-xl border border-black/10 bg-white p-4 shadow-2xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-black/40">
            Notifications
          </div>
          {announcements.items.filter(item => announcements.unread(item)).slice(0,3).map((item) => (
            <button key={`${item.id}:${item.updatedAt}`} onClick={() => { announcements.markRead(item.id,item.updatedAt); setOpen(false); navigate(`/notifications/${encodeURIComponent(item.id)}`); }} className={`mt-3 block w-full rounded-lg border p-3 text-left ${item.severity === "critical" ? "border-red-100 bg-red-50" : item.severity === "warning" ? "border-amber-100 bg-amber-50" : item.severity === "success" ? "border-emerald-100 bg-emerald-50" : "border-blue-100 bg-blue-50"}`}>
              <div className="font-semibold text-slate-900">{item.title}</div>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{item.body}</p>
            </button>
          ))}
          {announcements.items.length > 0 && (
            <button onClick={() => { setOpen(false); navigate('/notifications'); }} className="mt-3 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Open notification inbox{unreadCount ? ` · ${unreadCount} unread` : ''}</button>
          )}
          {preparing && (
            <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
              <div className="font-semibold text-slate-900">
                LightBI {updater.manifest?.version} is available
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {updater.status === "verifying"
                  ? "Download complete. Verifying the staged artifact…"
                  : "Downloading in the background. Keep working normally."}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-blue-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{
                    width: `${updater.status === "verifying" ? 100 : (updater.progress ?? 4)}%`,
                  }}
                />
              </div>
              <div className="mt-2 text-[11px] font-medium text-blue-700">
                {updater.status === "verifying"
                  ? "Verifying…"
                  : typeof updater.progress === "number"
                    ? `Downloading ${updater.progress}%`
                    : "Downloading…"}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="mt-3 rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700"
              >
                Hide
              </button>
            </div>
          )}
          {updater.status === "ready" && (
            <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
              <div className="font-semibold text-slate-900">Update ready</div>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {updater.qaSimulation ? "The internal progress simulation reached READY." : "The installer is staged and verified."}{" "}
                {updater.qaSimulation ? "No installer will be launched by this simulation." : linux
                  ? "Your package manager will ask for confirmation."
                  : "Restart whenever you are ready."}
              </p>
              <div className="mt-3 flex gap-2">
                {!updater.qaSimulation && <button
                  onClick={() => void updater.install()}
                  className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  {linux ? "Open .deb installer" : "Update & Restart"}
                </button>}
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800"
                >
                  Later
                </button>
              </div>
            </div>
          )}
          {updater.status === "installing" && (
            <div className="mt-3 text-sm text-slate-500">
              Opening the verified installer…
            </div>
          )}
          {updater.status === "failed" && (
            <div className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3">
              <div className="font-semibold text-red-900">
                Update preparation failed
              </div>
              <p className="mt-1 text-xs leading-5 text-red-700">
                {updater.error ||
                  "The current LightBI version remains unchanged."}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() =>
                    void (updater.manifest && updater.artifact
                      ? updater.prepare()
                      : updater.check(true))
                  }
                  className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Retry
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-800"
                >
                  Later
                </button>
              </div>
            </div>
          )}
          {!active && (
            <div className="mt-3 text-sm text-slate-500">
              {updater.status === "checking"
                ? "Checking for updates…"
                : "You are up to date."}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
