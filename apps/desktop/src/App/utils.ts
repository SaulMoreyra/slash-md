import { unwrapHostError } from "@slash-md/core/conflictModel";
import { flattenLibrary } from "@slash-md/ui/home/utils/tree";
import type { HomeTreePayload, PagePayload, WorkspaceInfo } from "../../shared/api";
import { AppPhase } from "./enums";

export function resolveAppPhase(workspace: WorkspaceInfo | null): AppPhase {
  if (!workspace) {
    return AppPhase.Loading;
  }
  if (!workspace.root) {
    return AppPhase.Welcome;
  }
  return AppPhase.Workspace;
}

export function pageTrail(page: PagePayload | null, tree: HomeTreePayload | null): string {
  if (!page || !tree) {
    return "";
  }
  return flattenLibrary(tree.roots).find((hit) => hit.path === page.path)?.trail ?? "";
}

export function toErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return unwrapHostError(raw);
}
