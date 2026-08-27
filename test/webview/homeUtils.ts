import type { HomeTreeNode } from "@slash-md/core/homeTypes";
import {
    collectIndex,
    filterTreeNodes,
    findFile,
    findFolder,
    flattenLibrary,
    expandableFolderPaths,
    parentSection,
  rankLibraryHits,
  revealTrail,
} from "../../packages/ui/src/home/utils/tree";
import { relativeTime, shortDraftPath } from "../../packages/ui/src/home/utils/format";
import type { SuiteCtx } from "../harness";

export function runHomeUtilsSuite(ctx: SuiteCtx): void {
  const { assert } = ctx;

  {
    const roots: HomeTreeNode[] = [
      {
        kind: "folder",
        path: "docs/guides",
        title: "Guides",
        children: [
          { kind: "file", path: "docs/guides/intro.md", title: "Intro" },
          { kind: "file", path: "docs/guides/setup.md", title: "Setup Guide" },
        ],
      },
      { kind: "file", path: "docs/readme.md", title: "Readme" },
    ];

    assert(filterTreeNodes(roots, "").length === 2, "filterTreeNodes empty query keeps roots");
    assert(filterTreeNodes(roots, "setup").length === 1, "filterTreeNodes matches nested file");
    assert(findFile(roots, "docs/guides/intro.md")?.title === "Intro", "findFile finds nested file");
    assert(findFolder(roots, "docs/guides")?.title === "Guides", "findFolder finds folder");
    assert(collectIndex(roots).length === 3, "collectIndex flattens files");
    assert(parentSection("docs/guides/intro.md") === "docs/guides", "parentSection returns folder path");
    assert(parentSection("docs/readme.md") === undefined, "parentSection shallow path is undefined");

    const hits = flattenLibrary(roots);
    assert(hits.some((hit) => hit.kind === "folder" && hit.path === "docs/guides"), "flattenLibrary includes folders");
    assert(hits.find((hit) => hit.path === "docs/guides/intro.md")?.trail === "Guides", "flattenLibrary trail is parent titles");
    assert(
      JSON.stringify(expandableFolderPaths(roots)) === JSON.stringify(["docs/guides"]),
      "expandableFolderPaths keeps folders with children",
    );
    assert(
      JSON.stringify(
        expandableFolderPaths([
          {
            kind: "folder",
            path: "docs",
            title: "docs",
            children: [
              {
                kind: "folder",
                path: "docs/guides",
                title: "guides",
                children: [{ kind: "file", path: "docs/guides/intro.md", title: "Intro" }],
              },
              { kind: "folder", path: "docs/empty", title: "empty", children: [] },
            ],
          },
        ]),
      ) === JSON.stringify(["docs", "docs/guides"]),
      "expandableFolderPaths skips empty folders",
    );
    const ranked = rankLibraryHits(hits, "setup");
    assert(ranked[0]?.title === "Setup Guide", "rankLibraryHits prefers title match");
    assert(rankLibraryHits(hits, "").length === 0, "rankLibraryHits empty query is empty");
    assert(JSON.stringify(revealTrail("docs/wiki/acturo.md", "file")) === JSON.stringify(["docs", "docs/wiki"]), "revealTrail file expands ancestors");
    assert(JSON.stringify(revealTrail("docs/wiki", "folder")) === JSON.stringify(["docs", "docs/wiki"]), "revealTrail folder includes self");
  }

  {
    assert(shortDraftPath("docs/guides/intro.md", "docs") === "guides/intro.md", "shortDraftPath strips contentPath");
    assert(shortDraftPath("other/readme.md", "docs") === "other/readme.md", "shortDraftPath keeps foreign paths");
    assert(relativeTime(new Date(Date.now() - 30_000).toISOString()) === "ahora", "relativeTime recent is ahora");
    assert(relativeTime("not-a-date") === "", "relativeTime invalid iso is empty");
  }
}
