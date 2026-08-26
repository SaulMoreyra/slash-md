import { posixJoin, posixNormalize } from "./paths";
import { setFrontmatterField } from "./frontmatter";

/** Built-in template ids shipped with the extension. */
export type BuiltinTemplateId =
  | "blank"
  | "meeting"
  | "tasks"
  | "project"
  | "notes"
  | "decision";

export type TemplateSource = "workspace" | "builtin";

export type TemplatePick = {
  id: string;
  label: string;
  description: string;
  source: TemplateSource;
};

export type TemplateManifest = Record<string, { label?: string; description?: string }>;

export const DEFAULT_TEMPLATES_DIR = "_templates";
/** Also discovered when `templatesPath` is unset (e.g. a repo-root `templates/` folder). */
export const FALLBACK_TEMPLATES_DIR = "templates";
export const TEMPLATE_MANIFEST = "_manifest.json";

export const BUILTIN_TEMPLATE_PICKS: TemplatePick[] = [
  { id: "blank", label: "Blank", description: "Empty page with title", source: "builtin" },
  { id: "meeting", label: "Meeting notes", description: "Agenda, notes, action items", source: "builtin" },
  { id: "tasks", label: "Tasks", description: "Today, later, and done", source: "builtin" },
  { id: "project", label: "Project", description: "Goal, status, next steps", source: "builtin" },
  { id: "notes", label: "Notes", description: "Summary, details, links", source: "builtin" },
  { id: "decision", label: "Decision", description: "Context, options, decision", source: "builtin" },
];

export function resolveTemplatesPath(contentPath: string, configured?: string): string {
  const trimmed = configured?.trim().replace(/^\/+|\/+$/g, "");
  if (trimmed && trimmed !== ".") {
    return trimmed;
  }
  if (trimmed === ".") {
    return DEFAULT_TEMPLATES_DIR;
  }
  const base = contentPath.trim().replace(/^\/+|\/+$/g, "");
  if (!base || base === ".") {
    return DEFAULT_TEMPLATES_DIR;
  }
  return posixJoin(base, DEFAULT_TEMPLATES_DIR);
}

/** Folders to scan for team templates. Configured path wins; otherwise `templates/` then `_templates/`. */
export function templateDirCandidates(contentPath: string, configured?: string): string[] {
  const trimmed = configured?.trim().replace(/^\/+|\/+$/g, "");
  if (trimmed && trimmed !== ".") {
    return [trimmed];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (value: string) => {
    const norm = posixNormalize(value);
    if (!norm || seen.has(norm)) {
      return;
    }
    seen.add(norm);
    out.push(norm);
  };
  const base = contentPath.trim().replace(/^\/+|\/+$/g, "");
  if (base && base !== ".") {
    add(posixJoin(base, FALLBACK_TEMPLATES_DIR));
    add(posixJoin(base, DEFAULT_TEMPLATES_DIR));
  }
  add(FALLBACK_TEMPLATES_DIR);
  add(DEFAULT_TEMPLATES_DIR);
  return out;
}

export function parseTemplateManifest(raw: unknown): TemplateManifest {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const out: TemplateManifest = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!key.trim() || key.startsWith("_")) {
      continue;
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      continue;
    }
    const entry = value as Record<string, unknown>;
    out[key] = {
      label: typeof entry.label === "string" ? entry.label : undefined,
      description: typeof entry.description === "string" ? entry.description : undefined,
    };
  }
  return out;
}

export function templateIdFromFilename(name: string): string | undefined {
  if (!name.endsWith(".md") || name.endsWith(".slash.md")) {
    return undefined;
  }
  const base = name.slice(0, -3);
  if (!base || base.startsWith("_")) {
    return undefined;
  }
  return base;
}

