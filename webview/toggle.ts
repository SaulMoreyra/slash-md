import type { Ctx } from "@milkdown/kit/ctx";
import type { Node as PmNode } from "@milkdown/kit/prose/model";
import type { EditorView, NodeView } from "@milkdown/kit/prose/view";
import { commandsCtx } from "@milkdown/kit/core";
import {
  addBlockTypeCommand,
  clearTextInCurrentBlockCommand,
  wrapInBlockTypeCommand,
} from "@milkdown/kit/preset/commonmark";
import { $nodeSchema, $remark, $view } from "@milkdown/kit/utils";
import type { Editor } from "@milkdown/kit/core";

type Md = {
  type: string;
  value?: string;
  children?: Md[];
  summary?: string;
};

export const remarkToggle = $remark("slash-toggle", () => () => (tree: Md) => {
  transform(tree);
});

export const toggleSchema = $nodeSchema("toggle", () => ({
  content: "block+",
  group: "block",
  defining: true,
  isolating: true,
  attrs: {
    summary: { default: "Detalles", validate: "string" },
  },
  parseDOM: [
    {
      tag: "details.slash-toggle",
      getAttrs: (dom) => {
        if (!(dom instanceof HTMLElement)) {
          return false;
        }
        const summary = dom.querySelector("summary")?.textContent?.trim() || "Detalles";
        return { summary };
      },
    },
  ],
  toDOM: (node) => [
    "details",
    { class: "slash-toggle", open: "true" },
    ["summary", { class: "slash-toggle-summary" }, node.attrs.summary],
    ["div", { class: "slash-toggle-body" }, 0],
  ],
  parseMarkdown: {
    match: ({ type }) => type === "toggle",
    runner: (state, node, type) => {
      state.openNode(type, { summary: String(node.summary ?? "Detalles") }).next(node.children).closeNode();
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === "toggle",
    runner: (state, node) => {
      const summary = escapeHtml(String(node.attrs.summary || "Detalles"));
      state.addNode("html", undefined, `<details>\n<summary>${summary}</summary>\n`);
      state.next(node.content);
      state.addNode("html", undefined, `</details>`);
    },
  },
}));

export const toggleView = $view(toggleSchema.node, (): ((
  node: PmNode,
  view: EditorView,
  getPos: () => number | undefined,
) => NodeView) => {
  return (initial, view, getPos) => {
    const dom = document.createElement("details");
    dom.className = "slash-toggle";
    dom.open = true;
    const summary = document.createElement("summary");
    summary.className = "slash-toggle-summary";
    summary.contentEditable = "true";
    summary.textContent = initial.attrs.summary;
    const body = document.createElement("div");
    body.className = "slash-toggle-body";
    dom.append(summary, body);

    const commit = () => {
      if (!view.editable) {
        return;
      }
      const pos = getPos();
      if (pos == null) {
        return;
      }
      const text = summary.textContent?.trim() || "Detalles";
      if (text === view.state.doc.nodeAt(pos)?.attrs.summary) {
        return;
      }
      view.dispatch(view.state.tr.setNodeAttribute(pos, "summary", text));
    };
    summary.addEventListener("blur", commit);
    summary.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        summary.blur();
      }
    });

    return {
      dom,
      contentDOM: body,
      update: (node) => {
        if (node.type.name !== "toggle") {
          return false;
        }
        if (document.activeElement !== summary) {
          summary.textContent = node.attrs.summary;
        }
        return true;
      },
      ignoreMutation: (mutation) => mutation.target === summary || summary.contains(mutation.target),
        stopEvent: (event) => summary.contains(event.target as globalThis.Node),
      destroy: () => {
        summary.removeEventListener("blur", commit);
      },
    };
  };
});

export function runInsertToggle(ctx: Ctx): void {
  const commands = ctx.get(commandsCtx);
  commands.call(clearTextInCurrentBlockCommand.key);
  const wrapped = commands.call(wrapInBlockTypeCommand.key, {
    nodeType: toggleSchema.type(ctx),
    attrs: { summary: "Detalles" },
  });
  if (!wrapped) {
    commands.call(addBlockTypeCommand.key, {
      nodeType: toggleSchema.type(ctx),
      attrs: { summary: "Detalles" },
    });
  }
}

export function registerToggle(editor: Editor): void {
  editor.use(remarkToggle).use(toggleSchema).use(toggleView);
}

function transform(parent: Md): void {
  if (!parent.children) {
    return;
  }
  const out: Md[] = [];
  for (let i = 0; i < parent.children.length; i += 1) {
    const child = parent.children[i]!;
    if (child.type === "html" && /<details\b/i.test(child.value ?? "")) {
      if (/<\/details>/i.test(child.value ?? "")) {
        out.push(htmlBlockToToggle(child) ?? child);
        continue;
      }
      const collected = [child];
      let j = i + 1;
      let closed = false;
      for (; j < parent.children.length; j += 1) {
        collected.push(parent.children[j]!);
        if (parent.children[j]!.type === "html" && /<\/details>/i.test(parent.children[j]!.value ?? "")) {
          closed = true;
          break;
        }
      }
      if (closed) {
        out.push(nodesToToggle(collected));
        i = j;
        continue;
      }
    }
    out.push(child);
  }
  parent.children = out;
  for (const child of out) {
    transform(child);
  }
}

function htmlBlockToToggle(node: Md): Md | undefined {
  const value = node.value ?? "";
  const match = value.match(/<details\b[^>]*>[\s\S]*<summary\b[^>]*>([\s\S]*?)<\/summary>[\s\S]*<\/details>/i);
  if (!match) {
    return undefined;
  }
  return {
    type: "toggle",
    summary: stripTags(match[1] ?? "").trim() || "Detalles",
    children: [{ type: "paragraph", children: [] }],
  };
}

function nodesToToggle(nodes: Md[]): Md {
  let summary = "Detalles";
  const children: Md[] = [];
  for (const node of nodes) {
    if (node.type === "html") {
      const value = node.value ?? "";
      const match = value.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i);
      if (match) {
        summary = stripTags(match[1] ?? "").trim() || summary;
      }
      continue;
    }
    children.push(node);
  }
  return {
    type: "toggle",
    summary,
    children: children.length > 0 ? children : [{ type: "paragraph", children: [] }],
  };
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, "");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
