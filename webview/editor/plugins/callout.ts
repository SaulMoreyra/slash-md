import type { Ctx } from "@milkdown/kit/ctx";
import { commandsCtx } from "@milkdown/kit/core";
import {
  addBlockTypeCommand,
  clearTextInCurrentBlockCommand,
  wrapInBlockTypeCommand,
} from "@milkdown/kit/preset/commonmark";
import { $nodeSchema, $remark } from "@milkdown/kit/utils";
import type { Editor } from "@milkdown/kit/core";

export const CALLOUT_KINDS = ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"] as const;
export type CalloutKind = (typeof CALLOUT_KINDS)[number];

const KIND_RE = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*/i;

type Md = {
  type: string;
  value?: string;
  children?: Md[];
  kind?: string;
};

export const remarkCallout = $remark("slash-callout", () => () => (tree: Md) => {
  transform(tree);
});

export const calloutSchema = $nodeSchema("callout", () => ({
  content: "block+",
  group: "block",
  defining: true,
  attrs: {
    kind: { default: "NOTE", validate: "string" },
  },
  parseDOM: [
    {
      tag: "aside.slash-callout",
      getAttrs: (dom) => {
        if (!(dom instanceof HTMLElement)) {
          return false;
        }
        const kind = (dom.dataset.kind ?? "NOTE").toUpperCase();
        return { kind: CALLOUT_KINDS.includes(kind as CalloutKind) ? kind : "NOTE" };
      },
    },
  ],
  toDOM: (node) => [
    "aside",
    {
      class: `slash-callout slash-callout-${String(node.attrs.kind).toLowerCase()}`,
      "data-kind": node.attrs.kind,
    },
    ["div", { class: "slash-callout-label", contenteditable: "false" }, labelFor(node.attrs.kind)],
    ["div", { class: "slash-callout-body" }, 0],
  ],
  parseMarkdown: {
    match: ({ type }) => type === "callout",
    runner: (state, node, type) => {
      const kind = String(node.kind ?? "NOTE").toUpperCase();
      state.openNode(type, { kind }).next(node.children).closeNode();
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === "callout",
    runner: (state, node) => {
      state.openNode("blockquote");
      state.openNode("paragraph");
      state.addNode("html", undefined, `[!${node.attrs.kind}]`);
      state.closeNode();
      state.next(node.content);
      state.closeNode();
    },
  },
}));

export function runInsertCallout(ctx: Ctx, kind: CalloutKind = "NOTE"): void {
  const commands = ctx.get(commandsCtx);
  commands.call(clearTextInCurrentBlockCommand.key);
  const wrapped = commands.call(wrapInBlockTypeCommand.key, {
    nodeType: calloutSchema.type(ctx),
    attrs: { kind },
  });
  if (!wrapped) {
    commands.call(addBlockTypeCommand.key, {
      nodeType: calloutSchema.type(ctx),
      attrs: { kind },
    });
  }
}

export function registerCallout(editor: Editor): void {
  editor.use(remarkCallout).use(calloutSchema);
}

function transform(node: Md): void {
  if (!node.children) {
    return;
  }
  node.children = node.children.map((child) => toCallout(child) ?? child);
  for (const child of node.children) {
    transform(child);
  }
}

function toCallout(node: Md): Md | undefined {
  if (node.type !== "blockquote" || !node.children?.length) {
    return undefined;
  }
  const first = node.children[0];
  if (!first || first.type !== "paragraph") {
    return undefined;
  }
  const consumed = consumeKind(first);
  if (!consumed) {
    return undefined;
  }
  const rest = node.children.slice(1);
  const children = consumed.paragraph ? [consumed.paragraph, ...rest] : rest;
  return {
    type: "callout",
    kind: consumed.kind,
    children: children.length > 0 ? children : [{ type: "paragraph", children: [] }],
  };
}

function consumeKind(paragraph: Md): { kind: string; paragraph: Md | null } | undefined {
  const children = [...(paragraph.children ?? [])];
  while (children[0]?.type === "text" && !String(children[0].value ?? "").trim()) {
    children.shift();
  }
  const first = children[0];
  if (first?.type !== "text") {
    return undefined;
  }
  const value = String(first.value ?? "");
  const match = value.match(KIND_RE);
  if (!match) {
    return undefined;
  }
  const leftover = value.slice(match[0].length);
  if (leftover) {
    children[0] = { ...first, value: leftover };
  } else {
    children.shift();
    if (children[0]?.type === "break" || children[0]?.type === "softbreak") {
      children.shift();
    }
  }
  return {
    kind: match[1]!.toUpperCase(),
    paragraph: children.length > 0 ? { ...paragraph, children } : null,
  };
}

function labelFor(kind: string): string {
  switch (kind) {
    case "TIP":
      return "Tip";
    case "IMPORTANT":
      return "Important";
    case "WARNING":
      return "Warning";
    case "CAUTION":
      return "Caution";
    default:
      return "Note";
  }
}
