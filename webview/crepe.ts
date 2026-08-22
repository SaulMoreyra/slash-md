import { CrepeBuilder } from "@milkdown/crepe/builder";
import { blockEdit } from "@milkdown/crepe/feature/block-edit";
import { codeMirror } from "@milkdown/crepe/feature/code-mirror";
import { imageBlock } from "@milkdown/crepe/feature/image-block";
import { linkTooltip } from "@milkdown/crepe/feature/link-tooltip";
import { listItem } from "@milkdown/crepe/feature/list-item";
import { placeholder } from "@milkdown/crepe/feature/placeholder";
import { table } from "@milkdown/crepe/feature/table";
import { toolbar } from "@milkdown/crepe/feature/toolbar";
import { editorViewCtx } from "@milkdown/kit/core";
import { replaceAll } from "@milkdown/kit/utils";
import { registerCallout } from "./callout";
import { registerComments } from "./comments";
import { codeLanguages, vscodeCmTheme } from "./languages";
import { slashConfig } from "./slash";
import { registerToggle } from "./toggle";

const commentIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;

export async function createSlashCrepe(opts: {
  root: HTMLElement;
  markdown: string;
  onMarkdown?: (markdown: string, prev: string) => void;
  onUpload?: (file: File) => Promise<string>;
  proxyDomURL?: (url: string) => Promise<string> | string;
  /** Enable PR review-thread decorations (Workspace + open PR). */
  comments?: boolean;
  /** Called from the selection toolbar Comment action. */
  onCommentSelection?: (selectedText: string) => void;
}): Promise<CrepeBuilder> {
  const builder = new CrepeBuilder({
    root: opts.root,
    defaultValue: opts.markdown,
  });

  builder
    .addFeature(blockEdit, slashConfig)
    .addFeature(listItem)
    .addFeature(codeMirror, {
      languages: codeLanguages,
      theme: vscodeCmTheme,
    })
    .addFeature(table)
    .addFeature(imageBlock, {
      onUpload: opts.onUpload ?? (async (file) => `images/${file.name}`),
      proxyDomURL: opts.proxyDomURL,
    })
    .addFeature(toolbar, {
      buildToolbar: (groupBuilder) => {
        if (!opts.comments || !opts.onCommentSelection) {
          return;
        }
        groupBuilder.addGroup("review", "Review").addItem("comment", {
          icon: commentIcon,
          label: "Comment",
          active: () => false,
          onRun: (ctx) => {
            const view = ctx.get(editorViewCtx);
            const { from, to, empty } = view.state.selection;
            if (empty || from === to) {
              return;
            }
            const text = view.state.doc.textBetween(from, to, "\n").trim();
            if (!text) {
              return;
            }
            opts.onCommentSelection?.(text);
          },
        });
      },
    })
    .addFeature(linkTooltip)
    .addFeature(placeholder, {
      text: "Type / to insert a block",
      mode: "block",
    });

  registerCallout(builder.editor);
  registerToggle(builder.editor);
  if (opts.comments) {
    registerComments(builder.editor);
  }

  if (opts.onMarkdown) {
    builder.on((listener) => {
      listener.markdownUpdated((_ctx, markdown, prev) => {
        opts.onMarkdown?.(markdown, prev);
      });
    });
  }

  await builder.create();
  return builder;
}

export function setCrepeMarkdown(builder: CrepeBuilder, markdown: string): void {
  builder.editor.action(replaceAll(markdown));
}
