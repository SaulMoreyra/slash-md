import type { Editor } from "@milkdown/kit/core";
import { editorViewCtx } from "@milkdown/kit/core";
import type { Node as ProseNode } from "@milkdown/kit/prose/model";
import { Plugin, PluginKey, TextSelection } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet, type EditorView } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";
import {
  clampActiveIndex,
  emptySearchState,
  findLiteralMatches,
  nextActiveIndex,
  prevActiveIndex,
  toSearchState,
  type SearchState,
  type TextRange,
} from "./searchMatch";

export type { SearchState } from "./searchMatch";

export type SearchHandle = {
  search(query: string): SearchState;
  next(): SearchState;
  prev(): SearchState;
  clear(): void;
  getSelectionText(): string;
  subscribe(listener: (state: SearchState) => void): () => void;
};

type SearchPluginState = {
  query: string;
  matches: TextRange[];
  active: number;
  decos: DecorationSet;
};

type SearchMeta =
  | { type: "set"; query: string }
  | { type: "next" }
  | { type: "prev" }
  | { type: "clear" }
  | { type: "recompute"; keepActive?: boolean };

const META = "slash-md-search";
const key = new PluginKey<SearchPluginState>("slash-md-search");
const viewListeners = new WeakMap<EditorView, Set<(state: SearchState) => void>>();
/** Clearance for the floating find bar inside `#page`. */
const SCROLL_TOP_GUTTER_PX = 56;
const SCROLL_BOTTOM_GUTTER_PX = 24;

function resolvePageScroller(view: EditorView): HTMLElement | null {
  const byId = document.getElementById("page");
  if (byId instanceof HTMLElement && byId.contains(view.dom)) {
    return byId;
  }
  let el: HTMLElement | null = view.dom;
  while (el) {
    const { overflowY } = window.getComputedStyle(el);
    if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

function matchViewportRect(view: EditorView, match: TextRange): DOMRect | null {
  try {
    const start = view.coordsAtPos(match.from, 1);
    const end = view.coordsAtPos(match.to, -1);
    const left = Math.min(start.left, end.left);
    const top = Math.min(start.top, end.top);
    const right = Math.max(start.right, end.right);
    const bottom = Math.max(start.bottom, end.bottom);
    return new DOMRect(left, top, right - left, bottom - top);
  } catch {
    return null;
  }
}

function scrollMatchIntoView(view: EditorView, match: TextRange): void {
  const rect = matchViewportRect(view, match);
  if (!rect) {
    return;
  }

  const scroller = resolvePageScroller(view);
  if (!scroller) {
    view.dom.scrollIntoView({ block: "center", behavior: "smooth" });
    return;
  }

  const scrollerRect = scroller.getBoundingClientRect();
  const topLimit = scrollerRect.top + SCROLL_TOP_GUTTER_PX;
  const bottomLimit = scrollerRect.bottom - SCROLL_BOTTOM_GUTTER_PX;

  if (rect.top < topLimit) {
    scroller.scrollBy({ top: rect.top - topLimit, behavior: "smooth" });
    return;
  }
  if (rect.bottom > bottomLimit) {
    scroller.scrollBy({ top: rect.bottom - bottomLimit, behavior: "smooth" });
  }
}

function emitState(view: EditorView): void {
  const pluginState = key.getState(view.state) ?? emptyPluginState();
  const payload = toSearchState(pluginState.query, pluginState.matches, pluginState.active);
  viewListeners.get(view)?.forEach((listener) => listener(payload));
}

function findMatchesInDoc(doc: ProseNode, query: string): TextRange[] {
  if (!query) {
    return [];
  }
  const out: TextRange[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "code_block") {
      return false;
    }
    if (!node.isText || !node.text) {
      return;
    }
    for (const hit of findLiteralMatches(node.text, query)) {
      out.push({ from: pos + hit.from, to: pos + hit.to });
    }
  });
  return out;
}

function buildDecorations(doc: ProseNode, matches: TextRange[], active: number): DecorationSet {
  if (matches.length === 0) {
    return DecorationSet.empty;
  }
  return DecorationSet.create(
    doc,
    matches.map((m, i) =>
      Decoration.inline(m.from, m.to, {
        class: i === active ? "slash-search-hit slash-search-hit-active" : "slash-search-hit",
      }),
    ),
  );
}

