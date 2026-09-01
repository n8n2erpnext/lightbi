import { create } from "zustand";
import type {
  LightBIReleaseArtifact,
  LightBIReleaseManifest,
} from "@lightbi/core-types";
import { lightBIDistributionEndpoint } from "../lib/distribution-pairing";
import { externalFetch } from "../lib/native-capabilities";
import { isNativeLightBI } from "../lib/native-runtime";
import { buildGenerationManifest } from "../lib/generation-manifest";
import { trackUpdateEvent } from "../lib/app-usage-telemetry";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "up_to_date"
  | "available"
  | "downloading"
  | "verifying"
  | "ready"
  | "installing"
  | "failed";

export type PreparedUpdate = {
  version: string;
  artifact: string;
  sha256: string;
  reused: boolean;
  ready: boolean;
};

type NativeProgress = {
  phase: "downloading" | "verifying" | "ready";
  downloadedBytes: number;
  totalBytes?: number | null;
  percent?: number | null;
};

let manifestCheckPromise: Promise<void> | null = null;
let preparePromise: Promise<void> | null = null;
let updateOperationEpoch = 0;

function updateFailureMessage(cause: unknown, fallback: string): string {
  if (cause instanceof Error && cause.message.trim()) return cause.message.trim();
  if (typeof cause === 'string' && cause.trim()) return cause.trim();
  try {
    const serialized = JSON.stringify(cause);
    if (serialized && serialized !== '{}') return serialized;
  } catch {
    // Keep the stable fallback below.
  }
  return fallback;
}

export function compareAppVersions(left: string, right: string): number {
  const parse = (value: string) => {
    const [core, pre = ""] = value.replace(/^v/, "").split("-", 2);
    return { core: core.split(".").map(Number), pre };
  };
  const a = parse(left),
    b = parse(right);
  for (let index = 0; index < 3; index += 1) {
    const av = a.core[index] || 0,
      bv = b.core[index] || 0;
    if (av !== bv) return av > bv ? 1 : -1;
  }
  if (a.pre === b.pre) return 0;
  if (!a.pre) return 1;
  if (!b.pre) return -1;
  return a.pre.localeCompare(b.pre, undefined, { numeric: true });
}

export function currentReleasePlatform(
  userAgent = navigator.userAgent,
  platform = navigator.platform,
): "windows" | "linux" | "macos" | null {
  const value = `${userAgent} ${platform}`.toLowerCase();
  if (
    value.includes("windows") ||
    value.includes("win32") ||
    value.includes("win64")
  )
    return "windows";
  if (value.includes("linux") || value.includes("x11")) return "linux";
  if (
    value.includes("macintosh") ||
    value.includes("mac os") ||
    value.includes("macintel")
  )
    return "macos";
  return null;
}

export function selectNativeUpdateArtifact(
  manifest: LightBIReleaseManifest,
  platform = currentReleasePlatform(),
): LightBIReleaseArtifact | null {
  if (!platform) return null;
  return (
    manifest.artifacts.find(
      (item) => item.platform === platform && item.architecture === "x86_64",
    ) ??
    manifest.artifacts.find((item) => item.platform === platform) ??
    null
  );
}

type UpdateStore = {
  status: UpdateStatus;
  manifest: LightBIReleaseManifest | null;
  artifact: LightBIReleaseArtifact | null;
  prepared: PreparedUpdate | null;
  progress: number | null;
  error: string;
  checkedAt: number | null;
  dismissedVersion: string | null;
  qaSimulation: boolean;
  check: (force?: boolean) => Promise<void>;
  prepare: () => Promise<void>;
  install: () => Promise<void>;
  dismiss: () => void;
  simulateForQa: () => Promise<void>;
};

const invokeArgs = (
  manifest: LightBIReleaseManifest,
  artifact: LightBIReleaseArtifact,
) => ({
  version: manifest.version,
  platform: artifact.platform,
  architecture: artifact.architecture,
  url: artifact.url,
  sha256: artifact.sha256,
  filename: artifact.filename,
});

