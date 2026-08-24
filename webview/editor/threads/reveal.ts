import type { CrepeBuilder } from "@milkdown/crepe/builder";
import { editorViewCtx } from "@milkdown/kit/core";
import { findSnippetInText, mapTextRangeToDoc } from "../../../src/domain/commentAnchor";
import type { EditorContext } from "../context";

export function revealThreadInEditor(ctx: EditorContext, crepe: CrepeBuilder, snippet: string): void {
  if (!snippet.trim()) {
    return;
  }
  try {
    crepe.editor.action((actionCtx) => {
      const view = actionCtx.get(editorViewCtx);
      const doc = view.state.doc;
      const haystack = doc.textBetween(0, doc.content.size, "\n", "");
      const match = findSnippetInText(haystack, snippet);
      if (!match) {
        return;
      }
      const range = mapTextRangeToDoc(doc, match.from, match.to);
      if (!range) {
        return;
      }
      let el: HTMLElement | null = null;
      try {
        const $pos = doc.resolve(range.from);
        const before = $pos.depth > 0 ? $pos.before($pos.depth) : range.from;
        const node = view.nodeDOM(before);
        if (node instanceof HTMLElement) {
          el = node;
        }
      } catch {
        el = null;
      }
      if (!el) {
        const mapped = view.domAtPos(range.from);
        el = mapped.node instanceof HTMLElement ? mapped.node : mapped.node.parentElement;
      }
      if (!el) {
        return;
      }
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      el.classList.add("slash-reveal-hl");
      if (ctx.timers.reveal) {
        clearTimeout(ctx.timers.reveal);
      }
      const marked = el;
      ctx.timers.reveal = setTimeout(() => {
        marked.classList.remove("slash-reveal-hl");
        ctx.timers.reveal = undefined;
      }, 2200);
    });
  } catch {
    // No match or editor not ready — orphans rail handles the rest.
  }
}
