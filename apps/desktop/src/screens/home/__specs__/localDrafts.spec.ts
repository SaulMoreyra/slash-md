import { describe, it, expect } from "vitest";
import {
  discardLocalChangeAction,
  draftBadge,
  hasGitChanges,
  isLocalDraft,
} from "@slash-md/core/localDrafts";

const clean = { untracked: false, dirty: false };
const dirty = { untracked: false, dirty: true };
const untracked = { untracked: true, dirty: true };
const deleted = { untracked: false, dirty: false, deleted: true };

describe("isLocalDraft", () => {
  it("ignores committed pages whose YAML still says draft", () => {
    expect(isLocalDraft("draft", clean)).toBe(false);
  });

  it("lists a draft only when git sees it as new or modified", () => {
    expect(isLocalDraft("draft", dirty)).toBe(true);
    expect(isLocalDraft("draft", untracked)).toBe(true);
  });

  it("lists modified pages without a draft status", () => {
    expect(isLocalDraft("", dirty)).toBe(true);
    expect(isLocalDraft("in_review", dirty)).toBe(true);
  });

  it("does not list published pages even if dirty", () => {
    expect(isLocalDraft("published", dirty)).toBe(false);
  });

  it("lists deleted tracked pages", () => {
    expect(isLocalDraft("", deleted)).toBe(true);
  });
});

describe("hasGitChanges", () => {
  it("is false for a clean or missing path", () => {
    expect(hasGitChanges(clean)).toBe(false);
    expect(hasGitChanges(undefined)).toBe(false);
  });

  it("is true for deleted paths", () => {
    expect(hasGitChanges(deleted)).toBe(true);
  });
});

describe("draftBadge", () => {
  it("keeps a D badge for dirty drafts", () => {
    expect(draftBadge("draft", dirty)).toBe("draft");
  });

  it("uses M for modified pages that are not drafts", () => {
    expect(draftBadge("", dirty)).toBe("modificado");
    expect(draftBadge("in_review", dirty)).toBe("modificado");
  });

  it("uses eliminado for deleted paths", () => {
    expect(draftBadge("", deleted)).toBe("eliminado");
  });
});

describe("discardLocalChangeAction", () => {
  it("does not delete a committed draft with a clean working tree", () => {
    expect(discardLocalChangeAction(clean)).toBe("none");
    expect(discardLocalChangeAction(undefined)).toBe("none");
  });

  it("deletes untracked files and restores dirty tracked ones", () => {
    expect(discardLocalChangeAction(untracked)).toBe("delete");
    expect(discardLocalChangeAction(dirty)).toBe("restore");
  });

  it("restores deleted tracked files", () => {
    expect(discardLocalChangeAction(deleted)).toBe("restore");
  });
});
