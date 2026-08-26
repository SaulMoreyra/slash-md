import type { ConflictFile, ConflictFileKind } from "@slash-md/core/homeTypes";
import { ConflictRowStatus } from "../../enums";

export const CONFLICT_KIND_LABEL: Record<ConflictFileKind, string> = {
  edit: "home.conflicts.kindEdit",
  binary: "home.conflicts.kindBinary",
  deleted_on_wiki: "home.conflicts.kindDeletedWiki",
  deleted_on_publication: "home.conflicts.kindDeletedPub",
};

export function conflictKindChipColor(kind: ConflictFileKind): "accent" | "warning" | "default" {
  if (kind === "edit") {
    return "accent";
  }
  if (kind === "binary") {
    return "default";
  }
  return "warning";
}

export function conflictRowStatus(file: ConflictFile, decided: boolean): ConflictRowStatus {
  if (decided) {
    return ConflictRowStatus.Decided;
  }
  if (file.kind === "binary") {
    return ConflictRowStatus.PickOne;
  }
  if (file.kind === "deleted_on_wiki") {
    return ConflictRowStatus.DeletedWiki;
  }
  if (file.kind === "deleted_on_publication") {
    return ConflictRowStatus.DeletedPub;
  }
  return ConflictRowStatus.NeedsChoice;
}

export const CONFLICT_ROW_STATUS_LABEL: Record<ConflictRowStatus, string> = {
  [ConflictRowStatus.NeedsChoice]: "home.conflicts.statusNeedsChoice",
  [ConflictRowStatus.Decided]: "home.conflicts.statusDecided",
  [ConflictRowStatus.PickOne]: "home.conflicts.statusPickOne",
  [ConflictRowStatus.DeletedWiki]: "home.conflicts.statusDeletedWiki",
  [ConflictRowStatus.DeletedPub]: "home.conflicts.statusDeletedPub",
};

export type ConflictListEntry = {
  file: ConflictFile;
  decided: boolean;
};
