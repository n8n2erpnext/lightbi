import React from "react";
import { AlertCircle, CheckCircle2, Download, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUpdateStore } from "../../stores/update-store";
import { cn } from "../../lib/utils";
import { useSmoothedUpdateProgress } from "../../hooks/useSmoothedUpdateProgress";

type UpdateSidebarStatusProps = {
  expanded: boolean;
};

export const UpdateSidebarStatus: React.FC<UpdateSidebarStatusProps> = ({
  expanded,
}) => {
  const navigate = useNavigate();
  const updater = useUpdateStore();
  const progress = useSmoothedUpdateProgress(
    updater.progress,
    updater.status === "verifying" || updater.status === "ready",
  );
  const progressLabel = Math.floor(progress);
  const visible = [
    "checking",
    "available",
    "downloading",
    "verifying",
    "ready",
    "installing",
    "failed",
  ].includes(updater.status);

  if (!visible) return null;
  const downloading = updater.status === "available" || updater.status === "downloading";
  const busy = ["checking", "verifying", "installing"].includes(updater.status);
  const ready = updater.status === "ready";
  const failed = updater.status === "failed";
  const label = failed
    ? `Update failed${updater.error ? `: ${updater.error}` : ""}`
    : ready
      ? `LightBI ${updater.manifest?.version ?? "update"} downloaded · SHA-256 integrity checked`
      : updater.status === "verifying"
        ? "Checking downloaded update integrity"
        : updater.status === "checking"
          ? "Checking for LightBI updates"
          : updater.status === "installing"
            ? "Waiting for Windows permission to update LightBI"
            : `Downloading LightBI ${updater.manifest?.version ?? "update"}${
                typeof updater.progress === "number" ? ` · ${progressLabel}%` : ""
              }`;

  return (
    <button
      type="button"
      onClick={() => navigate("/settings?section=updates")}
      title={label}
      aria-label={label}
      className={cn(
        "z-20 flex h-9 w-9 items-center justify-center rounded-full border bg-white text-slate-700 shadow-sm transition hover:bg-slate-50",
        expanded ? "absolute bottom-3 right-3" : "mx-auto mt-1",
        failed
          ? "border-red-200 text-red-700"
          : ready
            ? "border-emerald-200 text-slate-700"
            : "border-slate-200",
      )}
      style={
        downloading && progress > 0
          ? {
              background: `conic-gradient(rgb(37 99 235) ${progress * 3.6}deg, white 0deg)`,
              padding: 2,
            }
          : undefined
      }
    >
      <span className="relative flex h-full w-full items-center justify-center rounded-full bg-white">
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} />
        ) : (
          <Download className="h-4 w-4" strokeWidth={1.8} />
        )}
        {ready && (
          <CheckCircle2
            className="absolute -bottom-1 -right-1 h-3.5 w-3.5 fill-emerald-500 text-white"
            strokeWidth={2.5}
          />
        )}
        {failed && (
          <AlertCircle
            className="absolute -bottom-1 -right-1 h-3.5 w-3.5 fill-red-500 text-white"
            strokeWidth={2.5}
          />
        )}
      </span>
    </button>
  );
};
