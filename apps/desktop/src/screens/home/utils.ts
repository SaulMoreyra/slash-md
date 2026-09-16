import { unwrapHostError } from "@slash-md/core/conflictModel";
import type {
  LocalDraft,
  LoteReviewSummary,
  PublicationSummary,
  WikiSyncStatus,
} from "@slash-md/core/homeTypes";
import { isTemplateRepoPath, templateDirCandidates } from "@slash-md/core/templates";
import type { TFunction } from "i18next";
import { posixJoin, posixNormalize } from "@slash-md/core/paths";
import { relativeToDir } from "@slash-md/core/homeTree";
import type { LibraryHit } from "@slash-md/ui/home/utils/tree";
import type { HomeTreePayload, SearchEntry } from "../../../shared/api";
import { CreateIntent, ModalKind, PrCheckStatus, PublicationCta, PublicationKind, PublicationStatusTone, PublishBlocker } from "./enums";

export function createIntentForSection(
  section: string | undefined,
  contentPath: string | undefined,
  templatesPath: string | undefined,
): CreateIntent {
  if (!section) {
    return CreateIntent.Page;
  }
  const dirs = templateDirCandidates(contentPath ?? ".", templatesPath);
  return isTemplateRepoPath(section, dirs) ? CreateIntent.Template : CreateIntent.Page;
}

export function newPageModalKind(needsInit: boolean, isWorkspace: boolean, canWrite: boolean): ModalKind {
  if (needsInit) {
    return ModalKind.Init;
  }
  if (isWorkspace && !canWrite) {
    return ModalKind.Publication;
  }
  return ModalKind.New;
}

export function settingsModalKind(needsInit: boolean): ModalKind {
  return needsInit ? ModalKind.Init : ModalKind.Config;
}

export function workspaceTitle(
  payload: HomeTreePayload | null,
  root: string | null,
  libraryFallback = "Library",
): string {
  const repo = payload?.repo;
  if (repo?.includes("/")) {
    return repo.slice(repo.indexOf("/") + 1);
  }
  if (repo) {
    return repo;
  }
  if (root) {
    return root.split("/").filter(Boolean).pop() ?? libraryFallback;
  }
  return libraryFallback;
}