export function humanizeTemplateId(id: string): string {
  return id
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function mergeTemplatePicks(workspace: TemplatePick[], builtin: TemplatePick[]): TemplatePick[] {
  const byId = new Map<string, TemplatePick>();
  for (const pick of builtin) {
    byId.set(pick.id, pick);
  }
  for (const pick of workspace) {
    byId.set(pick.id, pick);
  }
  const workspaceIds = new Set(workspace.map((p) => p.id));
  const merged = [...byId.values()];
  merged.sort((a, b) => {
    if (a.id === "blank" && b.id !== "blank") {
      return -1;
    }
    if (b.id === "blank" && a.id !== "blank") {
      return 1;
    }
    const aw = workspaceIds.has(a.id) ? 0 : 1;
    const bw = workspaceIds.has(b.id) ? 0 : 1;
    if (aw !== bw) {
      return aw - bw;
    }
    return a.label.localeCompare(b.label);
  });
  return merged;
}

export function isTemplateRepoPath(
  repoPath: string,
  templatesPath: string | readonly string[],
): boolean {
  const norm = posixNormalize(repoPath);
  const roots = typeof templatesPath === "string" ? [templatesPath] : templatesPath;
  return roots.some((root) => {
    const base = posixNormalize(root);
    if (!base) {
      return false;
    }
    return norm === base || norm.startsWith(`${base}/`);
  });
}

const FRONTMATTER_FENCE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const PICKER_FRONTMATTER_LINE = /^(description|label)\s*:/i;

function yamlScalar(inner: string, key: string): string {
  const match = inner.match(new RegExp(`^${key}\\s*:\\s*(.*)$`, "im"));
  if (!match) {
    return "";
  }
  const raw = (match[1] ?? "").trim();
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return raw;
}

export function templateFileMeta(markdown: string): { label?: string; description?: string } {
  const fence = markdown.match(FRONTMATTER_FENCE);
  if (!fence) {
    return {};
  }
  const inner = fence[1] ?? "";
  const label = yamlScalar(inner, "label");
  const description = yamlScalar(inner, "description");
  return {
    ...(label ? { label } : {}),
    ...(description ? { description } : {}),
  };
}

/** Drop picker-only frontmatter so new pages do not inherit it. */
export function stripTemplatePickerFields(markdown: string): string {
  const fence = markdown.match(FRONTMATTER_FENCE);
  if (!fence) {
    return markdown;
  }
  const inner = fence[1] ?? "";
  const kept = inner.split("\n").filter((line) => !PICKER_FRONTMATTER_LINE.test(line.replace(/\r$/, "")));
  const body = markdown.slice(fence[0].length);
  if (kept.every((line) => !line.replace(/\r$/, "").trim())) {
    return body;
  }
  return `---\n${kept.join("\n").replace(/\n+$/, "")}\n---\n${body}`;
}

export function workspaceTemplatePicks(
  filenames: string[],
  manifest: TemplateManifest,
  fileText: Record<string, string> = {},
): TemplatePick[] {
  const picks: TemplatePick[] = [];
  for (const name of filenames) {
    const id = templateIdFromFilename(name);
    if (!id) {
      continue;
    }
    const meta = manifest[id];
    const fromFile = fileText[name] ? templateFileMeta(fileText[name]) : {};
    picks.push({
      id,
      label: fromFile.label || meta?.label?.trim() || humanizeTemplateId(id),
      description: fromFile.description || meta?.description?.trim() || "",
      source: "workspace",
    });
  }
  return picks;
}

export function fillTemplate(
  source: string,
  opts: { title: string; owner?: string; date: string },
): string {
  const replaced = source
    .replaceAll("{{title}}", opts.title)
    .replaceAll("{{owner}}", opts.owner ?? "")
    .replaceAll("{{date}}", opts.date);
  let next = stripTemplatePickerFields(replaced);
  next = setFrontmatterField(next, "title", opts.title);
  next = setFrontmatterField(next, "status", "draft");
  next = setFrontmatterField(next, "updated", opts.date);
  if (opts.owner) {
    next = setFrontmatterField(next, "owner", opts.owner);
  }
  return next;
}

export function todayDate(at = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}

export function templatePickerLabel(pick: TemplatePick): string {
  if (pick.source === "workspace") {
    return `${pick.label} (team)`;
  }
  return pick.label;
}

export function templatePickerDetail(pick: TemplatePick): string {
  return pick.description;
}
