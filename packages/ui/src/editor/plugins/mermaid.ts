import { LanguageDescription, LanguageSupport, StreamLanguage } from "@codemirror/language";
import type { Ctx } from "@milkdown/kit/ctx";
import { commandsCtx, editorViewCtx } from "@milkdown/kit/core";
import { clearTextInCurrentBlockCommand, createCodeBlockCommand } from "@milkdown/kit/preset/commonmark";
import type mermaidApi from "mermaid";

const mermaidStream = StreamLanguage.define({
  name: "mermaid",
  token(stream) {
    stream.skipToEnd();
    return null;
  },
});

/** Shown in the code-block language picker so ```mermaid is a first-class tag. */
export const mermaidLanguage = LanguageDescription.of({
  name: "Mermaid",
  alias: ["mermaid", "mmd"],
  extensions: ["mmd"],
  load: () => Promise.resolve(new LanguageSupport(mermaidStream)),
});

export const DEFAULT_FLOWCHART = `flowchart TD
  A[New page] --> B[Edit]
  B --> C[Review]
  C --> D{Approved?}
  D -->|Yes| E[Publish]
  D -->|No| B`;

export function isMermaidLanguage(language: string): boolean {
  const tag = language.trim().toLowerCase();
  return tag === "mermaid" || tag === "mmd";
}

function isDarkEditor(): boolean {
  return (
    document.body.classList.contains("vscode-dark") || document.body.classList.contains("vscode-high-contrast")
  );
}

async function loadMermaid(): Promise<typeof mermaidApi> {
  const mod = await import("mermaid");
  return mod.default;
}

async function configureMermaid(): Promise<typeof mermaidApi> {
  const mermaid = await loadMermaid();
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: isDarkEditor() ? "dark" : "neutral",
    flowchart: {
      htmlLabels: true,
      curve: "basis",
    },
  });
  return mermaid;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Crepe `renderPreview` hook. Returns `null` for other languages,
 * `undefined` when Mermaid is drawing asynchronously.
 */
export function renderMermaidPreview(
  language: string,
  content: string,
  applyPreview: (value: string | null) => void,
): void | null {
  if (!isMermaidLanguage(language) || !content.trim()) {
    return null;
  }
  void drawMermaid(content)
    .then((svg) => applyPreview(svg))
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      applyPreview(`<pre class="slash-mermaid-error">${escapeHtml(message)}</pre>`);
    });
}

async function drawMermaid(content: string): Promise<string> {
  const mermaid = await configureMermaid();
  const id = `slashMermaid${Date.now().toString(36)}${Math.floor(Math.random() * 1e6)}`;
  const { svg } = await mermaid.render(id, content);
  return svg;
}

export function runInsertDiagram(ctx: Ctx): void {
  const commands = ctx.get(commandsCtx);
  commands.call(clearTextInCurrentBlockCommand.key);
  commands.call(createCodeBlockCommand.key, "mermaid");
  const view = ctx.get(editorViewCtx);
  if (view.state.selection.$from.parent.type.name !== "code_block") {
    return;
  }
  view.dispatch(view.state.tr.insertText(DEFAULT_FLOWCHART));
}
