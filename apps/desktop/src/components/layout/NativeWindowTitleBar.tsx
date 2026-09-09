import React from "react";
import { Minus, Square, X } from "lucide-react";
import { isNativeLightBI } from "../../lib/native-runtime";

async function withWindow(action: "minimize" | "toggleMaximize" | "close"): Promise<void> {
  if (!isNativeLightBI()) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const window = getCurrentWindow();
  if (action === "minimize") await window.minimize();
  else if (action === "toggleMaximize") await window.toggleMaximize();
  else await window.close();
}

export const NativeWindowTitleBar: React.FC = () => {
  if (!isNativeLightBI()) return null;
  return (
    <div
      data-testid="native-window-titlebar"
      data-tauri-drag-region
      onDoubleClick={() => void withWindow("toggleMaximize")}
      className="relative flex h-7 shrink-0 select-none items-center border-b border-black/[0.06] bg-[var(--lb-sidebar)] text-[12px] text-black/55"
    >
      <div data-tauri-drag-region className="pointer-events-none absolute inset-0 flex items-center justify-center font-medium">LightBI</div>
      <div data-tauri-drag-region className="min-w-0 flex-1" />
      <div className="relative z-10 flex h-full items-stretch">
        <button type="button" aria-label="Minimize window" title="Minimize" onClick={() => void withWindow("minimize")} className="flex w-12 items-center justify-center text-black/55 transition-colors hover:bg-black/[0.06] hover:text-black">
          <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
        <button type="button" aria-label="Maximize or restore window" title="Maximize / Restore" onClick={() => void withWindow("toggleMaximize")} className="flex w-12 items-center justify-center text-black/55 transition-colors hover:bg-black/[0.06] hover:text-black">
          <Square className="h-3 w-3" strokeWidth={1.4} />
        </button>
        <button type="button" aria-label="Close window" title="Close" onClick={() => void withWindow("close")} className="flex w-12 items-center justify-center text-black/55 transition-colors hover:bg-red-600 hover:text-white">
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};
