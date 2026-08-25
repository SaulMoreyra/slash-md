import fs from "node:fs/promises";
import path from "node:path";
import { app } from "electron";
import { splitFrontmatter, setFrontmatterField, emptyFrontmatter, type FrontmatterFields } from "@slash-md/core/frontmatter";
import { labeledTitle } from "@slash-md/core/messaging";
import { posixJoin, posixBasename, posixNormalize } from "@slash-md/core/paths";
import { slugify } from "@slash-md/core/slug";
import {
  BUILTIN_TEMPLATE_PICKS,
  fillTemplate,
  mergeTemplatePicks,
  parseTemplateManifest,
  resolveTemplatesPath,
  TEMPLATE_MANIFEST,
  todayDate,
  workspaceTemplatePicks,
  type TemplatePick,
} from "@slash-md/core/templates";
import type { PagePayload } from "../shared/api";
import {
  assertSafeRepoPath,
  fileExists,
  getContentConfig,
  readSlashmd,
  readText,
  repoFile,
  writeSlashmd,
  writeText,
} from "./config";
import { parsePrNumber } from "@slash-md/core/threadGate";
import { parsePorcelain, runGit } from "./git";
import { getWorkspaceRoot } from "./session";

function requireRoot(): string {
  const root = getWorkspaceRoot();
  if (!root) {
    throw new Error("Abre una carpeta de docs primero.");
  }
  return root;
}

function templatesDir(): string {
  return path.join(app.getAppPath(), "templates");
}

export async function loadPage(repoPath: string): Promise<PagePayload> {
  const root = requireRoot();
  const config = await getContentConfig(root);
  const abs = repoFile(root, repoPath);
  const markdown = await readText(abs);
  const { fields } = splitFrontmatter(markdown);
  const stat = await fs.stat(abs);
  const dirty = await pageGitDirty(root, repoPath);
  const pr = parsePrNumber(fields.pr);
  return {
    path: repoPath,
    markdown,
    frontmatter: fields,
    savedAt: stat.mtime.toISOString(),
    pageKind: config ? "wiki" : "editor",
    repoMode: config?.mode ?? "personal",
    publishEnabled: config?.mode === "personal",
    reviewable: isReviewable(fields.status, dirty),
    prUrl: pr && config ? `https://github.com/${config.owner}/${config.name}/pull/${pr}` : null,
  };
}

async function pageGitDirty(root: string, repoPath: string): Promise<boolean> {
  try {
    const stdout = await runGit(["status", "--porcelain", "--", repoPath], { cwd: root });
    const state = parsePorcelain(stdout).get(posixNormalize(repoPath));
    return Boolean(state?.dirty || state?.untracked);
  } catch {
    return false;
  }
}

function isReviewable(status: string, dirty: boolean): boolean {
  const kind = status.trim().toLowerCase();
  if (kind === "published") {
    return false;
  }
  if (kind === "draft") {
    return true;
  }
  return dirty;
}

export async function savePage(repoPath: string, markdown: string): Promise<{ savedAt: string }> {
  const root = requireRoot();
  await writeText(repoFile(root, repoPath), markdown);
  return { savedAt: new Date().toISOString() };
}

export async function patchFrontmatter(
  repoPath: string,
  patch: Partial<FrontmatterFields>,
): Promise<{ markdown: string }> {
  const root = requireRoot();
  let markdown = await readText(repoFile(root, repoPath));
  for (const [key, value] of Object.entries(patch) as Array<[keyof FrontmatterFields, string | undefined]>) {
    if (value === undefined) {
      continue;
    }
    markdown = setFrontmatterField(markdown, key, value);
  }
  await writeText(repoFile(root, repoPath), markdown);
  return { markdown };
}

export async function listTemplates(): Promise<TemplatePick[]> {
  const root = getWorkspaceRoot();
  const config = await getContentConfig(root);
  const contentPath = config?.contentPath ?? "";
  const slashmd = root ? await readSlashmd(root) : {};
  const workspace = root ? await listWorkspaceTemplates(root, contentPath, slashmd.templatesPath) : [];
  return mergeTemplatePicks(workspace, BUILTIN_TEMPLATE_PICKS);
}

