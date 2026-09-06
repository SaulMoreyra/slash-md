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
import { remarkGFMPlugin } from "@milkdown/kit/preset/gfm";
import { TextSelection } from "@milkdown/kit/prose/state";
import { replaceAll } from "@milkdown/kit/utils";
import { registerCallout } from "../plugins/callout";
import { registerImageAlt } from "../plugins/imageAlt";
import { registerComments } from "../plugins/commentsPlugin";
import { createSearchHandle, registerSearch, type SearchHandle } from "../plugins/search";
import { codeLanguages, vscodeCmTheme } from "../plugins/languages";
import { mermaidLanguage, renderMermaidPreview } from "../plugins/mermaid";
import { slashConfig } from "../plugins/slash";
import { registerTableColgroup } from "../plugins/tableColgroup";
import { registerEmptyTaskList } from "../plugins/taskList";
import { registerToggle } from "../plugins/toggle";

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
  /** Set to false to make the editor read-only (default true). */
  editable?: boolean;
  /** Called when the in-document search handle is ready. */
  onSearchReady?: (handle: SearchHandle) => void;
}): Promise<CrepeBuilder> {
  const builder = new CrepeBuilder({
    root: opts.root,
    defaultValue: opts.markdown,
  });

  builder
    .addFeature(blockEdit, slashConfig)
    .addFeature(listItem, {
      // Crepe SVGs lose their <svg> wrapper in DOMPurify; draw tasks in CSS instead.
      checkBoxCheckedIcon: "",
      checkBoxUncheckedIcon: "",
    })
    .addFeature(codeMirror, {
      languages: [...codeLanguages, mermaidLanguage],
      theme: vscodeCmTheme,
      renderPreview: renderMermaidPreview,
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

  // remark rellena cada celda de tabla hasta la más ancha de su columna: escribir
  // una palabra re-alinea la tabla entera y ensucia el diff. Formato compacto, que
  // solo depende del contenido de cada celda. Ver docs/plans/13-tablas-markdown-estable.md.
  builder.editor.config((ctx) => {
    ctx.set(remarkGFMPlugin.options.key, { tablePipeAlign: false });
  });

  registerCallout(builder.editor);
  registerToggle(builder.editor);
  registerEmptyTaskList(builder.editor);
  registerTableColgroup(builder.editor);
  registerImageAlt(builder.editor);
  registerSearch(builder.editor);
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

  if (opts.editable === false) {
    builder.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      view.setProps({ editable: () => false });
    });
  }

  opts.onSearchReady?.(createSearchHandle(builder.editor));

  return builder;
}

export function setCrepeMarkdown(builder: CrepeBuilder, markdown: string): void {
  builder.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    const { anchor, head } = view.state.selection;
    replaceAll(markdown)(ctx);
    const doc = view.state.doc;
    const size = doc.content.size;
    const clamp = (pos: number) => Math.max(0, Math.min(pos, size));
    try {
      view.dispatch(view.state.tr.setSelection(TextSelection.create(doc, clamp(anchor), clamp(head))));
    } catch {
      // Document shape changed — keep replaceAll default selection.
    }
  });
}
