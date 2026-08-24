import type { Ctx } from "@milkdown/kit/ctx";
import { editorViewCtx, type Editor } from "@milkdown/kit/core";
import { Decoration, DecorationSet, type EditorView } from "@milkdown/kit/prose/view";
import type { ReviewThread } from "../../../src/domain/protocol";
import { fillAuthorAvatar } from "../../shared/avatar";
import { placeThreads } from "../plugins/commentsPlugin";

const META = "slash-md-threads";

function buildDecorations(
  doc: Parameters<typeof placeThreads>[0],
  threads: ReviewThread[],
  onOpen: (threadId: string) => void,
): { decos: DecorationSet; orphans: ReviewThread[] } {
  const placements = placeThreads(doc, threads);
  const orphans: ReviewThread[] = [];
  const list: ReturnType<typeof Decoration.inline>[] = [];

  for (const p of placements) {
    if (p.kind === "orphan") {
      orphans.push(p.thread);
      continue;
    }
    list.push(
      Decoration.inline(p.from, p.to, {
        class: "slash-thread-hl",
        "data-thread-id": p.thread.id,
      }),
    );
    list.push(
      Decoration.widget(
        p.to,
        () => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "slash-thread-mark";
          btn.title = "Open review thread";
          btn.setAttribute("data-thread-id", p.thread.id);
          btn.setAttribute("aria-label", "Open review thread");
          const count = p.thread.comments.length;
          const first = p.thread.comments[0];
          const av = document.createElement("span");
          av.className = "slash-thread-mark-av";
          fillAuthorAvatar(av, {
            author: first?.author ?? "?",
            avatarUrl: first?.avatarUrl,
            size: 32,
          });
          btn.appendChild(av);
          if (count > 1) {
            const n = document.createElement("span");
            n.className = "slash-thread-mark-n";
            n.textContent = String(count);
            n.setAttribute("aria-hidden", "true");
            btn.appendChild(n);
          }
          btn.addEventListener("mousedown", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            onOpen(p.thread.id);
          });
          return btn;
        },
        { side: 1, key: p.thread.id },
      ),
    );
  }

  return { decos: DecorationSet.create(doc as never, list), orphans };
}

export type CommentsHandle = {
  apply(threads: ReviewThread[]): ReviewThread[];
  destroy(): void;
};

export function mountComments(
  editor: Editor,
  opts: {
    onOpenThread: (thread: ReviewThread) => void;
    onOrphans: (orphans: ReviewThread[]) => void;
  },
): CommentsHandle {
  let latest: ReviewThread[] = [];

  const refresh = (threads: ReviewThread[]): ReviewThread[] => {
    latest = threads;
    let orphans: ReviewThread[] = [];
    editor.action((ctx: Ctx) => {
      const view = ctx.get(editorViewCtx) as EditorView;
      const open = (id: string) => {
        const thread = latest.find((t) => t.id === id);
        if (thread) {
          opts.onOpenThread(thread);
        }
      };
      const built = buildDecorations(view.state.doc, threads, open);
      orphans = built.orphans;
      opts.onOrphans(orphans);
      view.dispatch(view.state.tr.setMeta(META, built.decos));
    });
    return orphans;
  };

  return {
    apply: refresh,
    destroy() {
      latest = [];
      opts.onOrphans([]);
    },
  };
}
