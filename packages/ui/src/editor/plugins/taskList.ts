import { $remark } from "@milkdown/kit/utils";
import type { Editor } from "@milkdown/kit/core";

type Md = {
  type: string;
  value?: string;
  checked?: boolean | null;
  children?: Md[];
};

/** GFM requires a space after `]`. Bare `- [ ]` at EOL stays a bullet with literal brackets. */
const LITERAL_TASK_RE = /^\[([ xX])\](?:[ \t]+|(?=$))(.*)$/;

export function promoteLiteralTaskItems(node: Md): void {
  if (node.type === "listItem" && node.checked == null) {
    const paragraph = node.children?.[0];
    const first = paragraph?.type === "paragraph" ? paragraph.children?.[0] : undefined;
    if (first?.type === "text") {
      const match = String(first.value ?? "").match(LITERAL_TASK_RE);
      if (match) {
        node.checked = match[1]!.toLowerCase() === "x";
        const rest = match[2] ?? "";
        if (rest) {
          first.value = rest;
        } else {
          paragraph!.children!.shift();
        }
      }
    }
  }
  for (const child of node.children ?? []) {
    promoteLiteralTaskItems(child);
  }
}

export const remarkEmptyTaskList = $remark("slash-empty-task-list", () => () => (tree: Md) => {
  promoteLiteralTaskItems(tree);
});

export function registerEmptyTaskList(editor: Editor): void {
  editor.use(remarkEmptyTaskList);
}
