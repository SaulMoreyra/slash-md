import type { WebviewToHost } from "@slash-md/core/protocol";

/** Host ↔ editor bus. VS Code = acquireVsCodeApi(); Electron = preload IPC. */
export type HostBridge = {
  postMessage(message: WebviewToHost): void;
  getState?(): unknown;
  setState?(state: unknown): void;
};

/** @deprecated Prefer HostBridge — kept for existing chrome imports. */
export type VsCodeApi = HostBridge;

declare function acquireVsCodeApi(): HostBridge;

export function createVsCodeBridge(): HostBridge {
  return acquireVsCodeApi();
}
