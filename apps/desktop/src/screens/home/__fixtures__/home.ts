import type { ConflictFile, HomeTreePayload, LocalDraft } from "@slash-md/core/homeTypes";

export function mockDraft(overrides: Partial<LocalDraft> = {}): LocalDraft {
  return {
    path: "docs/a.md",
    title: "Alpha",
    badge: "draft",
    ...overrides,
  };
}

export function mockConflictFile(overrides: Partial<ConflictFile> = {}): ConflictFile {
  return {
    path: "docs/a.md",
    title: "Alpha",
    kind: "edit",
    oursMarkdown: "# Ours\n",
    theirsMarkdown: "# Wiki\n",
    ...overrides,
  };
}

export function mockPayload(overrides: Partial<HomeTreePayload> = {}): HomeTreePayload {
  return {
    repo: "acme/docs",
    contentPath: "docs",
    needsAuth: false,
    needsInit: false,
    fromWorkspace: true,
    roots: [],
    drafts: [],
    selected: [],
    inbox: [],
    canPublishBatch: false,
    canSendReview: false,
    ...overrides,
  };
}
