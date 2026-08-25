import { setFrontmatterField } from "@slash-md/core/frontmatter";
import { monthlyReviewBranch, parseReviewerLogins } from "../../apps/vscode/src/github/reviewBatch";
import {
  loteMarkdownPaths,
  resolvePublishPr,
  stampPublishedLocal,
} from "@slash-md/github/batchPublishModel";
import { collectMergeBlockers } from "../../apps/vscode/src/github/publish";
import { reviewThreadTarget } from "@slash-md/core/threadGate";
import {
  flattenInboxItems,
  isInboxMarkdownPath,
  keepInboxPull,
  snippetFromLines,
  trimExcerpt,
} from "@slash-md/github/inboxModel";
import type { SuiteCtx } from "../harness";

export function runGithubSuite(ctx: SuiteCtx): void {
  const { assert } = ctx;

  assert(parseReviewerLogins("@alice, bob @carol").join(",") === "alice,bob,carol", "reviewer logins parse");
  assert(parseReviewerLogins("").length === 0, "empty reviewers parse to none");
  const frozen = new Date(2026, 7, 22);
  assert(monthlyReviewBranch(frozen) === "review/docs-2026-08", "monthly review branch uses local date");

  {
    const src = "---\ntitle: Uno\nstatus: draft\nupdated: 2026-08-21\n---\n\n# Uno\n";
    const withPr = setFrontmatterField(src, "pr", "42");
    const reviewing = setFrontmatterField(withPr, "status", "in_review");
    const published = stampPublishedLocal(reviewing);
    assert(published.includes("status: published"), "lote stamp writes published");
    assert(!/^pr:/m.test(published), "lote stamp drops pr");
    assert(!/^reviewBranch:/m.test(published), "lote stamp drops reviewBranch");
    assert(
      reviewThreadTarget({ markdown: published, fileRemotePath: "docs/foo.md" }) === undefined,
      "published lote stamp stops threads",
    );
    assert(resolvePublishPr({ selectedWithPr: [12, 12], scannedPrs: [9] }).kind === "one", "selection prefers one PR");
    assert((resolvePublishPr({ selectedWithPr: [12, 12], scannedPrs: [9] }) as { pr: number }).pr === 12, "selection PR wins");
    assert(resolvePublishPr({ selectedWithPr: [3, 8], scannedPrs: [3] }).kind === "many", "mixed selection PRs need a pick");
    assert(resolvePublishPr({ selectedWithPr: [], scannedPrs: [4] }).kind === "one", "scan uses shared in_review PR");
    assert(resolvePublishPr({ selectedWithPr: [], scannedPrs: [4, 5] }).kind === "many", "scan with many PRs needs a pick");
    assert(resolvePublishPr({ selectedWithPr: [], scannedPrs: [] }).kind === "none", "no PR to publish");
    assert(
      loteMarkdownPaths("docs", ["docs/a.md"], ["docs/b.md", "README.md", "docs/c.slash.md"]).join(",") ===
        "docs/a.md,docs/b.md",
      "lote keeps contentPath markdown only",
    );
    const pull = {
      number: 1,
      html_url: "",
      title: "",
      state: "open" as const,
      merged_at: null,
      mergeable: true,
      mergeable_state: "clean",
      head: { sha: "abc", ref: "review/docs-2026-08" },
      user: { login: "author" },
    };
    assert(
      collectMergeBlockers(pull, [{ state: "COMMENTED", user: { login: "rev" } }]).includes("needs approval"),
      "no approval blocks merge",
    );
    assert(
      collectMergeBlockers(
        { ...pull, mergeable: false, mergeable_state: "dirty" },
        [{ state: "APPROVED", user: { login: "rev" } }],
      ).includes("conflict"),
      "conflict blocks merge",
    );
    assert(
      collectMergeBlockers({ ...pull, mergeable_state: "blocked" }, [{ state: "APPROVED", user: { login: "rev" } }]).includes(
        "checks failing",
      ),
      "blocked after approval is checks failing",
    );
    assert(
      collectMergeBlockers(pull, [{ state: "APPROVED", user: { login: "rev" } }], {
        combinedState: "failure",
      }).includes("checks failing"),
      "failed combined status blocks merge",
    );
  }

  {
    assert(isInboxMarkdownPath("docs/prd/a.md", "docs"), "inbox path under contentPath");
    assert(!isInboxMarkdownPath("docs/prd/a.slash.md", "docs"), "inbox skips .slash.md");
    assert(!isInboxMarkdownPath("README.md", "docs"), "inbox skips files outside contentPath");
    assert(!isInboxMarkdownPath("other/docs/a.md", "docs"), "inbox does not match other repos paths");
    assert(trimExcerpt("hello world") === "hello world", "excerpt keeps short body");
    assert(trimExcerpt("x".repeat(200)).length <= 140, "excerpt trims to ~140");
    assert(keepInboxPull({ author: "me", viewer: "me", hasUnresolved: false }), "keep own PR without threads");
    assert(keepInboxPull({ author: "other", viewer: "me", hasUnresolved: true }), "keep other PR with unresolved");
    assert(!keepInboxPull({ author: "other", viewer: "me", hasUnresolved: false }), "drop other PR with no threads");
    const hay = "one\ntwo\nthree\n";
    assert(snippetFromLines(hay, 2, 3) === "two\nthree", "snippet reads workspace lines");
    const items = flattenInboxItems({
      viewer: "me",
      contentPath: "docs",
      pulls: [
        {
          number: 4,
          url: "https://example.com/4",
          author: "me",
          threads: [
            {
              id: "T1",
              isResolved: false,
              path: "docs/note.md",
              line: 3,
              startLine: 3,
              diffSide: "RIGHT",
              body: "Please cite this.",
              author: "rev",
              createdAt: "2026-08-22T12:00:00Z",
            },
            {
              id: "T2",
              isResolved: false,
              path: "docs/note.md",
              line: 1,
              startLine: 1,
              diffSide: "LEFT",
              body: "old side",
              author: "rev",
              createdAt: "2026-08-22T11:00:00Z",
            },
            {
              id: "T3",
              isResolved: true,
              path: "docs/note.md",
              line: 4,
              startLine: 4,
              diffSide: "RIGHT",
              body: "done",
              author: "rev",
              createdAt: "2026-08-22T10:00:00Z",
            },
            {
              id: "T4",
              isResolved: false,
              path: "src/app.ts",
              line: 1,
              startLine: 1,
              diffSide: "RIGHT",
              body: "not docs",
              author: "rev",
              createdAt: "2026-08-22T09:00:00Z",
            },
          ],
        },
      ],
    });
    assert(items.length === 1 && items[0]?.threadId === "T1", "inbox flattens unresolved RIGHT .md only");
    assert(items[0]?.excerpt === "Please cite this.", "inbox excerpt is first comment");
  }
}
