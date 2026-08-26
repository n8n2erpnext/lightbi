import React from "react";
import { useUpdateStore } from "../../stores/update-store";

export const UpdateSettingsPanel: React.FC = () => {
  const updater = useUpdateStore();
  const busy = [
    "checking",
    "available",
    "downloading",
    "verifying",
    "installing",
  ].includes(updater.status);
  const linux = updater.artifact?.kind === "deb";
  const message =
    updater.status === "checking"
      ? "Checking the release manifest…"
      : updater.status === "available" || updater.status === "downloading"
        ? `Downloading the verified update in the background${typeof updater.progress === "number" ? ` · ${updater.progress}%` : ""}`
        : updater.status === "verifying"
          ? "Download complete. Verifying SHA-256 and staging atomically…"
          : updater.status === "ready"
            ? `Version ${updater.manifest?.version} is staged and ready. Restart whenever you are ready.`
            : updater.status === "installing"
              ? "Opening the verified installer…"
              : updater.status === "failed"
                ? updater.error
                : "LightBI is up to date.";
  return (
    <div className="p-6">
      <h2 className="mb-4 text-lg font-medium text-slate-900">Updates</h2>
      <div className="rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="font-semibold text-slate-900">
              LightBI {updater.manifest?.version || "Beta"}
            </div>
            <div
              className={`mt-1 text-sm leading-6 ${updater.status === "failed" ? "text-red-700" : "text-slate-500"}`}
            >
              {message}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {updater.status === "ready" && (
              <button
                type="button"
                onClick={() => void updater.install()}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
              >
                {linux ? "Open .deb installer" : "Update & Restart"}
              </button>
            )}
            {updater.status === "failed" && (
              <button
                type="button"
                onClick={() =>
                  void (updater.manifest && updater.artifact
                    ? updater.prepare()
                    : updater.check(true))
                }
                className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Retry
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void updater.check(true)}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Check now
            </button>
          </div>
        </div>
        {(updater.status === "downloading" ||
          updater.status === "verifying") && (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{
                width: `${updater.status === "verifying" ? 100 : (updater.progress ?? 4)}%`,
              }}
            />
          </div>
        )}
        <p className="mt-4 text-xs leading-5 text-slate-400">
          Updates are downloaded to LightBI's application cache. LightBI never
          installs or restarts automatically.
        </p>
      </div>
    </div>
  );
};