export const useUpdateStore = create<UpdateStore>((set, get) => ({
  status: "idle",
  manifest: null,
  artifact: null,
  prepared: null,
  progress: null,
  error: "",
  checkedAt: null,
  dismissedVersion: typeof localStorage !== "undefined" ? localStorage.getItem("lightbi-update-dismissed-version") : null,
  qaSimulation: false,
  check: (force = false) => {
    if (!isNativeLightBI()) return Promise.resolve();
    if (manifestCheckPromise) return manifestCheckPromise;
    if (
      !force &&
      ["checking", "available", "downloading", "verifying", "installing"].includes(get().status)
    )
      return Promise.resolve();
    if (
      !force &&
      get().checkedAt &&
      Date.now() - Number(get().checkedAt) < 6 * 60 * 60 * 1000
    )
      return Promise.resolve();
    const operation = ++updateOperationEpoch;
    manifestCheckPromise = (async () => {
      set({ status: "checking", error: "", progress: null, qaSimulation: false });
      try {
        const response = await externalFetch(
          `${lightBIDistributionEndpoint()}/api/releases/latest`,
          { cache: force ? "no-store" : "default" },
        );
        if (!response.ok)
          throw new Error("Update service is temporarily unavailable.");
        const catalog = (await response.json()) as {
          latest?: LightBIReleaseManifest;
        };
        if (operation !== updateOperationEpoch) return;
        const manifest = catalog.latest;
        if (!manifest || manifest.schema_version !== "lightbi.release.v1")
          throw new Error("Update manifest is invalid.");
        const artifact = selectNativeUpdateArtifact(manifest);
        if (!artifact)
          throw new Error(
            "No compatible update artifact is available for this operating system.",
          );
        const current = import.meta.env.VITE_LIGHTBI_VERSION ?? "0.9.2-beta.7";
        if (compareAppVersions(manifest.version, current) <= 0) {
          set({
            status: "up_to_date",
            manifest,
            artifact: null,
            prepared: null,
            checkedAt: Date.now(),
            error: "",
            progress: null,
          });
          return;
        }
        set({
          status: "available",
          manifest,
          artifact,
          prepared: null,
          checkedAt: Date.now(),
          error: "",
          progress: 0,
          qaSimulation: false,
          dismissedVersion: get().dismissedVersion === manifest.version ? get().dismissedVersion : null,
        });
        trackUpdateEvent("update_available");
        await get().prepare();
      } catch (cause) {
        if (operation !== updateOperationEpoch) return;
        set({
          status: "failed",
          manifest: null,
          artifact: null,
          prepared: null,
          error:
            updateFailureMessage(cause, "Update check failed."),
          checkedAt: Date.now(),
          progress: null,
          qaSimulation: false,
        });
      } finally {
        manifestCheckPromise = null;
      }
    })();
    return manifestCheckPromise;
  },
  prepare: () => {
    if (preparePromise) return preparePromise;
    const { manifest, artifact } = get();
    if (
      !manifest ||
      !artifact ||
      compareAppVersions(
        manifest.version,
        import.meta.env.VITE_LIGHTBI_VERSION ?? "0.9.2-beta.7",
      ) <= 0
    )
      return Promise.resolve();
    const operation = ++updateOperationEpoch;
    preparePromise = (async () => {
      set({ status: "downloading", error: "", progress: 0, qaSimulation: false });
      trackUpdateEvent("update_download_started");
      let unlisten: undefined | (() => void);
      try {
        const [{ invoke }, { listen }] = await Promise.all([
          import("@tauri-apps/api/core"),
          import("@tauri-apps/api/event"),
        ]);
        unlisten = await listen<NativeProgress>(
          "lightbi://update-progress",
          (event) => {
            if (operation !== updateOperationEpoch) return;
            const progress =
              typeof event.payload.percent === "number"
                ? event.payload.percent
                : null;
            set({
              status:
                event.payload.phase === "verifying"
                  ? "verifying"
                  : event.payload.phase === "ready"
                    ? "ready"
                    : "downloading",
              progress,
            });
          },
        );
        const prepared = await invoke<PreparedUpdate>(
          "prepare_verified_update",
          invokeArgs(manifest, artifact),
        );
        if (operation !== updateOperationEpoch) return;
        if (!prepared.ready)
          throw new Error("The update could not be staged safely.");
        set({ status: "ready", prepared, progress: 100, error: "" });
        trackUpdateEvent("update_download_success");
      } catch (cause) {
        if (operation !== updateOperationEpoch) return;
        trackUpdateEvent("update_download_failed");
        set({
          status: "failed",
          prepared: null,
          progress: null,
          error:
            updateFailureMessage(cause, "Update preparation failed."),
        });
      } finally {
        unlisten?.();
        preparePromise = null;
      }
    })();
    return preparePromise;
  },
  install: async () => {
    const { manifest, artifact, prepared, status, qaSimulation } = get();
    if (qaSimulation) return;
    if (status !== "ready" || !manifest || !artifact || !prepared?.ready)
      return;
    const operation = ++updateOperationEpoch;
    set({ status: "installing", error: "" });
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("apply_prepared_update", invokeArgs(manifest, artifact));
      if (operation !== updateOperationEpoch) return;
      trackUpdateEvent("update_install_started");
      if (artifact.kind === "deb") set({ status: "ready" });
    } catch (cause) {
      if (operation !== updateOperationEpoch) return;
      set({
        status: "failed",
        error:
          updateFailureMessage(cause, "Prepared update could not be applied."),
      });
    }
  },
  dismiss: () => {
    const version = get().manifest?.version ?? null;
    if (version && typeof localStorage !== "undefined") localStorage.setItem("lightbi-update-dismissed-version", version);
    set({ dismissedVersion: version });
  },
  simulateForQa: async () => {
    if (buildGenerationManifest().channel !== "internal") return;
    const operation = ++updateOperationEpoch;
    const platform = currentReleasePlatform() ?? "windows";
    const current = import.meta.env.VITE_LIGHTBI_VERSION ?? "0.9.2-beta.7";
    const version = `${current}-qa-update`;
    const artifact: LightBIReleaseArtifact = {
      platform,
      architecture: "x86_64",
      kind: platform === "windows" ? "exe" : platform === "linux" ? "deb" : "dmg",
      filename: platform === "windows" ? "LightBI-QA-Update.exe" : platform === "linux" ? "LightBI-QA-Update.deb" : "LightBI-QA-Update.dmg",
      url: "https://lightbi-next.thaiduy.digital/qa/update-placeholder",
      size: 100,
      sha256: "0".repeat(64),
    };
    const manifest: LightBIReleaseManifest = {
      schema_version: "lightbi.release.v1",
      product: "digital.thaiduy.lightbi",
      version,
      channel: "beta",
      published_at: new Date().toISOString(),
      release_notes: "Internal updater UX simulation",
      artifacts: [artifact],
    };
    if (typeof localStorage !== "undefined") localStorage.removeItem("lightbi-update-dismissed-version");
    set({ status: "available", manifest, artifact, prepared: null, progress: 0, error: "", dismissedVersion: null, qaSimulation: true });
    await new Promise(resolve => setTimeout(resolve, 180));
    if (operation !== updateOperationEpoch) return;
    for (const progress of [4, 12, 24, 39, 55, 71, 86, 96, 100]) {
      if (operation !== updateOperationEpoch) return;
      set({ status: "downloading", progress });
      await new Promise(resolve => setTimeout(resolve, 120));
    }
    if (operation !== updateOperationEpoch) return;
    set({ status: "verifying", progress: 100 });
    await new Promise(resolve => setTimeout(resolve, 420));
    if (operation !== updateOperationEpoch) return;
    set({
      status: "ready",
      progress: 100,
      prepared: { version, artifact: artifact.filename, sha256: artifact.sha256, reused: false, ready: true },
    });
  },
}));
