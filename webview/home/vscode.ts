import type { HomeFromWebview } from "../../src/domain/homeProtocol";

declare function acquireVsCodeApi(): {
  postMessage(message: HomeFromWebview): void;
};

export const vscode = acquireVsCodeApi();
