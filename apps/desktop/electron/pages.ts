import fs from "node:fs/promises";
import path from "node:path";
import { app } from "electron";
import { splitFrontmatter, setFrontmatterField, emptyFrontmatter, type FrontmatterFields } from "@slash-md/core/frontmatter";
import { discardLocalChangeAction } from "@slash-md/core/localDrafts";
import { labeledTitle } from "@slash-md/core/messaging";
import {
  contentPathPrefix,
  isPosixUnder,
  isUnderContentPath,
  posixDirname,
  posixJoin,
  posixBasename,
  posixNormalize,
  rewritePosixPrefixList,
} from "@slash-md/core/paths";
import { resolveCreateTarget } from "@slash-md/core/createPath";
import { slugify } from "@slash-md/core/slug";
import {
  BUILTIN_TEMPLATE_PICKS,
  fillTemplate,
  isTemplateRepoPath,
  mergeTemplatePicks,
  parseTemplateManifest,
  templateDirCandidates,
  TEMPLATE_MANIFEST,
  todayDate,
  workspaceTemplatePicks,
  type TemplatePick,
} from "@slash-md/core/templates";
import type { ContentConfig } from "@slash-md/core/configTypes";
import type { PagePayload } from "../shared/api";
import {
  assertSafeRepoPath,
  dirExists,
  fileExists,
  getContentConfig,
  readSlashmd,
  readText,
  repoFile,
  writeSlashmd,
  writeText,
} from "./config";
import { parsePrNumber } from "@slash-md/core/threadGate";
import { currentBranchName, isGitWorkspace, isMergeInProgress, parsePorcelain, runGit } from "./git";
import { isUnmergedPath } from "./conflicts";
import { getPublicationState } from "./publication";
import { getWorkspaceRoot, readStaging, writeStaging } from "./session";

function requireRoot(): string {
  const root = getWorkspaceRoot();
  if (!root) {
    throw new Error("Abre una carpeta de docs primero.");
  }
  return root;
}

export async function assertCanWriteWorkspace(): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) return;
  const config = await getContentConfig(root);
  if (!config || config.mode !== "workspace") return;
  if (!(await isGitWorkspace(root))) return;
  const { canWrite } = await getPublicationState();
  if (!canWrite) {
    throw new Error("Crea una publicación para editar.");
  }
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

  const { publication, canWrite } = config?.mode === "workspace"
    ? await getPublicationState()
    : { publication: null, canWrite: true };

  const yamlPr = parsePrNumber(fields.pr);
  const effectivePr = yamlPr ?? publication?.prNumber;
  const prUrl = effectivePr && config
    ? publication?.prUrl ?? `https://github.com/${config.owner}/${config.name}/pull/${effectivePr}`
    : null;

  return {
    path: repoPath,
    markdown,
    frontmatter: fields,
    savedAt: stat.mtime.toISOString(),
    pageKind: config ? "wiki" : "editor",
    repoMode: config?.mode ?? "personal",
    publishEnabled: config?.mode === "personal",
    reviewable: canWrite && isReviewable(fields.status, dirty),
    prUrl,
    publication,
    canWrite,
    branch: (await isGitWorkspace(root)) ? await currentBranchName(root) : undefined,
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
  if (status.trim().toLowerCase() === "published") {
    return false;
  }
  return dirty;
}

export async function savePage(repoPath: string, markdown: string): Promise<{ savedAt: string }> {
  const root = requireRoot();
  await assertCanWriteWorkspace();
  if ((await isMergeInProgress(root)) && (await isUnmergedPath(root, repoPath))) {
    await writeText(repoFile(root, repoPath), markdown);
    return { savedAt: new Date().toISOString() };
  }
  const config = await getContentConfig(root);
  let output = markdown;
  if (config?.mode === "workspace") {
    const { publication } = await getPublicationState();
    if (publication) {
      output = setFrontmatterField(output, "pr", "");
      output = setFrontmatterField(output, "reviewBranch", "");
    }
  }
  await writeText(repoFile(root, repoPath), output);
  return { savedAt: new Date().toISOString() };
}

export async function patchFrontmatter(
  repoPath: string,
  patch: Partial<FrontmatterFields>,
): Promise<{ markdown: string }> {
  const root = requireRoot();
  await assertCanWriteWorkspace();
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
  const byId = new Map<string, TemplatePick>();
  for (const templatesPath of templateDirCandidates(contentPath, configuredPath)) {
    for (const pick of await readTemplateDir(root, templatesPath)) {
      if (!byId.has(pick.id)) {
        byId.set(pick.id, pick);
      }
    }
  }
  return [...byId.values()];
}

