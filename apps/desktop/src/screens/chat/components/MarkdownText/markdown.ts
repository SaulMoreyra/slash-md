export type MdInline =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "italic"; value: string }
  | { kind: "code"; value: string }
  | { kind: "link"; value: string; href: string };

export type MdBlock =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "code"; lang: string; code: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "hr" };

const INLINE_PATTERN = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*|\[[^\]]+\]\([^)\s]+\))/g;
const HEADING_PATTERN = /^(#{1,6})\s+(.*)$/;
const ORDERED_PATTERN = /^\d+\.\s+(.*)$/;
const UNORDERED_PATTERN = /^[-*+]\s+(.*)$/;
const HR_PATTERN = /^(-{3,}|\*{3,}|_{3,})$/;

export function parseInline(source: string): MdInline[] {
  const nodes: MdInline[] = [];
  let last = 0;
  for (const match of source.matchAll(INLINE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) {
      nodes.push({ kind: "text", value: source.slice(last, index) });
    }
    nodes.push(classifyInline(match[0]));
    last = index + match[0].length;
  }
  if (last < source.length) {
    nodes.push({ kind: "text", value: source.slice(last) });
  }
  return nodes;
}

function classifyInline(token: string): MdInline {
  if (token.startsWith("`")) {
    return { kind: "code", value: token.slice(1, -1) };
  }
  if (token.startsWith("**")) {
    return { kind: "bold", value: token.slice(2, -2) };
  }
  if (token.startsWith("*")) {
    return { kind: "italic", value: token.slice(1, -1) };
  }
  const link = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
  return link
    ? { kind: "link", value: link[1], href: link[2] }
    : { kind: "text", value: token };
}

export function parseMarkdown(source: string): MdBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: MdBlock[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ kind: "paragraph", text: paragraph.join("\n") });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push({ kind: "list", ordered: list.ordered, items: list.items });
      list = null;
    }
  };
  const flushQuote = () => {
    if (quote.length) {
      blocks.push({ kind: "quote", text: quote.join("\n") });
      quote = [];
    }
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.trimStart().startsWith("```")) {
      flushAll();
      const lang = line.trim().slice(3).trim();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trimStart().startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      blocks.push({ kind: "code", lang, code: code.join("\n") });
      continue;
    }

    if (!line.trim()) {
      flushAll();
      continue;
    }

    const heading = line.match(HEADING_PATTERN);
    if (heading) {
      flushAll();
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2].trim() });
      continue;
    }

    if (HR_PATTERN.test(line.trim())) {
      flushAll();
      blocks.push({ kind: "hr" });
      continue;
    }

    const ordered = line.match(ORDERED_PATTERN);
    if (ordered) {
      flushParagraph();
      flushQuote();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(ordered[1]);
      continue;
    }

    const unordered = line.match(UNORDERED_PATTERN);
    if (unordered) {
      flushParagraph();
      flushQuote();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(unordered[1]);
      continue;
    }

    if (line.trimStart().startsWith(">")) {
      flushParagraph();
      flushList();
      quote.push(line.trimStart().slice(1).trimStart());
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line);
  }

  flushAll();
  return blocks;
}
