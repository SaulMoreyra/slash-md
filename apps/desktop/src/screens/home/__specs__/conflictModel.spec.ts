import { describe, it, expect } from "vitest";
import {
  classifyUnmerged,
  isConflictPublishError,
  parseLsFilesUnmerged,
  stripConflictMarkers,
  wikiSyncStatusFromPull,
} from "@slash-md/core/conflictModel";

describe("conflictModel", () => {
  it("parses unmerged ls-files rows", () => {
    const parsed = parseLsFilesUnmerged(
      "100644 abc 1\tdocs/a.md\n100644 def 2\tdocs/a.md\n100644 ghi 3\tdocs/a.md\n",
    );
    expect(parsed).toEqual([{ path: "docs/a.md", stages: [1, 2, 3] }]);
  });

  it("classifies delete vs edit vs binary", () => {
    expect(classifyUnmerged([1, 2], "docs/a.md")).toBe("deleted_on_wiki");
    expect(classifyUnmerged([1, 3], "docs/a.md")).toBe("deleted_on_publication");
    expect(classifyUnmerged([1, 2, 3], "docs/pic.png")).toBe("binary");
    expect(classifyUnmerged([1, 2, 3], "docs/a.md")).toBe("edit");
  });

  it("maps GitHub pull state to wiki sync status", () => {
    expect(wikiSyncStatusFromPull({ mergeable: false, mergeable_state: "dirty" })).toBe("conflicting");
    expect(wikiSyncStatusFromPull({ mergeable: true, mergeable_state: "behind" })).toBe("behind");
    expect(wikiSyncStatusFromPull({ mergeable: true, mergeable_state: "clean" })).toBe("idle");
  });

  it("detects conflict publish errors", () => {
    expect(isConflictPublishError("conflict")).toBe(true);
    expect(isConflictPublishError("needs approval · conflict")).toBe(true);
    expect(isConflictPublishError("needs approval")).toBe(false);
    expect(isConflictPublishError("Error invoking remote method 'publishBatch': Error: conflict")).toBe(true);
  });

  it("keeps the publication side of conflict markers", () => {
    const raw = "keep\n<<<<<<< HEAD\nours\n=======\nwikipedia\n>>>>>>> wiki\nend\n";
    expect(stripConflictMarkers(raw)).toBe("keep\nours\nend\n");
  });
});
