import { stampDocMeta } from "@slash-md/core/docMeta";
import { dropReviewFields, loteMarkdownPaths, parseReviewPage, resolvePublishPr } from "@slash-md/github/batchPublishModel";
import { getPull, listPullFiles } from "@slash-md/github/api";
import { loadMergeBlockers, mergeOpenPull, PublishBlocked } from "@slash-md/github/merge";
import { labeledTitle } from "@slash-md/core/messaging";
import { posixBasename, posixNormalize } from "@slash-md/core/paths";
import { resolveTemplatesPath } from "@slash-md/core/templates";
import { currentAuth, resolveToken } from "./auth";
import { getContentConfig, readSlashmd, readText, repoFile, writeText, fileExists } from "./config";
import { currentBranch, isGitWorkspace, refExists, runGit, switchToBranch } from "./git";
import { getWorkspaceRoot, readStaging, writeStaging } from "./session";
import { listInReviewPages, listLocalMarkdown } from "./workspace";

function requireRoot(): string {
  const root = getWorkspaceRoot();
  if (!root) {
    throw new Error("Abre la carpeta de docs para publicar.");
  }
  return root;
}

export async function publishBatch(preferredPr?: number): Promise<{
  prNumber: number;
  prUrl: string;
  paths: string[];
  alreadyMerged: boolean;
}> {
  const root = requireRoot();
  const config = await getContentConfig(root);
  if (!config) {
    throw new Error("Repo not configured. Use Init before publishing.");
  }
  if (config.mode === "personal") {
    throw new Error("Aprobar y Publicar is workspace/PR-only.");
  }
  if (!(await isGitWorkspace(root))) {
    throw new Error("The docs folder is not a Git repository.");
  }
  const token = await resolveToken();
  if (!token) {
    throw new Error("Sign in to GitHub to publish.");
  }

  const slashmd = await readSlashmd(root);
  const files = await listLocalMarkdown(root, config.contentPath, resolveTemplatesPath(config.contentPath, slashmd.templatesPath));
  const inReview = await listInReviewPages(root, config.contentPath, files);
  const selected = readStaging(root).map(posixNormalize).filter(Boolean);
  const selectedPages = [];
  for (const filePath of selected) {
    try {
      const text = await readText(repoFile(root, filePath));
      selectedPages.push(parseReviewPage(filePath, text, labeledTitle(text, posixBasename(filePath))));
    } catch {
      // skip
    }
  }
  const resolved = preferredPr
    ? { kind: "one" as const, pr: preferredPr }
    : resolvePublishPr({
        selectedWithPr: selectedPages.map((page) => page.pr!).filter(Boolean),
        scannedPrs: inReview.map((page) => page.pr),
      });
  if (resolved.kind === "none") {
    throw new Error("No in-review pull request to publish.");
  }
  if (resolved.kind === "many") {
    throw new Error(`Multiple in-review PRs (${resolved.prs.join(", ")}). Open one lote at a time.`);
  }
  const prNumber = resolved.pr;
  const pages = uniquePages([
    ...inReview.filter((page) => page.pr === prNumber),
    ...selectedPages.filter((page) => page.pr === prNumber),
  ]);

  let pr = await getPull(token, config, prNumber);
  const alreadyMerged = Boolean(pr.merged || pr.merged_at);
  if (!alreadyMerged && pr.state !== "open") {
    throw new Error("PR is not open");
  }
  if (!alreadyMerged) {
    const reasons = await loadMergeBlockers(token, config, pr);
    if (reasons.length > 0) {
      throw new PublishBlocked(reasons);
    }
    const result = await mergeOpenPull({ token, repo: config, prNumber });
    pr = result.pr;
  }

  await syncDefaultBranch(root, token, config.defaultBranch, pages.find((page) => page.reviewBranch)?.reviewBranch || pr.head.ref);

  let prFiles: string[] = [];
  try {
    prFiles = (await listPullFiles(token, config, prNumber))
      .filter((file) => file.status !== "removed")
      .map((file) => file.filename);
  } catch {
    prFiles = [];
  }
  const lote = loteMarkdownPaths(
    config.contentPath,
    pages.map((page) => page.path),
    prFiles,
  );
  const stamped = await stampLote(root, lote);
  const stampedSet = new Set(stamped);
  writeStaging(
    root,
    readStaging(root).filter((item) => !stampedSet.has(posixNormalize(item))),
  );

  return { prNumber, prUrl: pr.html_url, paths: stamped, alreadyMerged };
}

