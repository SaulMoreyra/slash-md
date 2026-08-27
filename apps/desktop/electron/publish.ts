import { stampDocMeta } from "@slash-md/core/docMeta";
import { dropReviewFields, loteMarkdownPaths } from "@slash-md/github/batchPublishModel";
import { getPull, listPullFiles } from "@slash-md/github/api";
import { loadMergeBlockers, mergeOpenPull, PublishBlocked } from "@slash-md/github/merge";
import { labeledTitle } from "@slash-md/core/messaging";
import { posixBasename, posixNormalize } from "@slash-md/core/paths";
import { currentAuth, resolveToken } from "./auth";
import { assertSafeRepoPath, fileExists, getContentConfig, readText, repoFile, writeText } from "./config";
import { isGitWorkspace, runGit, switchToBranch } from "./git";
import { getWorkspaceRoot, readStaging, writeStaging } from "./session";
import { getPublicationState } from "./publication";
import { landOnWiki } from "./pubBranch";

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

  const { publication } = await getPublicationState();
  if (!publication) {
    throw new Error("No mounted publication. Switch to a pub/ branch first.");
  }

  const prNumber = preferredPr ?? publication.prNumber;
  if (!prNumber) {
    throw new Error("No in-review pull request to publish.");
  }

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

  const pubBranch = publication.branch;

  await landOnWiki(root, token, config.defaultBranch, pubBranch);

  let prFiles: string[];
  try {
    prFiles = (await listPullFiles(token, config, prNumber))
      .filter((file) => file.status !== "removed")
      .map((file) => file.filename);
  } catch {
    prFiles = [];
  }
  const paths = loteMarkdownPaths(config.contentPath, [], prFiles);

  const selected = readStaging(root).map(posixNormalize).filter(Boolean);
  const pathSet = new Set(paths);
  writeStaging(
    root,
    selected.filter((item) => !pathSet.has(item)),
  );

  return { prNumber, prUrl: pr.html_url, paths, alreadyMerged };
}

function personalCommitMessage(titles: string[], survivingCount: number): string {
  if (titles.length === 1 && survivingCount === 0) {
    return `docs: remove ${titles[0]}`;
  }
  if (titles.length === 1) {
    return `docs: ${titles[0]}`;
  }
  return `docs: publish ${titles.length} pages`;
}

export async function publishPersonal(pathsInput: string | string[]): Promise<{ url: string }> {
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

  const rawPaths = Array.isArray(pathsInput) ? pathsInput : [pathsInput];
  const repoPaths = [...new Set(rawPaths.map(posixNormalize).filter(Boolean))].map((repoPath) =>
    assertSafeRepoPath(config, repoPath),
  );
  if (repoPaths.length === 0) {
    throw new Error("No pages to publish.");
  }

  const author = (await currentAuth())?.login || "slash-md";
  await switchToBranch(root, config.defaultBranch);

  const titles: string[] = [];
  const surviving: string[] = [];
  for (const repoPath of repoPaths) {
    const abs = repoFile(root, repoPath);
    const basename = posixBasename(repoPath);
    if (!(await fileExists(abs))) {
      titles.push(basename);
      continue;
    }
    const text = await readText(abs);
    const stamped = dropReviewFields(stampDocMeta(text, { status: "published" }));
    if (stamped !== text) {
      await writeText(abs, stamped);
    }
    titles.push(labeledTitle(stamped, basename));
    surviving.push(repoPath);
  }

  await runGit(["add", "--", ...repoPaths], { cwd: root });
  const dirty = (await runGit(["status", "--porcelain", "--", ...repoPaths], { cwd: root })).trim();
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
        personalCommitMessage(titles, surviving.length),
        "--",
        ...repoPaths,
      ],
      { cwd: root },
    );
  }
  await runGit(["push", "origin", `HEAD:${config.defaultBranch}`], { cwd: root, token });
  const blobPath = surviving[0] ?? repoPaths[0];
  return { url: `https://github.com/${config.owner}/${config.name}/blob/${config.defaultBranch}/${blobPath}` };
}
