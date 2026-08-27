import type { ContentConfig } from "@slash-md/core/configTypes";
import { discardCleanPaths } from "@slash-md/core/discardCleanPaths";
import type {
  PublicationKind,
  PublicationState,
  PublicationSummary,
} from "@slash-md/core/homeTypes";
import { contentPathPrefix } from "@slash-md/core/paths";
import { commenterFromGithubUser, parseGitShortstat, uniqueCommenters } from "@slash-md/core/publicationMeta";
import {
  findOpenPull,
  findPullsForHead,
  listIssueComments,
  listOpenPulls,
  listPullDiffComments,
  listPullReviews,
  pullIsApproved,
  type GithubPull,
} from "@slash-md/github/api";
import { discardGithubRemote } from "@slash-md/github/discardRemote";
import { isOwnPublication } from "@slash-md/github/ownPublication";
import {
  isPublicationBranch,
  nextFreePublicationBranch,
  publicationBranchName,
  titleFromPublicationBranch,
} from "@slash-md/github/publicationBranch";
import { classifyPublicationPulls, isAheadCount, kindWithLocalAhead } from "@slash-md/github/publicationPull";
import { currentAuth, resolveToken } from "./auth";
import { getContentConfig } from "./config";
import {
  commitsAheadOf,
  currentBranch,
  forceSwitchToBranch,
  isGitWorkspace,
  isMergeInProgress,
  parsePorcelain,
  refExists,
  runGit,
  switchToBranch,
} from "./git";
import { deleteLocalPubBranch, landOnWiki } from "./pubBranch";
import { getWorkspaceRoot } from "./session";

function requireWorkspaceGit(): { root: string } {
  const root = getWorkspaceRoot();
  if (!root) {
    throw new Error("Abre una carpeta para continuar.");
  }
  return { root };
}

type ResolvedPublicationPull = {
  kind: PublicationKind;
  pull: GithubPull | undefined;
  lookupFailed: boolean;
};

export async function getPublicationState(): Promise<{ publication: PublicationState | null; canWrite: boolean }> {
  const root = getWorkspaceRoot();
  if (!root) {
    return { publication: null, canWrite: true };
  }
  if (!(await isGitWorkspace(root))) {
    return { publication: null, canWrite: true };
  }
  const config = await getContentConfig(root);
  if (!config || config.mode !== "workspace") {
    return { publication: null, canWrite: true };
  }

  const head = await currentBranch(root);
  if (head === config.defaultBranch) {
    return { publication: null, canWrite: false };
  }
  if (!isPublicationBranch(head)) {
    return { publication: null, canWrite: true };
  }

  const token = await resolveToken();
  const resolved = await resolvePublicationPull(root, token, config, head);
  return {
    publication: publicationStateFrom(head, resolved),
    canWrite: true,
  };
}

