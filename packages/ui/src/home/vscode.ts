import type { HomeFromWebview } from "@slash-md/core/homeProtocol";

/** Host ↔ Home bus. VS Code = acquireVsCodeApi(); Electron = preload IPC. */
export type HomeHostBridge = {
  postMessage(message: HomeFromWebview): void;
};

declare function acquireVsCodeApi(): HomeHostBridge;

export function createVsCodeHomeBridge(): HomeHostBridge {
  return acquireVsCodeApi();
}
