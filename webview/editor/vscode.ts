import type { WebviewToHost } from "../../src/domain/protocol";

export type VsCodeApi = {
  postMessage(message: WebviewToHost): void;
  getState(): unknown;
  setState(state: unknown): void;
};

declare function acquireVsCodeApi(): VsCodeApi;

export const vscode = acquireVsCodeApi();
