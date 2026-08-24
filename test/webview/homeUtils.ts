import type { HomeTreeNode } from "../../src/home/homeTree";
import {
  collectIndex,
  filterTreeNodes,
  findFile,
  findFolder,
  parentSection,
} from "../../webview/home/utils/tree";
import { relativeTime, shortDraftPath } from "../../webview/home/utils/format";
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
  }

  {
    assert(shortDraftPath("docs/guides/intro.md", "docs") === "guides/intro.md", "shortDraftPath strips contentPath");
    assert(shortDraftPath("other/readme.md", "docs") === "other/readme.md", "shortDraftPath keeps foreign paths");
    assert(relativeTime(new Date(Date.now() - 30_000).toISOString()) === "ahora", "relativeTime recent is ahora");
    assert(relativeTime("not-a-date") === "", "relativeTime invalid iso is empty");
  }
}