function emptyPluginState(): SearchPluginState {
  return { query: "", matches: [], active: -1, decos: DecorationSet.empty };
}

function pluginStateFrom(
  doc: ProseNode,
  query: string,
  active: number,
): SearchPluginState {
  const matches = findMatchesInDoc(doc, query);
  const clamped = clampActiveIndex(active, matches.length);
  return {
    query,
    matches,
    active: clamped,
    decos: buildDecorations(doc, matches, clamped),
  };
}

function selectActiveMatch(view: EditorView, state: SearchPluginState): void {
  const match = state.matches[state.active];
  if (!match) {
    return;
  }
  const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, match.from, match.to));
  view.dispatch(tr);
  requestAnimationFrame(() => {
    scrollMatchIntoView(view, match);
  });
}

function applySearchMeta(
  doc: ProseNode,
  prev: SearchPluginState,
  meta: SearchMeta,
): SearchPluginState {
  switch (meta.type) {
    case "clear":
      return emptyPluginState();
    case "set":
      return pluginStateFrom(doc, meta.query, meta.query ? 0 : -1);
    case "next":
      return pluginStateFrom(doc, prev.query, nextActiveIndex(prev.active, prev.matches.length));
    case "prev":
      return pluginStateFrom(doc, prev.query, prevActiveIndex(prev.active, prev.matches.length));
    case "recompute":
      return pluginStateFrom(
        doc,
        prev.query,
        meta.keepActive ? prev.active : clampActiveIndex(prev.active, findMatchesInDoc(doc, prev.query).length),
      );
  }
}

export const searchProse = $prose(() => {
  return new Plugin<SearchPluginState>({
    key,
    state: {
      init: () => emptyPluginState(),
      apply(tr, prev) {
        const meta = tr.getMeta(META) as SearchMeta | undefined;
        if (meta) {
          return applySearchMeta(tr.doc, prev, meta);
        }
        if (!prev.query || !tr.docChanged) {
          return prev;
        }
        return applySearchMeta(tr.doc, prev, { type: "recompute", keepActive: true });
      },
    },
    props: {
      decorations(state) {
        return key.getState(state)?.decos ?? DecorationSet.empty;
      },
    },
    view(_view: EditorView) {
      return {
        update(updatedView, prevState) {
          if (updatedView.state.doc === prevState.doc) {
            return;
          }
          const pluginState = key.getState(updatedView.state);
          if (!pluginState?.query) {
            return;
          }
          emitState(updatedView);
        },
      };
    },
  });
});

export function registerSearch(editor: Editor): void {
  editor.use(searchProse);
}

export function createSearchHandle(editor: Editor): SearchHandle {
  const listeners = new Set<(state: SearchState) => void>();

  function readState(view: EditorView): SearchPluginState {
    return key.getState(view.state) ?? emptyPluginState();
  }

  function notify(view: EditorView): void {
    emitState(view);
  }

  function dispatch(view: EditorView, meta: SearchMeta, focusMatch = false): SearchState {
    const tr = view.state.tr.setMeta(META, meta);
    view.dispatch(tr);
    const next = readState(view);
    if (focusMatch && next.matches.length > 0 && next.active >= 0) {
      selectActiveMatch(view, next);
    }
    notify(view);
    return toSearchState(next.query, next.matches, next.active);
  }

  function withView(run: (view: EditorView) => SearchState): SearchState {
    let result = emptySearchState;
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      result = run(view);
    });
    return result;
  }

  editor.action((ctx) => {
    viewListeners.set(ctx.get(editorViewCtx), listeners);
  });

  return {
    search(query: string) {
      return withView((view) => dispatch(view, { type: "set", query }, true));
    },
    next() {
      return withView((view) => dispatch(view, { type: "next" }, true));
    },
    prev() {
      return withView((view) => dispatch(view, { type: "prev" }, true));
    },
    clear() {
      withView((view) => {
        dispatch(view, { type: "clear" });
        return emptySearchState;
      });
    },
    getSelectionText() {
      let text = "";
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const { from, to, empty } = view.state.selection;
        if (!empty && from !== to) {
          text = view.state.doc.textBetween(from, to, "\n").trim();
        }
      });
      return text;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
