import { toast } from "@heroui/react";
import type { SlashmdFile } from "@slash-md/core/configTypes";
import { useTranslation } from "react-i18next";
import { AppOperation } from "../../../App/enums";
import type { ModalsApi } from "./useModals";
import type { DiscardPublicationTarget, HomeScreenProps } from "../types";
import { ModalKind } from "../enums";

type CreatePageInput = {
  title: string;
  templateId: string;
  section?: string;
  fileName?: string;
};

const api = () => window.slashmd;

type Args = {
  isWorkspace: boolean;
  canWrite: boolean;
  section: string | undefined;
  publicationPr: number | undefined;
  modals: ModalsApi;
  runOp: HomeScreenProps["runOp"];
  onRefresh: HomeScreenProps["onRefresh"];
  onError: HomeScreenProps["onError"];
  onOpenPage: HomeScreenProps["onOpenPage"];
  onClosePage: HomeScreenProps["onClosePage"];
};

export type HomeActionsApi = ReturnType<typeof useHomeActions>;

export function useHomeActions({
  isWorkspace,
  canWrite,
  section,
  publicationPr,
  modals,
  runOp,
  onRefresh,
  onError,
  onOpenPage,
  onClosePage,
}: Args) {
  const { t } = useTranslation();

  function onRequestPublication() {
    modals.onOpen(ModalKind.Publication);
  }

  function onRequestNewPage() {
    if (isWorkspace && !canWrite) {
      onRequestPublication();
      return;
    }
    modals.onOpen(ModalKind.New);
  }

  function onRequestInit() {
    modals.onOpen(ModalKind.Init);
  }

  function onRequestConfig() {
    modals.onOpen(ModalKind.Config);
  }

  function onRequestSignIn() {
    modals.onOpen(ModalKind.SignIn);
  }

  function onRequestReview() {
    modals.onOpen(ModalKind.Review);
  }

  function onRequestDiscard(target: DiscardPublicationTarget) {
    modals.onOpenDiscard(target);
  }

  function onRequestFolder() {
    modals.onOpen(ModalKind.Folder);
  }

  function onRequestNewFolderIn(parent: string) {
    modals.onOpenFolderModal(parent);
  }

  async function onSignOut() {
    await runOp(AppOperation.SignOut, async () => {
      await api().signOut();
      await onRefresh();
    });
  }

  async function onLeavePublication() {
    const left = await runOp(AppOperation.LeavePublication, async () => {
      await api().leavePublication();
      await onRefresh();
      return true;
    });
    if (left) {
      onClosePage();
    }
  }

  async function onDiscardPublication() {
    const target = modals.discardTarget;
    if (!target) {
      return;
    }
    const discarded = await runOp(AppOperation.DiscardPublication, async () => {
      await api().discardPublication(target.branch);
      await onRefresh();
      return true;
    });
    if (discarded) {
      toast.info(t("home.publication.discarded"));
      modals.onClose();
      if (target.mounted) {
        onClosePage();
      }
    }
  }

  async function onPublishBatch() {
    onError(null);
    await runOp(AppOperation.PublishBatch, async () => {
      await api().publishBatch(publicationPr);
      await onRefresh();
    });
  }

  async function onLandPublication(branch?: string) {
    onError(null);
    const landed = await runOp(AppOperation.LandPublication, async () => {
      await api().landPublication(branch);
      await onRefresh();
      return true;
    });
    if (landed) {
      toast.info(t("home.publication.landed"));
      if (!branch) {
        onClosePage();
      }
    }
  }

  async function onCreatePage(input: CreatePageInput) {
    if (isWorkspace && !canWrite) {
      onRequestPublication();
      return;
    }
    const created = await runOp(AppOperation.CreatePage, async () => {
      const page = await api().newPage(input);
      if (page) {
        await onRefresh();
      }
      return page;
    });
    if (created) {
      modals.onClose();
      onOpenPage(created.path);
    }
  }

  async function onCreateFolder(name: string, parent?: string) {
    const created = await runOp(AppOperation.CreateFolder, async () => {
      await api().newFolder({ name, parent: parent ?? section });
      await onRefresh();
      return true;
    });
    if (created) {
      modals.onClose();
    }
  }

  async function onInitWorkspace(config: SlashmdFile) {
    await runOp(AppOperation.InitWorkspace, async () => {
      await api().initWorkspace(config);
      await onRefresh();
    });
    modals.onClose();
  }

  async function onSaveConfig(config: SlashmdFile) {
    await runOp(AppOperation.SaveConfig, async () => {
      await api().saveConfig(config);
      await onRefresh();
    });
    modals.onClose();
  }

  async function onSignIn(token: string) {
    await runOp(AppOperation.SignIn, async () => {
      await api().signIn(token);
      await onRefresh();
    });
    modals.onClose();
  }

  async function onCreatePublication(title: string) {
    const created = await runOp(AppOperation.CreatePublication, async () => {
      await api().createPublication(title);
      await onRefresh();
      return true;
    });
    if (created) {
      modals.onClose();
    }
  }

  async function onSendReview(reviewers: string, excludePaths?: string[]) {
    const result = await runOp(AppOperation.ReviewBatch, async () => {
      const next = await api().reviewBatch(reviewers, excludePaths);
      if (next) {
        await onRefresh();
      }
      return next;
    });
    if (result) {
      modals.onClose();
      if (result.created) {
        await api().openUrl(result.prUrl);
      }
    }
  }

  return {
    onRequestPublication,
    onRequestNewPage,
    onRequestInit,
    onRequestConfig,
    onRequestSignIn,
    onRequestReview,
    onRequestDiscard,
    onRequestFolder,
    onRequestNewFolderIn,
    onSignOut,
    onLeavePublication,
    onDiscardPublication,
    onPublishBatch,
    onLandPublication,
    onCreatePage,
    onCreateFolder,
    onInitWorkspace,
    onSaveConfig,
    onSignIn,
    onCreatePublication,
    onSendReview,
  };
}
