import { unwrapHostError } from "@slash-md/core/conflictModel";
import type {
  HomeTreeNode,
  LocalDraft,
  LoteReviewSummary,
  PublicationSummary,
} from "@slash-md/core/homeTypes";
import { posixBasename } from "@slash-md/core/paths";
import { isTemplateRepoPath, templateDirCandidates } from "@slash-md/core/templates";
import type { TFunction } from "i18next";
import type { HomeTreePayload } from "../../../shared/api";
import { CreateIntent, FolderCoverBasename, PrCheckStatus, PublicationKind, PublishBlocker } from "./enums";

const COVER_BASENAMES = [FolderCoverBasename.Readme, FolderCoverBasename.Index];

/** Direct child README.md / index.md, if the folder has a cover page. */
export function findFolderCover(folder: HomeTreeNode): HomeTreeNode | undefined {
  const files = folder.children?.filter((node) => node.kind === "file") ?? [];
  for (const name of COVER_BASENAMES) {
    const hit = files.find((file) => posixBasename(file.path).toLowerCase() === name);
    if (hit) {
      return hit;
    }
  }
  return undefined;
}

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
