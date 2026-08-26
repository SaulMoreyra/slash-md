import { parsePeople } from "@slash-md/core/frontmatter";
import { splitFrontmatter } from "@slash-md/core/frontmatter";
import { referencedImages } from "@slash-md/core/images";
import { posixNormalize } from "@slash-md/core/paths";
import {
  createPullRequest,
  findOpenPull,
  githubRequest,
  requestPullReviewersIndividual,
} from "@slash-md/github/api";
import type { ReviewPreviewItem } from "@slash-md/core/homeProtocol";
import { labeledTitle } from "@slash-md/core/messaging";
import { posixBasename } from "@slash-md/core/paths";
import { parseReviewerLogins } from "@slash-md/github/reviewBranch";
import { currentAuth, resolveToken } from "./auth";
import { assertSafeRepoPath, fileExists, getContentConfig, readText, repoFile } from "./config";
import { GitError, isGitWorkspace, runGit } from "./git";
import { getWorkspaceRoot } from "./session";
import { getPublicationState } from "./publication";
import { listPendingReviewMarkdown } from "./workspace";

function requireRoot(): string {
  const root = getWorkspaceRoot();
  if (!root) {
    throw new Error("Abre la carpeta de docs para mandar a revisión.");
  }
  return root;
}

export async function previewReview(): Promise<ReviewPreviewItem[]> {
  const root = requireRoot();
  const config = await getContentConfig(root);
  if (!config) {
    throw new Error("Repo not configured. Use Init before sending pages to review.");
  }
  if (config.mode !== "workspace") {
    throw new Error("Review is workspace/PR-only.");
  }
  if (!(await isGitWorkspace(root))) {
    throw new Error("The docs folder is not a Git repository.");
  }
  const { publication } = await getPublicationState();
  if (!publication) {
    throw new Error("Mount a publication branch (pub/) before sending to review.");
  }

  const diffPaths = await listPendingReviewMarkdown(root, config.contentPath, config.defaultBranch, publication.branch);
  if (diffPaths.length === 0) {
    return [];
  }

  const items: ReviewPreviewItem[] = [];
  for (const filePath of diffPaths) {
    let text: string;
    try {
      text = await readText(repoFile(root, filePath));
    } catch {
      continue;
    }
    const { fields } = splitFrontmatter(text);
    const people = fields.people ? parsePeople(fields.people) : [];
    items.push({
      path: filePath,
      title: labeledTitle(text, posixBasename(filePath)),
      badge: fields.status || "draft",
      summary: filePath,
      ...(people.length > 0 ? { people } : {}),
    });
  }
  return items;
}

