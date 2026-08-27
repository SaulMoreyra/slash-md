import type { PublicationKind } from "@slash-md/core/homeTypes";
import type { GithubPull } from "./api";

export function isMergedPull(pull: GithubPull): boolean {
  return Boolean(pull.merged || pull.merged_at);
}

export function kindFromPulls(pulls: GithubPull[]): PublicationKind {
  if (pulls.some((pull) => pull.state === "open")) {
    return "in_review";
  }
  if (pulls.some(isMergedPull)) {
    return "published";
  }
  return "draft";
}

export function pickPullForPublication(pulls: GithubPull[]): GithubPull | undefined {
  const open = pulls.find((pull) => pull.state === "open");
  if (open) {
    return open;
  }
  const merged = pulls.filter(isMergedPull).toSorted((a, b) => {
    const byDate = (b.merged_at ?? "").localeCompare(a.merged_at ?? "");
    if (byDate !== 0) {
      return byDate;
    }
    return b.number - a.number;
  });
  return merged[0];
}

export function classifyPublicationPulls(pulls: GithubPull[]): {
  kind: PublicationKind;
  pull: GithubPull | undefined;
} {
  return {
    kind: kindFromPulls(pulls),
    pull: pickPullForPublication(pulls),
  };
}

export function kindWithLocalAhead(kind: PublicationKind, ahead: boolean): PublicationKind {
  if (kind === "published" && ahead) {
    return "draft";
  }
  return kind;
}

export function isAheadCount(count: number): boolean {
  return count > 0;
}