export function initials(name: string): string {
  const parts = name.split(/[\s/_-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "SM";
}

export function formatTrail(trail: string): string {
  return trail.replaceAll(" / ", " › ");
}

export function fileLabel(title: string, path: string): string {
  if (title.toLowerCase().endsWith(".md")) {
    return title;
  }
  const base = path.split("/").pop() ?? title;
  return base.toLowerCase().endsWith(".md") ? base : `${title}.md`;
}

export function badgeChip(badge: LocalDraft["badge"]): { letter: string; className: string } {
  if (badge === "eliminado") {
    return { letter: "−", className: "chip-deleted" };
  }
  if (badge === "modificado") {
    return { letter: "M", className: "chip-m" };
  }
  if (badge === "in review") {
    return { letter: "R", className: "chip-r" };
  }
  return { letter: "D", className: "chip-d" };
}

export function publicationKindLabel(t: TFunction, kind: PublicationKind | string): string {
  if (kind === PublicationKind.Draft) {
    return t("home.publication.kindDraft");
  }
  if (kind === PublicationKind.InReview) {
    return t("home.publication.kindInReview");
  }
  return t("home.publication.kindPublished");
}

export function publicationChipColor(kind: PublicationKind | string): "default" | "accent" | "success" {
  if (kind === PublicationKind.InReview) {
    return "accent";
  }
  if (kind === PublicationKind.Published) {
    return "success";
  }
  return "default";
}

export type PublicationStatusInput = {
  kind: PublicationKind | string;
  canSendReview: boolean;
  wikiSyncStatus?: WikiSyncStatus;
  loteReview?: LoteReviewSummary;
};

/** Next step for the mounted publication. Null when the kind chip is enough. */
export function publicationStatusLine(t: TFunction, input: PublicationStatusInput): string | null {
  const { kind, canSendReview, wikiSyncStatus, loteReview } = input;
  if (kind === PublicationKind.Published) {
    return t("home.publication.statusOnWiki");
  }
  if (wikiSyncStatus === "conflicting") {
    return t("home.publication.statusWikiConflict");
  }
  if (wikiSyncStatus === "merging") {
    return t("home.publication.statusWikiMerging");
  }
  if (wikiSyncStatus === "behind") {
    return t("home.publication.statusWikiBehind");
  }
  if (kind === PublicationKind.Draft) {
    return canSendReview ? t("home.publication.statusUnsent") : null;
  }
  if (kind !== PublicationKind.InReview) {
    return null;
  }
  if (!loteReview) {
    return null;
  }
  if (loteReview.approvals === 0) {
    return t("home.publication.statusWaitingApproval");
  }
  if (loteReview.checksOk === false) {
    return t("home.publication.statusChecksFail");
  }
  if (loteReview.checksOk === null) {
    return t("home.publication.statusChecking");
  }
  if (loteReview.state === "open" && loteReview.approvals > 0 && loteReview.checksOk === true) {
    return t("home.publication.statusReadyToPublish");
  }
  return null;
}

export function publicationStatusTone(input: PublicationStatusInput): PublicationStatusTone {
  const { kind, canSendReview, wikiSyncStatus, loteReview } = input;
  if (kind === PublicationKind.Published) {
    return PublicationStatusTone.Success;
  }
  if (wikiSyncStatus === "conflicting" || wikiSyncStatus === "merging") {
    return PublicationStatusTone.Danger;
  }
  if (wikiSyncStatus === "behind") {
    return PublicationStatusTone.Warning;
  }
  if (kind === PublicationKind.Draft) {
    return canSendReview ? PublicationStatusTone.Warning : PublicationStatusTone.Default;
  }
  if (kind !== PublicationKind.InReview || !loteReview) {
    return PublicationStatusTone.Default;
  }
  if (loteReview.approvals === 0) {
    return PublicationStatusTone.Warning;
  }
  if (loteReview.checksOk === false) {
    return PublicationStatusTone.Danger;
  }
  if (loteReview.state === "open" && loteReview.approvals > 0 && loteReview.checksOk === true) {
    return PublicationStatusTone.Success;
  }
  return PublicationStatusTone.Default;
}

export function publicationChangeCount(input: {
  drafts: number;
  kind: PublicationKind | string;
  canSendReview: boolean;
  wikiSyncStatus?: WikiSyncStatus;
}): number {
  if (input.drafts <= 0) {
    return 0;
  }
  const wikiIdle = !input.wikiSyncStatus || input.wikiSyncStatus === "idle";
  if (input.kind === PublicationKind.Draft && input.canSendReview && wikiIdle) {
    return 0;
  }
  return input.drafts;
}

export function publicationCta(input: {
  kind?: PublicationKind | string;
  canSendReview: boolean;
  canPublishBatch: boolean;
  wikiSyncStatus?: WikiSyncStatus;
  loteReview?: LoteReviewSummary;
}): PublicationCta {
  if (input.kind === PublicationKind.Published) {
    return PublicationCta.Land;
  }
  if (input.canSendReview) {
    return PublicationCta.Send;
  }
  const blocked = input.wikiSyncStatus === "conflicting" || input.wikiSyncStatus === "merging";
  if (input.canPublishBatch && !blocked && input.loteReview && isPublishReady(input.loteReview)) {
    return PublicationCta.Publish;
  }
  return PublicationCta.None;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function publicationRowsForList(
  pubs: PublicationSummary[],
  hasCurrent: boolean,
): PublicationSummary[] {
  const others = pubs.filter((pub) => !pub.mounted);
  if (hasCurrent) {
    return others;
  }
  if (others.length > 0) {
    return others;
  }
  return pubs;
}

export function prCheckStatus(checksOk: boolean | null): PrCheckStatus {
  if (checksOk === true) {
    return PrCheckStatus.Ok;
  }
  if (checksOk === false) {
    return PrCheckStatus.Failing;
  }
  return PrCheckStatus.Pending;
}

export function inReviewDrafts(payload: HomeTreePayload): LocalDraft[] {
  return payload.drafts.filter((draft) => draft.badge === "in review");
}

export function isPublicationsPaneEmpty(payload: HomeTreePayload): boolean {
  const pubs = payload.publications ?? [];
  if (payload.publication || pubs.length > 0 || payload.needsAuth) {
    return false;
  }
  if (loteReviewFromPayload(payload)) {
    return false;
  }
  return inReviewDrafts(payload).length === 0;
}

export function loteReviewFromPayload(payload: HomeTreePayload): LoteReviewSummary | undefined {
  if (payload.loteReview) {
    return payload.loteReview;
  }
  const publication = payload.publication;
  if (!publication?.prNumber) {
    return undefined;
  }
  return {
    prNumber: publication.prNumber,
    prUrl: publication.prUrl ?? "",
    title: publication.title,
    branch: publication.branch,
    reviewers: [],
    checksOk: null,
    approvals: 0,
    state: "open",
  };
}

/** When GitHub data is missing, leave Publish enabled and let the host explain. */
export function isPublishReady(review: LoteReviewSummary | undefined): boolean {
  if (!review) {
    return true;
  }
  return review.state === "open" && review.approvals > 0 && review.checksOk !== false;
}

export function publishLockCopy(review: LoteReviewSummary | undefined, t: TFunction): string | null {
  if (!review || isPublishReady(review)) {
    return null;
  }
  if (review.approvals < 1) {
    return t("home.pr.publishNeedsApproval");
  }
  if (review.checksOk === false) {
    return t("home.pr.publishChecksFailing");
  }
  if (review.state !== "open") {
    return t("home.pr.publishClosed");
  }
  return null;
}

export function publishBlockerFromError(message: string): PublishBlocker | null {
  const text = unwrapHostError(message);
  if (/(^|·\s*)conflict(\s*·|$)/i.test(text)) {
    return PublishBlocker.Conflict;
  }
  if (text.includes(PublishBlocker.NeedsApproval)) {
    return PublishBlocker.NeedsApproval;
  }
  if (text.includes(PublishBlocker.ChecksFailing)) {
    return PublishBlocker.ChecksFailing;
  }
  if (text.includes(PublishBlocker.BranchProtection)) {
    return PublishBlocker.BranchProtection;
  }
  if (text.includes(PublishBlocker.PrClosed)) {
    return PublishBlocker.PrClosed;
  }
  return null;
}

export function publishErrorCopy(error: string, t: TFunction): string | null {
  const blocker = publishBlockerFromError(error);
  if (blocker === PublishBlocker.NeedsApproval) {
    return t("home.pr.publishNeedsApproval");
  }
  if (blocker === PublishBlocker.ChecksFailing) {
    return t("home.pr.publishChecksFailing");
  }
  if (blocker === PublishBlocker.BranchProtection) {
    return t("home.pr.publishBranchProtection");
  }
  if (blocker === PublishBlocker.PrClosed) {
    return t("home.pr.publishClosed");
  }
  return null;
}

/**
 * Turns the host's flat page index into the shape the search palette ranks.
 *
 * Search used to read the fully expanded tree, which only existed because the
 * host walked everything up front. With the tree indexed lazily it reads this
 * instead, so results no longer depend on which folders happen to be open.
 *
 * Folder hits are the directories the pages live in: the same set the tree
 * shows, rebuilt from the paths rather than indexed separately.
 */
export function libraryHitsFromIndex(entries: SearchEntry[], contentPath: string): LibraryHit[] {
  const base = posixNormalize(contentPath);
  const hits: LibraryHit[] = [];
  const seenFolders = new Set<string>();

  for (const entry of entries) {
    const rel = relativeToDir(base, entry.path);
    if (rel === undefined) {
      continue;
    }
    const segments = rel.split("/").filter(Boolean);
    const dirs = segments.slice(0, -1);

    for (let depth = 1; depth <= dirs.length; depth += 1) {
      const folderPath = posixJoin(base, dirs.slice(0, depth).join("/"));
      if (seenFolders.has(folderPath)) {
        continue;
      }
      seenFolders.add(folderPath);
      hits.push({
        kind: "folder",
        path: folderPath,
        title: dirs[depth - 1]!,
        trail: dirs.slice(0, depth - 1).join(" / "),
      });
    }

    hits.push({ kind: "file", path: entry.path, title: entry.title, trail: dirs.join(" / ") });
  }

  return hits;
}
