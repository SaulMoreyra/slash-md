import { describe, it, expect } from "vitest";
import { libraryHitsFromIndex } from "../utils";

describe("libraryHitsFromIndex", () => {
  it("returns a hit per page, with the folder trail above it", () => {
    const hits = libraryHitsFromIndex(
      [{ path: "docs/producto/nota.md", title: "Nota" }],
      "docs",
    );
    expect(hits).toEqual([
      { kind: "folder", path: "docs/producto", title: "producto", trail: "" },
      { kind: "file", path: "docs/producto/nota.md", title: "Nota", trail: "producto" },
    ]);
  });

  it("nests trails for deeper pages", () => {
    const hits = libraryHitsFromIndex(
      [{ path: "docs/a/b/c.md", title: "C" }],
      "docs",
    );
    expect(hits.map((hit) => [hit.kind, hit.path, hit.trail])).toEqual([
      ["folder", "docs/a", ""],
      ["folder", "docs/a/b", "a"],
      ["file", "docs/a/b/c.md", "a / b"],
    ]);
  });

  it("emits each folder once across many pages", () => {
    const hits = libraryHitsFromIndex(
      [
        { path: "docs/team/one.md", title: "One" },
        { path: "docs/team/two.md", title: "Two" },
      ],
      "docs",
    );
    expect(hits.filter((hit) => hit.kind === "folder")).toHaveLength(1);
    expect(hits.filter((hit) => hit.kind === "file")).toHaveLength(2);
  });

  it("treats a page at the content root as having no trail", () => {
    const hits = libraryHitsFromIndex([{ path: "docs/index.md", title: "Index" }], "docs");
    expect(hits).toEqual([
      { kind: "file", path: "docs/index.md", title: "Index", trail: "" },
    ]);
  });

  it("handles a repo-root content path", () => {
    const hits = libraryHitsFromIndex([{ path: "guides/setup.md", title: "Setup" }], ".");
    expect(hits).toEqual([
      { kind: "folder", path: "guides", title: "guides", trail: "" },
      { kind: "file", path: "guides/setup.md", title: "Setup", trail: "guides" },
    ]);
  });

  it("drops entries outside the content path", () => {
    const hits = libraryHitsFromIndex([{ path: "elsewhere/nope.md", title: "Nope" }], "docs");
    expect(hits).toEqual([]);
  });
});