async function readTemplateDir(root: string, templatesPath: string): Promise<TemplatePick[]> {
  const dir = repoFile(root, templatesPath);
  let names: string[];
  try {
    names = (await fs.readdir(dir, { withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
  let manifest: ReturnType<typeof parseTemplateManifest>;
  try {
    manifest = parseTemplateManifest(JSON.parse(await readText(path.join(dir, TEMPLATE_MANIFEST))));
  } catch {
    manifest = {};
  }
  const markdownByName: Record<string, string> = {};
  await Promise.all(
    names.map(async (name) => {
      if (!name.endsWith(".md") || name.endsWith(".slash.md")) {
        return;
      }
      try {
        markdownByName[name] = await readText(path.join(dir, name));
      } catch {
        // skip unreadable files
      }
    }),
  );
  return workspaceTemplatePicks(names, manifest, markdownByName);
}

async function loadTemplateSource(id: string): Promise<string> {
  const root = getWorkspaceRoot();
  const config = await getContentConfig(root);
  const contentPath = config?.contentPath ?? "";
  const slashmd = root ? await readSlashmd(root) : {};
  if (root) {
    for (const templatesPath of templateDirCandidates(contentPath, slashmd.templatesPath)) {
      const candidate = repoFile(root, posixJoin(templatesPath, `${id}.md`));
      if (await fileExists(candidate)) {
        return readText(candidate);
      }
    }
  }
  const builtin = path.join(templatesDir(), `${id}.md`);
  if (await fileExists(builtin)) {
    return readText(builtin);
  }
  return `---\ntitle: {{title}}\nstatus: draft\nupdated: {{date}}\n---\n`;
}

export async function createPage(input: {
  title: string;
  templateId: string;
  section?: string;
  fileName?: string;
}): Promise<{ path: string }> {
  const root = requireRoot();
  await assertCanWriteWorkspace();
  const config = (await getContentConfig(root)) ?? {
    repo: "",
    owner: "",
    name: "",
    contentPath: "",
    defaultBranch: "main",
    mode: "workspace" as const,
  };
  const fallbackTitle = input.title.trim() || "Untitled";
  const target = resolveCreateTarget(input.section, input.title, fallbackTitle);
  const title = input.fileName ? fallbackTitle : target.title;
  const dir = (input.fileName ? input.section?.trim() : target.section?.trim()) || config.contentPath;
  const repoPath = assertSafeRepoPath(
    config,
    input.fileName ? coverMarkdownPath(dir, input.fileName) : await uniqueMarkdownPath(root, dir, target.slug),
  );
  if (input.fileName && (await fileExists(repoFile(root, repoPath)))) {
    return { path: repoPath };
  }
  const source = await loadTemplateSource(input.templateId);
  const slashmd = await readSlashmd(root);
  const templateDirs = templateDirCandidates(config.contentPath, slashmd.templatesPath);
  const markdown = isTemplateRepoPath(posixNormalize(dir), templateDirs)
    ? source
    : fillTemplate(source, { title, date: todayDate() });
  await writeText(repoFile(root, repoPath), markdown);
  return { path: repoPath };
}

function coverMarkdownPath(dir: string, fileName: string): string {
  const base = posixBasename(fileName);
  if (!base || base !== fileName || !base.toLowerCase().endsWith(".md")) {
    throw new Error("Invalid file name.");
  }
  return posixJoin(dir, base);
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
  await assertCanWriteWorkspace();
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
  await assertCanWriteWorkspace();
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
    patchStaging(root, repoPath, nextPath);
    return { path: nextPath };
  }
  await writeText(abs, markdown);
  return { path: repoPath };
}

export async function deletePage(repoPath: string): Promise<void> {
  const root = requireRoot();
  await assertCanWriteWorkspace();
  const config = await getContentConfig(root);
  const filePath = posixNormalize(repoPath);
  if (config) {
    assertSafeRepoPath(config, filePath);
  }
  await fs.unlink(repoFile(root, filePath));
  patchStaging(root, filePath, null);
}

export async function renameFolder(repoPath: string, name: string): Promise<{ path: string }> {
  const root = requireRoot();
  await assertCanWriteWorkspace();
  const config = await getContentConfig(root);
  if (!config) {
    throw new Error("Repo not configured. Run Init first.");
  }
  const from = assertSafeFolderPath(config, repoPath);
  assertNotContentRoot(config, from);
  const parent = posixDirname(from);
  const segment = folderSegment(name);
  const wanted = posixJoin(parent, segment);
  const nextPath = posixNormalize(wanted) === from
    ? from
    : assertSafeFolderPath(config, await uniqueFolderPath(root, parent, segment, from));
  assertNotContentRoot(config, nextPath);

  if (nextPath !== from) {
    const absFrom = repoFile(root, from);
    const absTo = repoFile(root, nextPath);
    if (await dirExists(absFrom)) {
      await fs.rename(absFrom, absTo);
    } else {
      await fs.mkdir(absTo, { recursive: true });
    }
  }

  const slashmd = await readSlashmd(root);
  const nextSections = [...new Set(rewritePosixPrefixList(slashmd.sections ?? [], from, nextPath))].sort();
  await writeSlashmd(root, { sections: nextSections });
  patchStaging(root, from, nextPath);
  return { path: nextPath };
}

export async function deleteFolder(repoPath: string): Promise<void> {
  const root = requireRoot();
  await assertCanWriteWorkspace();
  const config = await getContentConfig(root);
  if (!config) {
    throw new Error("Repo not configured. Run Init first.");
  }
  const folderPath = assertSafeFolderPath(config, repoPath);
  assertNotContentRoot(config, folderPath);
  await fs.rm(repoFile(root, folderPath), { recursive: true, force: true });
  const slashmd = await readSlashmd(root);
  const nextSections = (slashmd.sections ?? []).filter((section) => !isPosixUnder(section, folderPath));
  await writeSlashmd(root, { sections: nextSections });
  patchStaging(root, folderPath, null);
}

async function pathExists(abs: string): Promise<boolean> {
  try {
    await fs.stat(abs);
    return true;
  } catch {
    return false;
  }
}

function assertSafeFolderPath(config: ContentConfig, folderPath: string): string {
  const normalized = posixNormalize(folderPath);
  if (!normalized || normalized.includes("..") || normalized === ".git" || normalized.startsWith(".git/")) {
    throw new Error("Invalid folder path.");
  }
  if (!isUnderContentPath(normalized, config.contentPath)) {
    const docsRoot = contentPathPrefix(config.contentPath);
    throw new Error(docsRoot ? `The folder must live under ${docsRoot}/.` : "Invalid folder path.");
  }
  return normalized;
}

function assertNotContentRoot(config: ContentConfig, folderPath: string): void {
  const docsRoot = contentPathPrefix(config.contentPath);
  if (docsRoot && posixNormalize(folderPath) === docsRoot) {
    throw new Error("Cannot rename or delete the docs root.");
  }
}

function folderSegment(name: string): string {
  const trimmed = name.trim();
  const segment = slugify(trimmed) || trimmed.replace(/\s+/g, "-");
  if (!segment || segment.includes("/") || segment.includes("..")) {
    throw new Error("Folder name only (no /).");
  }
  return segment;
}

async function uniqueFolderPath(root: string, parent: string, slug: string, current: string): Promise<string> {
  const currentNorm = posixNormalize(current);
  for (let attempt = 1; attempt < 1000; attempt += 1) {
    const name = attempt === 1 ? slug : `${slug}-${attempt}`;
    const repoPath = posixJoin(parent, name);
    if (posixNormalize(repoPath) === currentNorm) {
      return currentNorm;
    }
    if (!(await pathExists(repoFile(root, repoPath)))) {
      return repoPath;
    }
  }
  throw new Error("Could not find a free folder name.");
}

function patchStaging(root: string, from: string, to: string | null): void {
  writeStaging(root, rewritePosixPrefixList(readStaging(root), from, to));
}

/** Drop local edits: restore tracked files, delete untracked ones. */
export async function discardDraft(repoPath: string): Promise<{ deleted: boolean }> {
  const root = requireRoot();
  const filePath = posixNormalize(repoPath);
  const config = await getContentConfig(root);
  if (config) {
    assertSafeRepoPath(config, filePath);
  } else if (!filePath || filePath.includes("..") || filePath.startsWith(".git/")) {
    throw new Error("Invalid document path.");
  }

  let state: { untracked: boolean; dirty: boolean; deleted?: boolean } | undefined;
  try {
    const stdout = await runGit(["status", "--porcelain", "--", filePath], { cwd: root });
    state = parsePorcelain(stdout).get(filePath);
  } catch {
    state = undefined;
  }

  const action = discardLocalChangeAction(state);
  if (action === "none") {
    throw new Error("No hay cambios locales que descartar.");
  }

  let deleted = false;
  if (action === "delete") {
    await fs.unlink(repoFile(root, filePath));
    deleted = true;
  } else {
    await runGit(["restore", "--source=HEAD", "--staged", "--worktree", "--", filePath], { cwd: root });
  }

  writeStaging(
    root,
    readStaging(root).filter((item) => posixNormalize(item) !== filePath),
  );
  return { deleted };
}

export async function emptyFields(): Promise<FrontmatterFields> {
  return emptyFrontmatter();
}

export { labeledTitle, posixBasename };