async function listWorkspaceTemplates(
  root: string,
  contentPath: string,
  configuredPath?: string,
): Promise<TemplatePick[]> {
  const templatesPath = resolveTemplatesPath(contentPath, configuredPath);
  const dir = repoFile(root, templatesPath);
  let names: string[] = [];
  try {
    names = (await fs.readdir(dir, { withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
  let manifest = {};
  try {
    manifest = parseTemplateManifest(JSON.parse(await readText(path.join(dir, TEMPLATE_MANIFEST))));
  } catch {
    manifest = {};
  }
  return workspaceTemplatePicks(names, manifest);
}

async function loadTemplateSource(id: string): Promise<string> {
  const root = getWorkspaceRoot();
  const config = await getContentConfig(root);
  const contentPath = config?.contentPath ?? "";
  const slashmd = root ? await readSlashmd(root) : {};
  if (root) {
    const templatesPath = resolveTemplatesPath(contentPath, slashmd.templatesPath);
    const candidate = repoFile(root, posixJoin(templatesPath, `${id}.md`));
    if (await fileExists(candidate)) {
      return readText(candidate);
    }
  }
  const builtin = path.join(templatesDir(), `${id}.md`);
  if (await fileExists(builtin)) {
    return readText(builtin);
  }
  return `---\ntitle: {{title}}\nstatus: draft\nupdated: {{date}}\n---\n`;
}

export async function createPage(input: { title: string; templateId: string; section?: string }): Promise<{ path: string }> {
  const root = requireRoot();
  const config = (await getContentConfig(root)) ?? {
    repo: "",
    owner: "",
    name: "",
    contentPath: "",
    defaultBranch: "main",
    mode: "workspace" as const,
  };
  const title = input.title.trim() || "Untitled";
  const dir = input.section?.trim() || config.contentPath;
  const repoPath = assertSafeRepoPath(config, await uniqueMarkdownPath(root, dir, slugify(title)));
  const source = await loadTemplateSource(input.templateId);
  const markdown = fillTemplate(source, { title, date: todayDate() });
  await writeText(repoFile(root, repoPath), markdown);
  return { path: repoPath };
}

async function uniqueMarkdownPath(root: string, dir: string, slug: string): Promise<string> {
  for (let attempt = 1; attempt < 1000; attempt += 1) {
    const name = attempt === 1 ? `${slug}.md` : `${slug}-${attempt}.md`;
    const repoPath = posixJoin(dir, name);
    if (!(await fileExists(repoFile(root, repoPath)))) {
      return repoPath;
    }
  }
  throw new Error("Could not find a free filename.");
}

export async function createFolder(input: { name: string; parent?: string }): Promise<{ path: string }> {
  const root = requireRoot();
  const config = await getContentConfig(root);
  if (!config) {
    throw new Error("Repo not configured. Run Init first.");
  }
  const parent = normalizeParent(input.parent, config.contentPath);
  const segment = slugify(input.name.trim()) || input.name.trim().replace(/\s+/g, "-");
  if (!segment || segment.includes("/") || segment.includes("..")) {
    throw new Error("Folder name only (no /).");
  }
  const folderPath = posixJoin(parent, segment);
  if (config.contentPath && folderPath !== config.contentPath && !folderPath.startsWith(`${config.contentPath}/`)) {
    throw new Error(`The folder must live under ${config.contentPath}/.`);
  }
  const slashmd = await readSlashmd(root);
  const nextSections = [...new Set([...(slashmd.sections ?? []), folderPath])].sort();
  await writeSlashmd(root, { sections: nextSections });
  await fs.mkdir(repoFile(root, folderPath), { recursive: true });
  return { path: folderPath };
}

function normalizeParent(parent: string | undefined, contentPath: string): string {
  if (!parent?.trim()) {
    return contentPath;
  }
  const normalized = parent.trim().replace(/^\/+|\/+$/g, "");
  if (!contentPath || normalized === contentPath || normalized.startsWith(`${contentPath}/`)) {
    return normalized;
  }
  return posixJoin(contentPath, normalized);
}

export async function renamePage(repoPath: string, title: string): Promise<{ path: string }> {
  const root = requireRoot();
  const config = await getContentConfig(root);
  if (!config) {
    throw new Error("Repo not configured.");
  }
  const abs = repoFile(root, repoPath);
  const markdown = setFrontmatterField(await readText(abs), "title", title.trim());
  const dir = repoPath.split("/").slice(0, -1).join("/");
  const wanted = posixJoin(dir, `${slugify(title.trim() || "untitled")}.md`);
  const nextPath = posixNormalize(wanted) === posixNormalize(repoPath)
    ? repoPath
    : assertSafeRepoPath(config, await uniqueMarkdownPath(root, dir, slugify(title.trim() || "untitled")));
  if (nextPath !== repoPath) {
    await writeText(repoFile(root, nextPath), markdown);
    await fs.unlink(abs);
    return { path: nextPath };
  }
  await writeText(abs, markdown);
  return { path: repoPath };
}

export async function deletePage(repoPath: string): Promise<void> {
  const root = requireRoot();
  await fs.unlink(repoFile(root, repoPath));
}

export async function emptyFields(): Promise<FrontmatterFields> {
  return emptyFrontmatter();
}

export { labeledTitle, posixBasename };
