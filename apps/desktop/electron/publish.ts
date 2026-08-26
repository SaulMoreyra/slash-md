import { stampDocMeta } from "@slash-md/core/docMeta";
import { dropReviewFields, loteMarkdownPaths } from "@slash-md/github/batchPublishModel";
import { getPull, listPullFiles } from "@slash-md/github/api";
import { loadMergeBlockers, mergeOpenPull, PublishBlocked } from "@slash-md/github/merge";
import { labeledTitle } from "@slash-md/core/messaging";
import { posixBasename, posixNormalize } from "@slash-md/core/paths";
import { currentAuth, resolveToken } from "./auth";
import { getContentConfig, readText, repoFile, writeText } from "./config";
import { currentBranch, isGitWorkspace, refExists, runGit, switchToBranch } from "./git";
import { getWorkspaceRoot, readStaging, writeStaging } from "./session";
import { getPublicationState } from "./publication";

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

  await syncDefaultBranch(root, token, config.defaultBranch, pubBranch);

  await deleteLocalPubBranch(root, pubBranch);

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

async function deleteLocalPubBranch(cwd: string, branch: string): Promise<void> {
  if (!(await refExists(cwd, `refs/heads/${branch}`))) {
    return;
  }
  try {
    await runGit(["branch", "-d", branch], { cwd });
  } catch {
    try {
      await runGit(["branch", "-D", branch], { cwd });
    } catch {
      // branch may already be gone
    }
  }
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
