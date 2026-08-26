import type { SlashmdFile } from "@slash-md/core/configTypes";
import { posixBasename } from "@slash-md/core/paths";
import type { ModalsApi } from "./useModals";
import type { HomeScreenProps } from "../types";
import { FolderCoverFileName, ModalKind } from "../enums";

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
  run: HomeScreenProps["run"];
  onRefresh: HomeScreenProps["onRefresh"];
  onError: HomeScreenProps["onError"];
  onOpenPage: HomeScreenProps["onOpenPage"];
};

export type HomeActionsApi = ReturnType<typeof useHomeActions>;

export function useHomeActions({
  isWorkspace,
  canWrite,
  section,
  publicationPr,
  modals,
  run,
  onRefresh,
  onError,
  onOpenPage,
}: Args) {
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

  function onRequestFolder() {
    modals.onOpen(ModalKind.Folder);
  }

  async function onSignOut() {
    await run(() => api().signOut());
    await onRefresh();
  }

  async function onLeavePublication() {
    await run(() => api().leavePublication());
    await onRefresh();
  }

  async function onPublishBatch() {
    onError(null);
    await run(() => api().publishBatch(publicationPr));
    await onRefresh();
  }

  async function onCreatePage(input: CreatePageInput) {
    if (isWorkspace && !canWrite) {
      onRequestPublication();
      return;
    }
    const created = await run(async () => {
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

  async function onCreateCover(input: { title: string; section: string }) {
    await onCreatePage({
      title: input.title,
      templateId: "blank",
      section: input.section,
      fileName: FolderCoverFileName,
    });
  }

  function onRequestWriteCover() {
    if (!section) {
      return;
    }
    void onCreateCover({ title: posixBasename(section) || section, section });
  }

  async function onCreateFolder(name: string) {
    const created = await run(async () => {
      await api().newFolder({ name, parent: section });
      await onRefresh();
      return true;
    });
    if (created) {
      modals.onClose();
    }
  }

  async function onInitWorkspace(config: SlashmdFile) {
    await run(() => api().initWorkspace(config));
    modals.onClose();
    await onRefresh();
  }

  async function onSaveConfig(config: SlashmdFile) {
    await run(() => api().saveConfig(config));
    modals.onClose();
    await onRefresh();
  }

  async function onSignIn(token: string) {
    await run(() => api().signIn(token));
    modals.onClose();
    await onRefresh();
  }

  async function onCreatePublication(title: string) {
    const created = await run(async () => {
      await api().createPublication(title);
      await onRefresh();
      return true;
    });
    if (created) {
      modals.onClose();
    }
  }

  async function onSendReview(reviewers: string, excludePaths?: string[]) {
    const result = await run(() => api().reviewBatch(reviewers, excludePaths));
    if (result) {
      modals.onClose();
      await onRefresh();
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
    onRequestFolder,
    onSignOut,
    onLeavePublication,
    onPublishBatch,
    onCreatePage,
    onCreateCover,
    onRequestWriteCover,
    onCreateFolder,
    onInitWorkspace,
    onSaveConfig,
    onSignIn,
    onCreatePublication,
    onSendReview,
  };
}
