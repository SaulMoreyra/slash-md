import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { LanguageDescription } from "@codemirror/language";
import { EditorView } from "@codemirror/view";

/** CodeMirror theme bound to Slash Notion tokens (follows body light/dark). */
export const vscodeCmTheme = EditorView.theme({
  "&": {
    color: "var(--slash-text)",
    backgroundColor: "var(--slash-inline-area)",
    borderRadius: "var(--slash-radius)",
  },
  ".cm-content": {
    caretColor: "var(--slash-caret)",
    fontFamily: "var(--slash-font-code)",
    fontSize: "13px",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--slash-caret)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "var(--slash-selected)",
  },
  ".cm-activeLine": {
    backgroundColor: "var(--slash-hover)",
  },
  ".cm-gutters": {
    backgroundColor: "var(--slash-inline-area)",
    color: "var(--slash-muted)",
    border: "none",
    borderRadius: "var(--slash-radius) 0 0 var(--slash-radius)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--slash-hover)",
  },
});

export const codeLanguages: LanguageDescription[] = [
  LanguageDescription.of({
    name: "JavaScript",
    alias: ["js", "javascript", "cjs", "mjs"],
    extensions: ["js", "mjs", "cjs"],
    load: () => Promise.resolve(javascript()),
  }),
  LanguageDescription.of({
    name: "TypeScript",
    alias: ["ts", "typescript"],
    extensions: ["ts", "mts", "cts"],
    load: () => Promise.resolve(javascript({ typescript: true })),
  }),
  LanguageDescription.of({
    name: "JSON",
    alias: ["json"],
    extensions: ["json"],
    load: () => Promise.resolve(json()),
  }),
  LanguageDescription.of({
    name: "Markdown",
    alias: ["md", "markdown"],
    extensions: ["md", "markdown"],
    load: () => Promise.resolve(markdown()),
  }),
  LanguageDescription.of({
    name: "Python",
    alias: ["py", "python"],
    extensions: ["py"],
    load: () => Promise.resolve(python()),
  }),
  LanguageDescription.of({
    name: "CSS",
    alias: ["css"],
    extensions: ["css"],
    load: () => Promise.resolve(css()),
  }),
];
