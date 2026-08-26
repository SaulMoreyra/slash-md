import type { PublicationState, PublicationSummary } from "@slash-md/core/homeTypes";
import { findOpenPull } from "@slash-md/github/api";
import {
  isPublicationBranch,
  nextFreePublicationBranch,
  publicationBranchName,
  titleFromPublicationBranch,
} from "@slash-md/github/publicationBranch";
import { resolveToken } from "./auth";
import { getContentConfig } from "./config";
import { currentBranch, isGitWorkspace, runGit, switchToBranch, isMergeInProgress } from "./git";
import { getWorkspaceRoot } from "./session";

function requireWorkspaceGit(): { root: string } {
  const root = getWorkspaceRoot();
  if (!root) {
    throw new Error("Abre una carpeta para continuar.");
  }
  return { root };
}

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
  let prNumber: number | undefined;
  let prUrl: string | undefined;
  if (token && config.repo) {
    const pr = await findOpenPull(token, { owner: config.owner, name: config.name }, head);
    if (pr) {
      prNumber = pr.number;
      prUrl = pr.html_url;
    }
  }

  const kind = prNumber ? "in_review" : "draft";
  return {
    publication: {
      title: titleFromPublicationBranch(head),
      branch: head,
      prNumber,
      prUrl,
      kind,
    },
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
  const branches = new Set<string>();

  try {
    const local = await runGit(["for-each-ref", "--format=%(refname:short)", "refs/heads/pub/"], { cwd: root });
    for (const line of local.split(/\r?\n/)) {
      const b = line.trim();
      if (b) branches.add(b);
    }
  } catch {
    // no local pub branches
  }

  try {
    const remote = await runGit(["for-each-ref", "--format=%(refname:short)", "refs/remotes/origin/pub/"], { cwd: root });
    for (const line of remote.split(/\r?\n/)) {
      const b = line.trim().replace(/^origin\//, "");
      if (b) branches.add(b);
    }
  } catch {
    // no remote pub branches
  }

  const token = await resolveToken();
  const results: PublicationSummary[] = [];

  for (const branch of branches) {
    let prNumber: number | undefined;
    let prUrl: string | undefined;
    let kind: PublicationSummary["kind"] = "draft";

    if (token && config.repo) {
      try {
        const pr = await findOpenPull(token, { owner: config.owner, name: config.name }, branch);
        if (pr) {
          prNumber = pr.number;
          prUrl = pr.html_url;
          kind = "in_review";
        }
      } catch {
        // skip PR lookup failures
      }
    }

    results.push({
      title: titleFromPublicationBranch(branch),
      branch,
      prNumber,
      prUrl,
      kind,
      mounted: branch === head,
    });
  }

  return results;
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
  let prNumber: number | undefined;
  let prUrl: string | undefined;
  if (token && config?.repo) {
    const pr = await findOpenPull(token, { owner: config.owner, name: config.name }, branch);
    if (pr) {
      prNumber = pr.number;
      prUrl = pr.html_url;
    }
  }

  return {
    title: titleFromPublicationBranch(branch),
    branch,
    prNumber,
    prUrl,
    kind: prNumber ? "in_review" : "draft",
  };
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
  const defaultBranch = config.defaultBranch;
  await switchToBranch(root, defaultBranch);

  const token = await resolveToken();
  try {
    await runGit(["pull", "--ff-only", "origin", defaultBranch], { cwd: root, token });
  } catch {
    // offline or diverged — leave on defaultBranch anyway
  }
}
