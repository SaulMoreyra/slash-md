import { languages as languageCatalog } from "@codemirror/language-data";
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
