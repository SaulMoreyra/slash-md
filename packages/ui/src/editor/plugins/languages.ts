import { languages as languageCatalog } from "@codemirror/language-data";
import { HighlightStyle, LanguageDescription, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

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

/**
 * Token colors for fenced code. Uses Slash CSS variables so light and dark
 * follow `body` theme classes. Replaces CodeMirror's default highlight style,
 * which is a light palette and disappears on `--slash-inline-area` in dark mode.
 */
export const slashHighlightStyle = HighlightStyle.define([
  { tag: [tags.variableName, tags.self], color: "var(--slash-syn-variable)" },
  { tag: [tags.propertyName, tags.attributeName], color: "var(--slash-syn-property)" },
  { tag: [tags.typeName, tags.className, tags.namespace, tags.tagName], color: "var(--slash-syn-type)" },
  {
    tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
    color: "var(--slash-syn-function)",
  },
  {
    tag: [tags.operator, tags.punctuation, tags.bracket, tags.paren, tags.brace, tags.squareBracket, tags.separator],
    color: "var(--slash-syn-operator)",
  },
  { tag: [tags.bool, tags.null, tags.atom], color: "var(--slash-syn-constant)" },
  { tag: [tags.number, tags.integer, tags.float], color: "var(--slash-syn-number)" },
  { tag: [tags.string, tags.regexp, tags.character], color: "var(--slash-syn-string)" },
  { tag: [tags.escape, tags.special(tags.string)], color: "var(--slash-syn-keyword)" },
  {
    tag: [
      tags.keyword,
      tags.modifier,
      tags.operatorKeyword,
      tags.controlKeyword,
      tags.definitionKeyword,
      tags.moduleKeyword,
    ],
    color: "var(--slash-syn-keyword)",
  },
  {
    tag: [tags.comment, tags.lineComment, tags.blockComment, tags.docComment],
    color: "var(--slash-syn-comment)",
    fontStyle: "italic",
  },
  { tag: tags.invalid, color: "var(--slash-danger)" },
]);

export const slashSyntaxHighlighting = syntaxHighlighting(slashHighlightStyle);

/** True when `value` can be a CommonMark fence info-string (first word = language). */
export function isFenceToken(value: string): boolean {
  return value.length > 0 && !/[\s`]/.test(value);
}

function slugFenceName(name: string): string {
  const compact = name.toLowerCase().replace(/[^a-z0-9+#._]+/g, "");
  return compact || name.toLowerCase().replace(/\s+/g, "-");
}

/**
 * Markdown fence tag for a CodeMirror language.
 * One token (no spaces) so remark keeps it as `lang`, and Milkdown can look it up.
 */
export function fenceTag(lang: LanguageDescription): string {
  for (const alias of lang.alias) {
    if (isFenceToken(alias)) {
      return alias.toLowerCase();
    }
  }
  for (const ext of lang.extensions) {
    if (isFenceToken(ext) && ext.length >= 2 && !/^\d+$/.test(ext)) {
      return ext.toLowerCase();
    }
  }
  return slugFenceName(lang.name);
}

function withFenceAlias(lang: LanguageDescription): LanguageDescription {
  const tag = fenceTag(lang);
  if (lang.alias.includes(tag)) {
    return lang;
  }
  return LanguageDescription.of({
    name: lang.name,
    alias: [...lang.alias, tag],
    extensions: [...lang.extensions],
    filename: lang.filename,
    load: () => lang.load(),
  });
}

/** Full `@codemirror/language-data` catalog, with extra aliases for spaced names. */
export const codeLanguages: LanguageDescription[] = languageCatalog.map(withFenceAlias);

export function codeFenceTags(): string[] {
  return codeLanguages.map((lang) => fenceTag(lang));
}