async function stampLote(root: string, paths: string[]): Promise<string[]> {
  const stamped: string[] = [];
  for (const filePath of paths) {
    const abs = repoFile(root, filePath);
    if (!(await fileExists(abs))) {
      continue;
    }
    const text = await readText(abs);
    const next = dropReviewFields(stampDocMeta(text, { status: "published" }));
    if (next !== text) {
      await writeText(abs, next);
    }
    stamped.push(filePath);
  }
  return stamped;
}

async function syncDefaultBranch(
  cwd: string,
  token: string,
  defaultBranch: string,
  reviewBranch: string | undefined,
): Promise<void> {
  try {
    await runGit(["fetch", "origin", defaultBranch], { cwd, token });
  } catch {
    // still try pull
  }
  const current = await currentBranch(cwd);
  if (current !== defaultBranch) {
    try {
      if (await refExists(cwd, `refs/heads/${defaultBranch}`)) {
        await switchToBranch(cwd, defaultBranch);
      } else if (await refExists(cwd, `refs/remotes/origin/${defaultBranch}`)) {
        await switchToBranch(cwd, defaultBranch);
      } else {
        throw new Error(`Branch ${defaultBranch} was not found.`);
      }
    } catch (err) {
      const from = reviewBranch && current === reviewBranch ? `review branch ${current}` : current;
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(
        `PR merged, but could not switch from ${from} to ${defaultBranch} without overwriting local work. ${detail}`,
      );
    }
  }
  await runGit(["pull", "--ff-only", "origin", defaultBranch], { cwd, token });
}

function uniquePages<T extends { path: string }>(pages: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const page of pages) {
    const filePath = posixNormalize(page.path);
    if (seen.has(filePath)) {
      continue;
    }
    seen.add(filePath);
    out.push({ ...page, path: filePath });
  }
  return out;
}

export async function publishPersonal(repoPath: string): Promise<{ url: string }> {
  const root = requireRoot();
  const config = await getContentConfig(root);
  if (!config) {
    throw new Error("Repo not configured.");
  }
  if (config.mode !== "personal") {
    throw new Error("Direct publish is personal-mode only. Use Home → Aprobar y Publicar.");
  }
  if (!(await isGitWorkspace(root))) {
    throw new Error("The docs folder is not a Git repository.");
  }
  const token = await resolveToken();
  if (!token) {
    throw new Error("Sign in to GitHub to publish.");
  }
  const author = (await currentAuth())?.login || "slash-md";
  await switchToBranch(root, config.defaultBranch);
  const text = await readText(repoFile(root, repoPath));
  const stamped = dropReviewFields(stampDocMeta(text, { status: "published" }));
  if (stamped !== text) {
    await writeText(repoFile(root, repoPath), stamped);
  }
  await runGit(["add", "--", repoPath], { cwd: root });
  const dirty = (await runGit(["status", "--porcelain", "--", repoPath], { cwd: root })).trim();
  if (dirty) {
    await runGit(
      [
        "-c",
        `user.name=${author}`,
        "-c",
        `user.email=${author}@users.noreply.github.com`,
        "-c",
        "commit.gpgsign=false",
        "commit",
        "-m",
        `docs: ${labeledTitle(stamped, posixBasename(repoPath))}`,
        "--",
        repoPath,
      ],
      { cwd: root },
    );
  }
  await runGit(["push", "origin", `HEAD:${config.defaultBranch}`], { cwd: root, token });
  return { url: `https://github.com/${config.owner}/${config.name}/blob/${config.defaultBranch}/${repoPath}` };
}
