import { shortDraftPath } from "@slash-md/ui/home/utils/format";
import { useTranslation } from "react-i18next";
import type { HomeTreePayload } from "../../../../../../shared/api";
import type { Run } from "../../../types";

const api = () => window.slashmd;

type Params = {
  payload: HomeTreePayload;
  personal: boolean;
  pagePath: string | null;
  trails: Map<string, string>;
  run: Run;
  onRefresh: () => Promise<void>;
  onOpenPage: (path: string) => void;
  onClosePage: () => void;
};

export function useDraftPaneController({
  payload,
  personal,
  pagePath,
  trails,
  run,
  onRefresh,
  onOpenPage,
  onClosePage,
}: Params) {
  const { t } = useTranslation();
  const selected = new Set(payload.selected);
  const count = payload.drafts.filter((draft) => selected.has(draft.path)).length;
  const empty = payload.drafts.length === 0;
  const title = personal ? t("home.drafts.localChanges") : t("home.drafts.title");

  function trailFor(path: string) {
    return trails.get(path) || shortDraftPath(path, payload.contentPath);
  }

  async function onToggle(path: string) {
    const next = selected.has(path)
      ? payload.selected.filter((item) => item !== path)
      : [...payload.selected, path];
    await run(() => api().setDraftSelection(next));
    await onRefresh();
  }

  async function onDiscard(path: string, draftTitle: string) {
    if (!window.confirm(t("home.drafts.discardConfirm", { title: draftTitle }))) {
      return;
    }
    const result = await run(() => api().discardDraft(path));
    if (!result) {
      return;
    }
    await onRefresh();
    if (pagePath !== path) {
      return;
    }
    if (result.deleted) {
      onClosePage();
    } else {
      onOpenPage(path);
    }
  }

  return {
    selected,
    count,
    empty,
    title,
    trailFor,
    onToggle,
    onDiscard,
  };
}
