import type { Editor } from "@milkdown/kit/core";
import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { DecorationSet } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";
import type { ReviewThread } from "../../../src/domain/protocol";
import { findSnippetInText, mapTextRangeToDoc } from "../../../src/domain/commentAnchor";

export type ThreadPlacement =
  | { thread: ReviewThread; kind: "anchored"; from: number; to: number }
  | { thread: ReviewThread; kind: "orphan" };

export function placeThreads(
  doc: Parameters<typeof mapTextRangeToDoc>[0],
  threads: ReviewThread[],
): ThreadPlacement[] {
  const haystack = doc.textBetween(0, doc.content.size, "\n", "");
  const out: ThreadPlacement[] = [];
  for (const thread of threads) {
    if (thread.isResolved) {
      continue;
    }
    const match = findSnippetInText(haystack, thread.snippet);
    if (!match) {
      out.push({ thread, kind: "orphan" });
      continue;
    }
    const range = mapTextRangeToDoc(doc, match.from, match.to);
    if (!range) {
      out.push({ thread, kind: "orphan" });
      continue;
    }
    out.push({ thread, kind: "anchored", from: range.from, to: range.to });
  }
  return out;
}

const key = new PluginKey("slash-md-comments");

export const commentsProse = $prose(() => {
  return new Plugin({
    key,
    state: {
      init: () => DecorationSet.empty,
      apply(tr, set) {
        const meta = tr.getMeta("slash-md-threads");
        if (meta) {
          return meta;
        }
        return set.map(tr.mapping, tr.doc);
      },
    },
    props: {
      decorations(state) {
        return key.getState(state);
      },
    },
  });
});

export function registerComments(editor: Editor): void {
  editor.use(commentsProse);
}
