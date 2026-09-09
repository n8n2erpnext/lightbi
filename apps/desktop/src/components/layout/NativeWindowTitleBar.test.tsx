// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NativeWindowTitleBar } from "./NativeWindowTitleBar";

const minimize = vi.fn();
const toggleMaximize = vi.fn();
const close = vi.fn();

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ minimize, toggleMaximize, close }),
}));

describe("NativeWindowTitleBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
  });
  afterEach(() => {
    delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it("renders the native drag region and the three bounded window controls", () => {
    render(<NativeWindowTitleBar />);
    expect(screen.getByTestId("native-window-titlebar").hasAttribute("data-tauri-drag-region")).toBe(true);
    expect(screen.getByRole("button", { name: "Minimize window" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Maximize or restore window" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Close window" })).toBeTruthy();
  });

  it("keeps browser/live-demo chrome native to the browser", () => {
    delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    const { container } = render(<NativeWindowTitleBar />);
    expect(container.innerHTML).toBe("");
  });
});
