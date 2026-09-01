import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  listen: vi.fn(),
  track: vi.fn(),
  progressHandler: null as
    | null
    | ((event: {
        payload: {
          phase: "downloading" | "verifying" | "ready";
          downloadedBytes: number;
          totalBytes?: number;
          percent?: number;
        };
      }) => void),
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke: mocks.invoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen: mocks.listen }));
vi.mock("../lib/native-runtime", () => ({ isNativeLightBI: () => true }));
vi.mock("../lib/native-capabilities", () => ({ externalFetch: (input: string | URL, init?: RequestInit) => fetch(input, init) }));
vi.mock("../lib/app-usage-telemetry", () => ({
  trackUpdateEvent: mocks.track,
}));
vi.mock("../lib/distribution-pairing", () => ({
  lightBIDistributionEndpoint: () => "https://distribution.test",
}));

import {
  compareAppVersions,
  currentReleasePlatform,
  selectNativeUpdateArtifact,
  useUpdateStore,
} from "./update-store";
import type { LightBIReleaseManifest } from "@lightbi/core-types";

const manifest = (version = "0.9.3-beta.7"): LightBIReleaseManifest => ({
  schema_version: "lightbi.release.v1",
  product: "digital.thaiduy.lightbi",
  version,
  channel: "beta",
  published_at: "2026-08-25T00:00:00Z",
  release_notes: "Update",
  artifacts: [
    {
      platform: "windows",
      architecture: "x86_64",
      kind: "exe",
      filename: "LightBI-setup.exe",
      url: "https://drive.thaiduy.store/release/lightbi/update.exe",
      size: 100,
      sha256: "a".repeat(64),
    },
  ],
});

describe("staged native updater", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      platform: "Win32",
    });
    mocks.invoke.mockReset();
    mocks.listen.mockReset();
    mocks.track.mockReset();
    mocks.progressHandler = null;
    mocks.listen.mockImplementation(
      async (_event: string, handler: typeof mocks.progressHandler) => {
        mocks.progressHandler = handler;
        return () => {};
      },
    );
    useUpdateStore.setState({
      status: "idle",
      manifest: null,
      artifact: null,
      prepared: null,
      progress: null,
      error: "",
      checkedAt: null,
    });
  });

  it("orders beta patch releases and ignores same or older manifests", () => {
    expect(compareAppVersions("0.9.2-beta.7", "0.9.1-beta.7")).toBe(1);
    expect(compareAppVersions("0.9.1-beta.7", "0.9.2-beta.7")).toBe(-1);
    expect(compareAppVersions("0.9.1-beta.7", "0.9.1-beta.7")).toBe(0);
    expect(compareAppVersions("1.0.0", "1.0.0-beta.1")).toBe(1);
  });

  it("selects Windows, Linux and macOS artifacts from one manifest contract", () => {
    expect(currentReleasePlatform("Windows", "Win32")).toBe("windows");
    expect(currentReleasePlatform("X11; Linux", "Linux x86_64")).toBe("linux");
    expect(currentReleasePlatform("Macintosh; Mac OS", "MacIntel")).toBe(
      "macos",
    );
    expect(selectNativeUpdateArtifact(manifest(), "windows")?.kind).toBe("exe");
  });

  it("coalesces duplicate checks and reaches READY only after native staging", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ latest: manifest() }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    mocks.invoke.mockImplementation(async (command: string) => {
      expect(command).toBe("prepare_verified_update");
      mocks.progressHandler?.({
        payload: {
          phase: "downloading",
          downloadedBytes: 50,
          totalBytes: 100,
          percent: 50,
        },
      });
      mocks.progressHandler?.({
        payload: {
          phase: "verifying",
          downloadedBytes: 100,
          totalBytes: 100,
          percent: 100,
        },
      });
      return {
        version: "0.9.3-beta.7",
        artifact: "LightBI-setup.exe",
        sha256: "a".repeat(64),
        reused: false,
        ready: true,
      };
    });
    const states: string[] = [];
    const unsubscribe = useUpdateStore.subscribe((state) =>
      states.push(state.status),
    );
    await Promise.all([
      useUpdateStore.getState().check(true),
      useUpdateStore.getState().check(true),
    ]);
    unsubscribe();
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(states).toEqual(
      expect.arrayContaining([
        "checking",
        "available",
        "downloading",
        "verifying",
        "ready",
      ]),
    );
    expect(useUpdateStore.getState()).toMatchObject({
      status: "ready",
      progress: 100,
      prepared: { ready: true },
    });
  });

  it("keeps the app usable while background preparation is pending", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ latest: manifest() }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    let resolvePrepare: (value: unknown) => void = () => {};
    mocks.invoke.mockReturnValue(
      new Promise((resolve) => {
        resolvePrepare = resolve;
      }),
    );
    const checking = useUpdateStore.getState().check(true);
    await vi.waitFor(() =>
      expect(useUpdateStore.getState().status).toBe("downloading"),
    );
    expect(useUpdateStore.getState().prepared).toBeNull();
    resolvePrepare({
      version: "0.9.3-beta.7",
      artifact: "LightBI-setup.exe",
      sha256: "a".repeat(64),
      reused: false,
      ready: true,
    });
    await checking;
    expect(useUpdateStore.getState().status).toBe("ready");
  });

  it("never exposes READY after staging or verification failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ latest: manifest() }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    mocks.invoke.mockRejectedValue(new Error("Update verification failed."));
    await useUpdateStore.getState().check(true);
    expect(useUpdateStore.getState()).toMatchObject({
      status: "failed",
      prepared: null,
    });
  });

  it("fails closed on network or malformed manifest errors without invoking native update code", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await useUpdateStore.getState().check(true);
    expect(useUpdateStore.getState().status).toBe("failed");
    expect(mocks.invoke).not.toHaveBeenCalled();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ latest: { schema_version: "partial" } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    await useUpdateStore.getState().check(true);
    expect(useUpdateStore.getState().status).toBe("failed");
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("ignores an older manifest without starting a download", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ latest: manifest("0.9.0-beta.1") }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    await useUpdateStore.getState().check(true);
    expect(useUpdateStore.getState().status).toBe("up_to_date");
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("applies only a prepared READY artifact and reports tamper rejection", async () => {
    useUpdateStore.setState({
      status: "ready",
      manifest: manifest(),
      artifact: manifest().artifacts[0],
      prepared: {
        version: "0.9.3-beta.7",
        artifact: "LightBI-setup.exe",
        sha256: "a".repeat(64),
        reused: true,
        ready: true,
      },
    });
    mocks.invoke.mockRejectedValue(
      new Error("The prepared update is modified."),
    );
    await useUpdateStore.getState().install();
    expect(mocks.invoke).toHaveBeenCalledWith(
      "apply_prepared_update",
      expect.objectContaining({
        version: "0.9.3-beta.7",
        filename: "LightBI-setup.exe",
      }),
    );
    expect(useUpdateStore.getState().status).toBe("failed");
  });
});