export async function sendBatchToReview(
  rawReviewers = "",
  excludePaths?: string[],
): Promise<{
  prNumber: number;
  prUrl: string;
  created: boolean;
  branch: string;
  paths: string[];
  mentionedOnly?: string[];
}> {
  const root = requireRoot();
  const config = await getContentConfig(root);
  if (!config) {
    throw new Error("Repo not configured. Use Init before sending pages to review.");
  }
  if (config.mode !== "workspace") {
    throw new Error("Review is workspace/PR-only. Personal and local modes publish differently or stay on disk.");
  }
  if (!(await isGitWorkspace(root))) {
    throw new Error("The docs folder is not a Git repository.");
  }
  const { publication } = await getPublicationState();
  if (!publication) {
    throw new Error("Mount a publication branch (pub/) before sending to review.");
  }

  const token = await resolveToken();
  if (!token) {
    throw new Error("Sign in to GitHub to send pages to review.");
  }
  const auth = await currentAuth();
  const author = auth?.login || "slash-md";

  const allDirty = await listPendingReviewMarkdown(root, config.contentPath, config.defaultBranch, publication.branch);
  const excludeSet = new Set((excludePaths ?? []).map(posixNormalize));
  const selected = allDirty.filter((p) => !excludeSet.has(p));

  if (selected.length === 0) {
    throw new Error("No dirty markdown files to send to review.");
  }

  const peopleLookup = new Map<string, string[]>();
  for (const filePath of selected) {
    try {
      const text = await readText(repoFile(root, filePath));
      const { fields } = splitFrontmatter(text);
      if (fields.people) {
        peopleLookup.set(filePath, parsePeople(fields.people));
      }
    } catch {
      // skip unreadable
    }
  }

  const addPaths = await collectAddPaths(config, root, selected);
  assertAddList(addPaths, selected, true);
  await assertNoForeignStaged(root, addPaths);
  await runGit(["add", "--", ...addPaths], { cwd: root });
  await assertIndexIsLote(root, addPaths);

  const dirty = (await runGit(["status", "--porcelain", "--", ...addPaths], { cwd: root })).trim();
  const branch = publication.branch;

  if (dirty) {
    await commitLote(root, author, `docs: review ${publication.title} (${selected.length} pages)`, addPaths);
  }

  const existingPr = await findOpenPull(token, { owner: config.owner, name: config.name }, branch);

  await runGit(["push", "-u", "origin", "HEAD"], { cwd: root, token });

  const allPeople = new Set<string>();
  for (const logins of peopleLookup.values()) {
    for (const login of logins) {
      allPeople.add(login);
    }
  }
  const explicitReviewers = parseReviewerLogins(rawReviewers);
  for (const login of explicitReviewers) {
    allPeople.add(login);
  }
  allPeople.delete(author);

  const reviewers = [...allPeople];
  let mentionedOnly: string[] = [];

  let created = false;
  let pr = existingPr;
  if (!pr) {
    const bodyLines = selected.map((item) => `- ${item}`);
    pr = await createPullRequest(token, { owner: config.owner, name: config.name }, {
      title: publication.title,
      head: branch,
      base: config.defaultBranch,
      body: bodyLines.join("\n"),
    });
    created = true;
  }

  if (reviewers.length > 0) {
    const { failed } = await requestPullReviewersIndividual(
      token,
      { owner: config.owner, name: config.name },
      pr.number,
      reviewers,
    );
    mentionedOnly = failed;
  }

  if (mentionedOnly.length > 0 && pr) {
    const mentions = mentionedOnly.map((login) => `@${login}`).join(" ");
    const updatedBody = [
      ...selected.map((item) => `- ${item}`),
      "",
      `cc ${mentions} (could not be added as reviewers)`,
    ].join("\n");
    try {
      await githubRequest(token, "PATCH", `/repos/${config.owner}/${config.name}/pulls/${pr.number}`, {
        body: updatedBody,
      });
    } catch {
      // non-critical: mentions failed to update body
    }
  }

  return {
    prNumber: pr.number,
    prUrl: pr.html_url,
    created,
    branch,
    paths: selected,
    ...(mentionedOnly.length > 0 ? { mentionedOnly } : {}),
  };
}

async function collectAddPaths(
  config: { contentPath: string; owner: string; name: string; repo: string; defaultBranch: string; mode: "workspace" | "personal" | "local" },
  root: string,
  selected: string[],
): Promise<string[]> {
  const lote = new Set<string>();
  for (const filePath of selected) {
    lote.add(assertSafeRepoPath(config, filePath));
    const text = await readText(repoFile(root, filePath));
    for (const image of referencedImages(text, filePath)) {
      const safe = posixNormalize(image.repoPath.replace(/\\/g, "/").replace(/^\/+/, ""));
      if (!safe || safe.includes("..")) {
        continue;
      }
      if (await fileExists(repoFile(root, safe))) {
        lote.add(safe);
      }
    }
  }
  return [...lote];
}

function assertAddList(paths: string[], selectedMd: string[], requireAllSelected: boolean): void {
  const selected = new Set(selectedMd.map(posixNormalize));
  if (requireAllSelected) {
    for (const filePath of selected) {
      if (!paths.includes(filePath)) {
        throw new Error(`Refusing git add: selected page missing from lote (${filePath}).`);
      }
    }
  }
  for (const filePath of paths) {
    if (filePath === "-A" || filePath === "." || filePath === "--all" || filePath.includes("..")) {
      throw new Error(`Refusing unsafe git add path: ${filePath}`);
    }
    if (filePath.endsWith(".md") && !selected.has(posixNormalize(filePath))) {
      throw new Error(`Refusing git add: ${filePath} is not in the selected lote.`);
    }
  }
}

async function cachedNames(cwd: string): Promise<string[]> {
  return (await runGit(["diff", "--cached", "--name-only"], { cwd }))
    .split(/\r?\n/)
    .map((line) => posixNormalize(line.trim()))
    .filter(Boolean);
}

async function assertNoForeignStaged(cwd: string, lote: string[]): Promise<void> {
  const allowed = new Set(lote.map(posixNormalize));
  const extra = (await cachedNames(cwd)).filter((filePath) => !allowed.has(filePath));
  if (extra.length > 0) {
    throw new Error(`Other files are already staged (${extra.join(", ")}). Unstage them first.`);
  }
}

async function assertIndexIsLote(cwd: string, lote: string[]): Promise<void> {
  await assertNoForeignStaged(cwd, lote);
}

async function commitLote(cwd: string, author: string, message: string, paths: string[]): Promise<void> {
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
      message,
      "--",
      ...paths,
    ],
    { cwd },
  );
}

export { GitError, labeledTitle, posixBasename };
