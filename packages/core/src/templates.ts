import { posixJoin, posixNormalize } from "./paths";
import { setFrontmatterField } from "./frontmatter";

/** Built-in template ids shipped with the extension. */
export type BuiltinTemplateId = "blank" | "prd" | "spec" | "decision" | "gallery";

export type TemplateSource = "workspace" | "builtin";

export type TemplatePick = {
  id: string;
  label: string;
  description: string;
  source: TemplateSource;
};

export type TemplateManifest = Record<string, { label?: string; description?: string }>;

export const DEFAULT_TEMPLATES_DIR = "_templates";
export const TEMPLATE_MANIFEST = "_manifest.json";

export const BUILTIN_TEMPLATE_PICKS: TemplatePick[] = [
  { id: "blank", label: "Blank", description: "Frontmatter + title", source: "builtin" },
  { id: "prd", label: "PRD", description: "Problem, proposal, scope", source: "builtin" },
  { id: "spec", label: "Spec", description: "Behavior and non-goals", source: "builtin" },
  { id: "decision", label: "Decision", description: "Context, decision, consequences", source: "builtin" },
  {
    id: "gallery",
    label: "Gallery",
    description: "Every slash block and one code fence per language",
    source: "builtin",
  },
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
    const aw = workspaceIds.has(a.id) ? 0 : 1;
    const bw = workspaceIds.has(b.id) ? 0 : 1;
    if (aw !== bw) {
      return aw - bw;
    }
    return a.label.localeCompare(b.label);
  });
  return merged;
}

export function isTemplateRepoPath(repoPath: string, templatesPath: string): boolean {
  const norm = posixNormalize(repoPath);
  const root = posixNormalize(templatesPath);
  return norm === root || norm.startsWith(`${root}/`);
}

export function workspaceTemplatePicks(
  filenames: string[],
  manifest: TemplateManifest,
): TemplatePick[] {
  const picks: TemplatePick[] = [];
  for (const name of filenames) {
    const id = templateIdFromFilename(name);
    if (!id) {
      continue;
    }
    const meta = manifest[id];
    picks.push({
      id,
      label: meta?.label?.trim() || humanizeTemplateId(id),
      description: meta?.description?.trim() || `Team template (${name})`,
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
  let next = replaced;
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
