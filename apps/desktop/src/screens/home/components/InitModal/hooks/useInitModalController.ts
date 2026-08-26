import { useEffect, useState } from "react";
import { parseOwnerName } from "@slash-md/core/configTypes";
import { normalizeContentPathInput } from "@slash-md/core/paths";
import type { SlashmdFile, WorkspaceInfo } from "../../../../../../shared/api";
import { RepoMode, toRepoMode } from "../../../enums";

const api = () => window.slashmd;

/** Empty field in the UI means folder root (stored as `"."`). */
function displayContentPath(stored?: string): string {
  if (!stored || stored === ".") {
    return "";
  }
  return stored;
}

type Params = {
  workspace: WorkspaceInfo;
  onSave: (config: SlashmdFile) => void;
};

export function useInitModalController({ workspace, onSave }: Params) {
  const [repo, setRepo] = useState(workspace.slashmd.repo ?? "");
  const [contentPath, setContentPath] = useState(() => displayContentPath(workspace.slashmd.contentPath));
  const [defaultBranch, setDefaultBranch] = useState(workspace.slashmd.defaultBranch ?? "main");
  const [mode, setMode] = useState<RepoMode>(() => toRepoMode(workspace.slashmd.mode));
  const needsRepo = mode !== RepoMode.Local;
  const repoOk = Boolean(parseOwnerName(repo));
  const canSave = needsRepo ? repoOk : true;
  const repoInvalid = Boolean(repo.trim() && !repoOk);

  useEffect(() => {
    void api()
      .detectGit()
      .then((git) => {
        setRepo((current) => current || git.repo || "");
        if (!workspace.slashmd.defaultBranch) {
          setDefaultBranch(git.branch);
        }
        if (!workspace.slashmd.contentPath) {
          setContentPath(git.hasDocsDir ? "docs" : "");
        }
      });
  }, [workspace.slashmd.contentPath, workspace.slashmd.defaultBranch]);

  function onSubmit() {
    if (!canSave) {
      return;
    }
    onSave({
      repo: needsRepo ? repo.trim() : undefined,
      contentPath: normalizeContentPathInput(contentPath),
      defaultBranch: needsRepo ? defaultBranch.trim() || "main" : undefined,
      mode,
    });
  }

  return {
    repo,
    contentPath,
    defaultBranch,
    mode,
    needsRepo,
    canSave,
    repoInvalid,
    onRepoChange: setRepo,
    onContentPathChange: setContentPath,
    onDefaultBranchChange: setDefaultBranch,
    onModeChange: setMode,
    onSubmit,
  };
}
