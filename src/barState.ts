import { DraftMeta } from "./draftMeta";
import { markdownHash } from "./hash";
import { BarKind } from "./protocol";
import type { RepoMode } from "./slashmdConfig";

export function draftBarState(
  meta: DraftMeta,
  text: string,
  opts?: { mode?: RepoMode },
): {
  kind: BarKind;
  label: string;
  publishEnabled: boolean;
  prUrl?: string;
} {
  const mode = opts?.mode ?? "workspace";
  if (mode === "personal") {
    return personalBarState(meta, text);
  }
  return workspaceBarState(meta, text);
}

function personalBarState(meta: DraftMeta, text: string): {
  kind: BarKind;
  label: string;
  publishEnabled: boolean;
  prUrl?: string;
} {
  if (meta.pendingDelete) {
    return {
      kind: "ahead",
      label: "delete · Publish to confirm",
      publishEnabled: true,
      prUrl: meta.publishedUrl ?? meta.prUrl,
    };
  }
  if (meta.published) {
    if (meta.remoteHash && markdownHash(text) !== meta.remoteHash) {
      return {
        kind: "ahead",
        label: "ahead of GitHub",
        publishEnabled: true,
        prUrl: meta.publishedUrl ?? meta.prUrl,
      };
    }
    return {
      kind: "published",
      label: meta.label ?? "published",
      publishEnabled: false,
      prUrl: meta.publishedUrl ?? meta.prUrl,
    };
  }
  if (meta.remoteHash && markdownHash(text) !== meta.remoteHash) {
    return {
      kind: "ahead",
      label: "ahead of GitHub",
      publishEnabled: true,
      prUrl: meta.publishedUrl ?? meta.prUrl,
    };
  }
  // New or unsynced draft — Publish writes straight to the default branch.
  return {
    kind: "draft",
    label: "",
    publishEnabled: true,
    prUrl: meta.publishedUrl ?? meta.prUrl,
  };
}

function workspaceBarState(meta: DraftMeta, text: string): {
  kind: BarKind;
  label: string;
  publishEnabled: boolean;
  prUrl?: string;
} {
  if (meta.pendingDelete) {
    if (meta.prNumber) {
      return {
        kind: "in_review",
        label: meta.label ?? `delete · #${meta.prNumber}`,
        publishEnabled: true,
        prUrl: meta.prUrl,
      };
    }
    return { kind: "ahead", label: "delete · Review to confirm", publishEnabled: false };
  }
  if (meta.published) {
    if (meta.remoteHash && markdownHash(text) !== meta.remoteHash) {
      return { kind: "ahead", label: "ahead of GitHub", publishEnabled: false };
    }
    return {
      kind: "published",
      label: meta.label ?? "published",
      publishEnabled: false,
      prUrl: meta.publishedUrl ?? meta.prUrl,
    };
  }
  if (meta.prNumber) {
    return {
      kind: "in_review",
      label: meta.label ?? `in review #${meta.prNumber}`,
      publishEnabled: true,
      prUrl: meta.prUrl,
    };
  }
  if (meta.remoteHash && markdownHash(text) !== meta.remoteHash) {
    return { kind: "ahead", label: "ahead of GitHub", publishEnabled: false };
  }
  return { kind: "draft", label: "", publishEnabled: false };
}
