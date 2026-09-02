import React from "react";
import { useUpdateStore } from "../../stores/update-store";
import { buildGenerationManifest } from "../../lib/generation-manifest";
import { useSmoothedUpdateProgress } from "../../hooks/useSmoothedUpdateProgress";

export const UpdateSettingsPanel: React.FC = () => {
  const updater = useUpdateStore();
  const progress = useSmoothedUpdateProgress(
    updater.progress,
    updater.status === "verifying" || updater.status === "ready",
  );
  const progressLabel = Math.floor(progress);
  const internal = buildGenerationManifest().channel === "internal";
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
        ? `Downloading the update artifact in the background${typeof updater.progress === "number" ? ` · ${progressLabel}%` : ""}`
        : updater.status === "verifying"
          ? "Download complete. Checking SHA-256 integrity and staging atomically…"
          : updater.status === "ready"
            ? `Version ${updater.manifest?.version} is staged and ready. Update & Restart will ask Windows for permission, install silently, then reopen LightBI.`
            : updater.status === "installing"
              ? "Waiting for Windows permission. After approval, LightBI will update silently and reopen."
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
            {updater.status === "ready" && !updater.qaSimulation && (
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
            {internal && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void updater.simulateForQa()}
                className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 disabled:opacity-50"
              >
                Test update progress
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
                width: `${updater.status === "verifying" ? 100 : Math.max(progress, 4)}%`,
              }}
            />
          </div>
        )}
        <p className="mt-4 text-xs leading-5 text-slate-400">
          SHA-256 protects download/staging integrity only; it does not prove official LightBI origin. Official identity requires independent REL/ATT evidence and the applicable OS publisher identity. Installation starts only after you choose Update & Restart.
        </p>
      </div>
    </div>
  );
};
