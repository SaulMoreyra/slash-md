import { toast } from "@heroui/react";
import { shortDraftPath } from "@slash-md/ui/home/utils/format";
import { useTranslation } from "react-i18next";
import type { HomeTreePayload } from "../../../../../../shared/api";
import { AppOperation } from "../../../../../App/enums";
import type { RunOp } from "../../../types";

const api = () => window.slashmd;

type Params = {
  payload: HomeTreePayload;
  personal: boolean;
  pagePath: string | null;
  trails: Map<string, string>;
  runOp: RunOp;
  onRefresh: () => Promise<void>;
  onOpenPage: (path: string) => void;
  onClosePage: () => void;
};

export function useDraftPaneController({
  payload,
  personal,
  pagePath,
  trails,
  runOp,
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
    await runOp(AppOperation.SetDraftSelection, async () => {
      await api().setDraftSelection(next);
      await onRefresh();
    });
  }

  async function onDiscard(path: string, draftTitle: string) {
    if (!window.confirm(t("home.drafts.discardConfirm", { title: draftTitle }))) {
      return;
    }
    const result = await runOp(AppOperation.DiscardDraft, async () => {
      const discarded = await api().discardDraft(path);
      if (!discarded) {
        return undefined;
      }
      await onRefresh();
      return discarded;
    });
    if (!result) {
      return;
    }
    if (pagePath !== path) {
      return;
    }
    if (result.deleted) {
      onClosePage();
    } else {
      onOpenPage(path);
    }
  }

  async function onPublish() {
    const paths = payload.drafts.map((draft) => draft.path);
    if (paths.length === 0) {
      return;
    }
    const published = await runOp(AppOperation.PublishPersonal, async () => {
      await api().publishPersonal(paths);
      await onRefresh();
      return true;
    });
    if (!published) {
      return;
    }
    toast.info(t("home.drafts.published"));
    if (!pagePath) {
      return;
    }
    const current = payload.drafts.find((draft) => draft.path === pagePath);
    if (!current) {
      return;
    }
    if (current.badge === "eliminado") {
      onClosePage();
      return;
    }
    onOpenPage(pagePath);
  }

  return {
    selected,
    count,
    empty,
    title,
    trailFor,
    onToggle,
    onDiscard,
    onPublish,
  };
}