export async function listPublications(): Promise<PublicationSummary[]> {
  const { root } = requireWorkspaceGit();
  if (!(await isGitWorkspace(root))) {
    return [];
  }
  const config = await getContentConfig(root);
  if (!config || config.mode !== "workspace") {
    return [];
  }

  const head = await currentBranch(root);
  const localHeads = await listRefShortNames(root, "refs/heads/pub/");
  const branches = new Set(localHeads);
  for (const name of await listRefShortNames(root, "refs/remotes/origin/pub/")) {
    branches.add(name.replace(/^origin\//, ""));
  }

  const token = await resolveToken();
  const login = token ? ((await currentAuth())?.login ?? null) : null;
  const { pullByBranch, lookupFailed } = await loadOpenPublicationPulls(token, config);

  for (const [branch] of pullByBranch) {
    branches.add(branch);
  }

  const mergedByBranch = lookupFailed
    ? new Map<string, { pulls: GithubPull[]; failed: boolean }>()
    : await loadMergedPullsForLocalHeads(token, config, localHeads, pullByBranch);

  const classified = new Map<
    string,
    { kind: PublicationKind; pull: GithubPull | undefined; owned: boolean }
  >();
  for (const branch of branches) {
    const open = pullByBranch.get(branch);
    const extra = mergedByBranch.get(branch);
    const branchLookupFailed = lookupFailed || Boolean(extra?.failed);
    const pulls = open ? [open] : (extra?.pulls ?? []);
    const resolved = await applyLocalAhead(
      root,
      branch,
      classifyPublicationPulls(pulls),
    );
    const pull = resolved.pull;
    const owned = isOwnPublication({
      login,
      local: localHeads.has(branch),
      pull: branchLookupFailed ? undefined : pull ? { author: pull.user?.login ?? null } : null,
    });
    classified.set(branch, { kind: resolved.kind, pull, owned });
  }

  const toPrune = [...classified.entries()]
    .filter(([branch, info]) => info.kind === "published" && localHeads.has(branch) && branch !== head)
    .map(([branch]) => branch);
  for (const branch of toPrune) {
    await deleteLocalPubBranch(root, branch);
    classified.delete(branch);
  }

  const results: PublicationSummary[] = [];
  for (const branch of [...classified.keys()].sort()) {
    const info = classified.get(branch);
    if (!info?.owned) {
      continue;
    }
    results.push({
      title: titleFromPublicationBranch(branch),
      branch,
      prNumber: info.pull?.number,
      prUrl: info.pull?.html_url,
      kind: info.kind,
      mounted: branch === head,
      author: info.pull?.user?.login,
    });
  }

  const repo = config.repo ? { owner: config.owner, name: config.name } : undefined;
  return Promise.all(
    results.map((summary) => enrichPublicationSummary(root, token, repo, config.defaultBranch, summary)),
  );
}

async function enrichPublicationSummary(
  root: string,
  token: string | undefined,
  repo: { owner: string; name: string } | undefined,
  defaultBranch: string,
  summary: PublicationSummary,
): Promise<PublicationSummary> {
  if (summary.kind === "in_review" && token && repo && summary.prNumber) {
    const review = await loadReviewRowMeta(token, repo, summary.prNumber, summary.author);
    return { ...summary, ...review };
  }
  if (summary.kind === "draft") {
    const stats = await loadDraftDiffStats(root, summary.branch, defaultBranch);
    return stats ? { ...summary, ...stats } : summary;
  }
  return summary;
}

async function loadReviewRowMeta(
  token: string,
  repo: { owner: string; name: string },
  prNumber: number,
  author: string | undefined,
): Promise<Pick<PublicationSummary, "approved" | "commenters">> {
  try {
    const [reviews, issueComments, diffComments] = await Promise.all([
      listPullReviews(token, repo, prNumber),
      listIssueComments(token, repo, prNumber),
      listPullDiffComments(token, repo, prNumber),
    ]);
    const approved = pullIsApproved({ user: author ? { login: author } : undefined }, reviews);
    const fromReviews = reviews
      .filter((review) => review.body?.trim())
      .map((review) => commenterFromGithubUser(review.user));
    const commenters = uniqueCommenters([
      ...issueComments.map((comment) => commenterFromGithubUser(comment.user)),
      ...diffComments.map((comment) => commenterFromGithubUser(comment.user)),
      ...fromReviews,
    ]);
    return { approved, commenters };
  } catch {
    return {};
  }
}

async function loadDraftDiffStats(
  root: string,
  branch: string,
  defaultBranch: string,
): Promise<{ changedFiles: number; additions: number; deletions: number } | undefined> {
  const base = await resolveDiffRef(root, defaultBranch);
  const head = await resolveDiffRef(root, branch);
  if (!base || !head) {
    return undefined;
  }
  try {
    const out = await runGit(["diff", "--shortstat", `${base}...${head}`], { cwd: root });
    return parseGitShortstat(out);
  } catch {
    return undefined;
  }
}

async function resolveDiffRef(root: string, name: string): Promise<string | undefined> {
  if (await refExists(root, `refs/heads/${name}`)) {
    return name;
  }
  if (await refExists(root, `refs/remotes/origin/${name}`)) {
    return `origin/${name}`;
  }
  return undefined;
}

async function listRefShortNames(cwd: string, pattern: string): Promise<Set<string>> {
  const names = new Set<string>();
  try {
    const refs = await runGit(["for-each-ref", "--format=%(refname:short)", pattern], { cwd });
    for (const line of refs.split(/\r?\n/)) {
      const name = line.trim();
      if (name) {
        names.add(name);
      }
    }
  } catch {
    // no refs
  }
  return names;
}

async function loadOpenPublicationPulls(
  token: string | undefined,
  config: ContentConfig,
): Promise<{ pullByBranch: Map<string, GithubPull>; lookupFailed: boolean }> {
  const pullByBranch = new Map<string, GithubPull>();
  if (!token || !config.repo) {
    return { pullByBranch, lookupFailed: false };
  }
  try {
    const pulls = await listOpenPulls(token, { owner: config.owner, name: config.name });
    for (const pull of pulls) {
      const branch = pull.head.ref;
      if (!isPublicationBranch(branch)) {
        continue;
      }
      if (!pullByBranch.has(branch)) {
        pullByBranch.set(branch, pull);
      }
    }
    return { pullByBranch, lookupFailed: false };
  } catch {
    return { pullByBranch, lookupFailed: true };
  }
}

async function loadMergedPullsForLocalHeads(
  token: string | undefined,
  config: ContentConfig,
  localHeads: Set<string>,
  openByBranch: Map<string, GithubPull>,
): Promise<Map<string, { pulls: GithubPull[]; failed: boolean }>> {
  const extra = new Map<string, { pulls: GithubPull[]; failed: boolean }>();
  if (!token || !config.repo) {
    return extra;
  }
  const missing = [...localHeads].filter((branch) => !openByBranch.has(branch));
  const found = await Promise.all(
    missing.map(async (branch) => {
      try {
        const pulls = await findPullsForHead(token, { owner: config.owner, name: config.name }, branch);
        return { branch, pulls, failed: false };
      } catch {
        return { branch, pulls: [] as GithubPull[], failed: true };
      }
    }),
  );
  for (const item of found) {
    extra.set(item.branch, { pulls: item.pulls, failed: item.failed });
  }
  return extra;
}

async function resolvePublicationPull(
  cwd: string,
  token: string | undefined,
  config: ContentConfig,
  branch: string,
): Promise<ResolvedPublicationPull> {
  if (!token || !config.repo) {
    return { kind: "draft", pull: undefined, lookupFailed: false };
  }
  try {
    const pulls = await findPullsForHead(token, { owner: config.owner, name: config.name }, branch);
    const resolved = await applyLocalAhead(cwd, branch, classifyPublicationPulls(pulls));
    return { ...resolved, lookupFailed: false };
  } catch {
    return { kind: "draft", pull: undefined, lookupFailed: true };
  }
}

async function applyLocalAhead(
  cwd: string,
  branch: string,
  classified: { kind: PublicationKind; pull: GithubPull | undefined },
): Promise<{ kind: PublicationKind; pull: GithubPull | undefined }> {
  const { kind, pull } = classified;
  if (kind !== "published" || !pull) {
    return classified;
  }
  const ahead = isAheadCount(await commitsAheadOf(cwd, branch, pull.head.sha));
  if (!ahead) {
    return classified;
  }
  return { kind: kindWithLocalAhead(kind, true), pull: undefined };
}

function publicationStateFrom(branch: string, resolved: ResolvedPublicationPull): PublicationState {
  return {
    title: titleFromPublicationBranch(branch),
    branch,
    prNumber: resolved.pull?.number,
    prUrl: resolved.pull?.html_url,
    kind: resolved.kind,
  };
}

export async function createPublication(title: string): Promise<PublicationState> {
  const { root } = requireWorkspaceGit();
  if (!(await isGitWorkspace(root))) {
    throw new Error("No es un repositorio git.");
  }
  const config = await getContentConfig(root);
  if (!config || config.mode !== "workspace") {
    throw new Error("Modo workspace requerido para crear una publicación.");
  }

  const head = await currentBranch(root);
  if (isPublicationBranch(head)) {
    throw new Error("Ya estás en una publicación. Sal primero con leavePublication.");
  }

  const token = await resolveToken();
  if (token) {
    try {
      await runGit(["fetch", "origin", config.defaultBranch], { cwd: root, token });
    } catch {
      // offline or no remote — continue
    }
  }

  if (head !== config.defaultBranch) {
    await switchToBranch(root, config.defaultBranch);
  }

  const base = publicationBranchName(title);
  const taken = new Set<string>();
  try {
    const refs = await runGit(["for-each-ref", "--format=%(refname:short)", "refs/heads/pub/"], { cwd: root });
    for (const line of refs.split(/\r?\n/)) {
      const b = line.trim();
      if (b) taken.add(b);
    }
  } catch {
    // no existing branches
  }

  const branch = nextFreePublicationBranch(base, taken);
  await switchToBranch(root, branch);

  return {
    title: titleFromPublicationBranch(branch),
    branch,
    kind: "draft",
  };
}

export async function resumePublication(branch: string): Promise<PublicationState> {
  const { root } = requireWorkspaceGit();
  if (!isPublicationBranch(branch)) {
    throw new Error(`"${branch}" no es una rama de publicación.`);
  }
  await switchToBranch(root, branch);

  const config = await getContentConfig(root);
  const token = await resolveToken();
  if (!config) {
    return { title: titleFromPublicationBranch(branch), branch, kind: "draft" };
  }
  const resolved = await resolvePublicationPull(root, token, config, branch);
  return publicationStateFrom(branch, resolved);
}

export async function leavePublication(): Promise<void> {
  const { root } = requireWorkspaceGit();
  if (await isMergeInProgress(root)) {
    throw new Error("Termina de actualizar esta publicación con la wiki antes de volver.");
  }
  const config = await getContentConfig(root);
  if (!config) {
    throw new Error("No se encontró la configuración de workspace.");
  }
  const token = await resolveToken();
  const head = await currentBranch(root);
  if (isPublicationBranch(head)) {
    const resolved = await resolvePublicationPull(root, token, config, head);
    if (resolved.kind === "published") {
      await landOnWiki(root, token, config.defaultBranch, head);
      return;
    }
  }

  const defaultBranch = config.defaultBranch;
  await switchToBranch(root, defaultBranch);
  try {
    await runGit(["pull", "--ff-only", "origin", defaultBranch], { cwd: root, token });
  } catch {
    // offline or diverged — leave on defaultBranch anyway
  }
}

export async function landPublication(branch?: string): Promise<void> {
  const { root } = requireWorkspaceGit();
  if (await isMergeInProgress(root)) {
    throw new Error("Termina de actualizar esta publicación con la wiki antes de volver.");
  }
  const config = await getContentConfig(root);
  if (!config || config.mode !== "workspace") {
    throw new Error("Modo workspace requerido para actualizar la wiki.");
  }
  const head = await currentBranch(root);
  const target = branch ?? head;
  if (!isPublicationBranch(target)) {
    throw new Error(`"${target}" no es una rama de publicación.`);
  }
  const token = await resolveToken();
  const resolved = await resolvePublicationPull(root, token, config, target);
  if (resolved.kind !== "published") {
    throw new Error("Esta publicación no está en la wiki todavía.");
  }
  if (head === target) {
    await landOnWiki(root, token, config.defaultBranch, target);
    return;
  }
  await deleteLocalPubBranch(root, target);
}

export async function discardPublication(branch: string): Promise<void> {
  const { root } = requireWorkspaceGit();
  if (!isPublicationBranch(branch)) {
    throw new Error(`"${branch}" no es una rama de publicación.`);
  }
  if (await isMergeInProgress(root)) {
    throw new Error("Termina de actualizar esta publicación con la wiki antes de volver.");
  }
  const config = await getContentConfig(root);
  if (!config || config.mode !== "workspace") {
    throw new Error("Modo workspace requerido para descartar una publicación.");
  }

  const defaultRef =
    (await refExists(root, `refs/heads/${config.defaultBranch}`)) ||
    (await refExists(root, `refs/remotes/origin/${config.defaultBranch}`));
  if (!defaultRef) {
    throw new Error(`Branch ${config.defaultBranch} was not found.`);
  }

  const localHeads = await listRefShortNames(root, "refs/heads/pub/");
  const token = await resolveToken();
  const login = token ? ((await currentAuth())?.login ?? null) : null;
  const remoteExists = await refExists(root, `refs/remotes/origin/${branch}`);

  let pull: GithubPull | undefined;
  let lookupFailed = false;
  if (token && config.repo) {
    try {
      pull = await findOpenPull(token, { owner: config.owner, name: config.name }, branch);
    } catch {
      lookupFailed = true;
    }
  }

  const owned = isOwnPublication({
    login,
    local: localHeads.has(branch),
    pull: lookupFailed ? undefined : pull ? { author: pull.user?.login ?? null } : null,
  });
  if (!owned) {
    throw new Error("Solo puedes descartar tus propias publicaciones.");
  }

  const needsGithub = Boolean(pull) || remoteExists;
  if (needsGithub && lookupFailed) {
    throw new Error("No se pudo contactar GitHub. Inténtalo de nuevo.");
  }
  if (needsGithub && !token) {
    throw new Error("Inicia sesión en GitHub para descartar esta publicación.");
  }
  if (needsGithub && token && config.repo) {
    await discardGithubRemote({
      token,
      repo: { owner: config.owner, name: config.name },
      branch,
      pull,
    });
  }

  const head = await currentBranch(root);
  if (head === branch) {
    await forceSwitchToBranch(root, config.defaultBranch);
    await cleanDiscardedContent(root, config.contentPath);
  }
  await deleteLocalPubBranch(root, branch);

  try {
    await runGit(["pull", "--ff-only", "origin", config.defaultBranch], { cwd: root, token });
  } catch {
    // offline or diverged — discard already finished locally
  }
}

async function cleanDiscardedContent(cwd: string, contentPath: string): Promise<void> {
  const prefix = contentPathPrefix(contentPath);
  if (prefix) {
    await runGit(["clean", "-fd", "--", prefix], { cwd });
    return;
  }
  const porcelain = await runGit(["status", "--porcelain"], { cwd });
  const files = [...parsePorcelain(porcelain).keys()];
  for (const file of discardCleanPaths(contentPath, files)) {
    await runGit(["clean", "-fd", "--", file], { cwd });
  }
}
