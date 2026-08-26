// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { LightBIReleaseManifest } from "@lightbi/core-types";
import { useUpdateStore } from "../../stores/update-store";
import { UpdateSettingsPanel } from "./UpdateSettingsPanel";

const manifest: LightBIReleaseManifest = {
  schema_version: "lightbi.release.v1",
  product: "digital.thaiduy.lightbi",
  version: "0.9.2-beta.7",
  channel: "beta",
  published_at: "2026-08-25T00:00:00Z",
  release_notes: "Update",
  artifacts: [
    {
      platform: "windows",
      architecture: "x86_64",
      kind: "exe",
      filename: "LightBI.exe",
      url: "https://drive.thaiduy.store/release/lightbi/LightBI.exe",
      size: 1,
      sha256: "a".repeat(64),
    },
  ],
};

describe("UpdateSettingsPanel", () => {
  afterEach(() => cleanup());
  it("does not offer installation while the artifact is still downloading", () => {
    useUpdateStore.setState({
      status: "downloading",
      manifest,
      artifact: manifest.artifacts[0],
      prepared: null,
      progress: 62,
      error: "",
    });
    render(<UpdateSettingsPanel />);
    expect(
      screen.getByText(/Downloading the verified update.*62%/),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Update & Restart" }),
    ).toBeNull();
  });
  it("offers Update & Restart only after native verification and staging", () => {
    useUpdateStore.setState({
      status: "ready",
      manifest,
      artifact: manifest.artifacts[0],
      prepared: {
        version: manifest.version,
        artifact: "LightBI.exe",
        sha256: "a".repeat(64),
        reused: false,
        ready: true,
      },
      progress: 100,
      error: "",
    });
    render(<UpdateSettingsPanel />);
    expect(
      screen.getByRole("button", { name: "Update & Restart" }),
    ).toBeTruthy();
  });
});
