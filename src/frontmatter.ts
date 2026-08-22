export const FRONTMATTER_KEYS = ["title", "owner", "status", "updated", "cover", "coverPosition"] as const;
export type FrontmatterKey = (typeof FRONTMATTER_KEYS)[number];

export type FrontmatterFields = Record<FrontmatterKey, string>;

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/** Keys that should be removed from YAML when set to empty. */
const DROP_WHEN_EMPTY = new Set<FrontmatterKey>(["cover", "coverPosition"]);

export function emptyFrontmatter(): FrontmatterFields {
  return { title: "", owner: "", status: "", updated: "", cover: "", coverPosition: "" };
}

export function splitFrontmatter(markdown: string): {
  fields: FrontmatterFields;
  raw: string;
  body: string;
} {
  const match = markdown.match(FENCE);
  if (!match) {
    return { fields: emptyFrontmatter(), raw: "", body: markdown };
  }
  const inner = match[1] ?? "";
  return {
    fields: parseFields(inner),
    raw: match[0].endsWith("\n") ? match[0] : `${match[0]}\n`,
    body: markdown.slice(match[0].length),
  };
}

export function joinFrontmatter(raw: string, body: string): string {
  if (!raw) {
    return body;
  }
  const fence = raw.endsWith("\n") ? raw : `${raw}\n`;
  return `${fence}${body}`;
}

export function setFrontmatterField(markdown: string, key: FrontmatterKey, value: string): string {
  const { raw, body } = splitFrontmatter(markdown);
  if (!raw) {
    if (!value && DROP_WHEN_EMPTY.has(key)) {
      return markdown;
    }
    const inner = `${key}: ${formatYamlValue(value)}`;
    const prefix = body.startsWith("\n") ? `---\n${inner}\n---\n` : `---\n${inner}\n---\n\n`;
    return `${prefix}${body.replace(/^\n/, "")}`;
  }
  const inner = raw.replace(/^---\r?\n/, "").replace(/\r?\n---(?:\r?\n)?$/, "");
  let lines = inner.split("\n");
  const idx = lines.findIndex((line) => fieldLine(line, key));

  if (!value && DROP_WHEN_EMPTY.has(key)) {
    if (idx >= 0) {
      lines = lines.filter((_, i) => i !== idx);
    }
    if (lines.length === 0 || (lines.length === 1 && lines[0] === "")) {
      return body;
    }
    return `---\n${lines.join("\n")}\n---\n${body}`;
  }

  const nextLine = `${key}: ${formatYamlValue(value)}`;
  if (idx >= 0) {
    lines[idx] = nextLine;
  } else {
    lines.push(nextLine);
  }
  return `---\n${lines.join("\n")}\n---\n${body}`;
}

function parseFields(inner: string): FrontmatterFields {
  const fields = emptyFrontmatter();
  for (const line of inner.split("\n")) {
    for (const key of FRONTMATTER_KEYS) {
      if (!fieldLine(line, key)) {
        continue;
      }
      const value = line.slice(line.indexOf(":") + 1).trim();
      fields[key] = unquote(value);
    }
  }
  return fields;
}

function fieldLine(line: string, key: string): boolean {
  return new RegExp(`^${key}\\s*:`).test(line);
}

function formatYamlValue(value: string): string {
  if (value === "") {
    return "";
  }
  if (/[:#{}[\],&*?]|^\s|\s$/.test(value) || /^(true|false|null|\d+)$/i.test(value)) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return value;
}
