import * as vscode from "vscode";
import { BarKind } from "./messaging";

export type DraftMeta = {
  savedAt?: string;
  kind?: BarKind;
  label?: string;
  prNumber?: number;
  prUrl?: string;
  reviewBranch?: string;
  remotePath?: string;
  remoteHash?: string;
  remoteOid?: string;
  published?: boolean;
  publishedUrl?: string;
  sourcePath?: string;
  /** When true, Review will `git rm` remotePath instead of writing the file. */
  pendingDelete?: boolean;
};

function key(uri: vscode.Uri): string {
  return `draftMeta:${uri.toString()}`;
}

export function getDraftMeta(context: vscode.ExtensionContext, uri: vscode.Uri): DraftMeta {
  return context.globalState.get<DraftMeta>(key(uri)) ?? {};
}

export async function patchDraftMeta(
  context: vscode.ExtensionContext,
  uri: vscode.Uri,
  patch: DraftMeta,
): Promise<DraftMeta> {
  const next = { ...getDraftMeta(context, uri), ...patch };
  await context.globalState.update(key(uri), next);
  return next;
}
