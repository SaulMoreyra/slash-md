import { editorViewCtx } from "@milkdown/kit/core";
import { findSnippetInText, normalizeSnippet } from "@slash-md/core/commentAnchor";
import type { ReviewThread } from "@slash-md/core/protocol";
import { placeThreads } from "../packages/ui/src/editor/plugins/commentsPlugin";
import { createSlashCrepe } from "../packages/ui/src/editor/core/crepe";
import { normalizeMarkdown } from "@slash-md/core/markdown";

function fakeThread(partial: Partial<ReviewThread> & { id: string; snippet: string }): ReviewThread {
  return {
    id: partial.id,
    isResolved: partial.isResolved ?? false,
    path: partial.path ?? "docs/a.md",
    line: partial.line ?? 1,
    startLine: partial.startLine ?? 1,
    diffSide: "RIGHT",
    snippet: partial.snippet,
    url: "https://github.com/example",
    comments: [
      {
        id: "c1",
        databaseId: 1,
        body: "Looks good?",
        author: "dev",
        avatarUrl: null,
        url: "https://github.com/example",
        createdAt: "2026-01-01",
      },
    ],
  };
}

/** Assert helpers shared with roundtrip runner. */
export async function runCommentFixtures(
  assert: (ok: boolean, message: string) => void,
): Promise<void> {
  assert(normalizeSnippet("  a  \n  b ") === "a\nb", "normalizeSnippet trims lines");

  const hay = "# Title\n\nHello world paragraph.\n\nMore text.";
  const hit = findSnippetInText(hay, "Hello world paragraph.");
  assert(Boolean(hit && hit.score === 1), "exact snippet match");
  assert(Boolean(hit && hay.slice(hit.from, hit.to) === "Hello world paragraph."), "exact snippet slice");
  assert(findSnippetInText(hay, "zzz-not-present") === undefined, "missing snippet is undefined");

  const root = document.createElement("div");
  document.body.appendChild(root);
  const markdown = "# Title\n\nHello world paragraph.\n\nMore text.\n";
  const crepe = await createSlashCrepe({ root, markdown, comments: true });
  const before = normalizeMarkdown(crepe.getMarkdown());

  const threads = [
    fakeThread({ id: "anchored", snippet: "Hello world paragraph." }),
    fakeThread({ id: "orphan", snippet: "zzz-not-in-doc-zzz" }),
  ];

  await new Promise<void>((resolve, reject) => {
    crepe.editor.action((ctx) => {
      try {
        const doc = ctx.get(editorViewCtx).state.doc;
        const placed = placeThreads(doc, threads);
        assert(
          placed.some((p) => p.kind === "anchored" && p.thread.id === "anchored"),
          "matching snippet anchors",
        );
        assert(
          placed.some((p) => p.kind === "orphan" && p.thread.id === "orphan"),
          "unmatched snippet is orphan",
        );
        const withResolved = placeThreads(doc, [
          ...threads,
          fakeThread({ id: "resolved", snippet: "Hello world paragraph.", isResolved: true }),
        ]);
        assert(
          !withResolved.some((p) => p.thread.isResolved && p.kind === "anchored"),
          "resolved threads are not placed as anchored decorations",
        );
        assert(
          !withResolved.some((p) => p.thread.id === "resolved"),
          "resolved threads are hidden from the margin",
        );
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });

  const after = normalizeMarkdown(crepe.getMarkdown());
  assert(before === after, "comment placement does not change getMarkdown()");

  await crepe.destroy();
  root.remove();
}
