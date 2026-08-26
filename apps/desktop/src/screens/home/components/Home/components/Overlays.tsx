import { ReviewModal } from "../../../../../components/ReviewModal";
import { SearchPalette } from "../../../../../components/SearchPalette";
import { InitModalVariant, ConflictConfirmKind, ModalKind, TreeEntryKind } from "../../../enums";
import { isPublishReady, publishLockCopy } from "../../../utils";
import { FolderModal } from "../../FolderModal";
import { InitModal } from "../../InitModal";
import { NewPageModal } from "../../NewPageModal";
import { NewPublicationModal } from "../../NewPublicationModal";
import { RenameModal } from "../../RenameModal";
import { ConfirmDeleteModal } from "../../ConfirmDeleteModal";
import { ConflictConfirmModal } from "../../ConflictConfirmModal";
import { SignInModal } from "../../SignInModal";
import { useHome } from "../context";
import { useTranslation } from "react-i18next";

export function Overlays() {
  const { t } = useTranslation();
  const home = useHome();
  const { modals, nav, search, library, workspace, actions, treeActions, conflicts, onOpenPage, busy } = home;
  const payload = library.payload;
  const wikiSyncStatus = payload?.wikiSyncStatus ?? conflicts.status ?? "idle";
  const blocked = wikiSyncStatus === "conflicting" || wikiSyncStatus === "merging";
  const showPublish = Boolean(payload?.canPublishBatch) && !blocked;
  const reviewHub = payload?.publication
    ? {
        showPublish,
        publishReady: isPublishReady(payload.loteReview),
        publishHint: showPublish ? publishLockCopy(payload.loteReview, t) : null,
        showLeave: wikiSyncStatus !== "merging",
        busy,
        onPublish: () => {
          modals.onClose();
          void actions.onPublishBatch();
        },
        onLeave: () => {
          modals.onClose();
          void actions.onLeavePublication();
        },
      }
    : undefined;

  return (
    <>
      {modals.kind === ModalKind.New ? (
        <NewPageModal
          section={nav.section}
          createIntent={nav.createIntent}
          busy={busy}
          onClose={modals.onClose}
          onCreate={(input) => void actions.onCreatePage(input)}
        />
      ) : null}
      {modals.kind === ModalKind.Folder ? (
        <FolderModal
          parent={nav.section}
          busy={busy}
          onClose={modals.onClose}
          onCreate={(name) => void actions.onCreateFolder(name)}
        />
      ) : null}
      {modals.kind === ModalKind.Rename && modals.target ? (
        <RenameModal
          target={modals.target}
          busy={busy}
          onClose={modals.onClose}
          onSave={(name) => void treeActions.onRename(name)}
        />
      ) : null}
      {modals.kind === ModalKind.Delete && modals.target ? (
        <ConfirmDeleteModal
          target={modals.target}
          busy={busy}
          onClose={modals.onClose}
          onConfirm={() => void treeActions.onDelete()}
        />
      ) : null}
      {modals.kind === ModalKind.Init ? (
        <InitModal
          workspace={workspace}
          variant={InitModalVariant.Init}
          onClose={modals.onClose}
          onSave={(config) => void actions.onInitWorkspace(config)}
        />
      ) : null}
      {modals.kind === ModalKind.Config ? (
        <InitModal
          workspace={workspace}
          variant={InitModalVariant.Settings}
          onClose={modals.onClose}
          onSave={(config) => void actions.onSaveConfig(config)}
        />
      ) : null}
      {modals.kind === ModalKind.SignIn ? (
        <SignInModal
          onClose={modals.onClose}
          onSave={(token) => void actions.onSignIn(token ?? "")}
        />
      ) : null}
      {modals.kind === ModalKind.Review ? (
        <ReviewModal
          onClose={modals.onClose}
          onSend={(reviewers, excludePaths) => void actions.onSendReview(reviewers, excludePaths)}
          hub={reviewHub}
        />
      ) : null}
      {modals.kind === ModalKind.Publication ? (
        <NewPublicationModal
          busy={busy}
          onClose={modals.onClose}
          onCreate={(title) => void actions.onCreatePublication(title)}
        />
      ) : null}
      {conflicts.confirm !== ConflictConfirmKind.None ? <ConflictConfirmModal /> : null}
      {search.open && !library.payload?.needsInit ? (
        <SearchPalette
          query={search.query}
          hits={search.hits}
          onQuery={search.onQueryChange}
          onClose={search.onClose}
          onOpenFile={(path) => {
            nav.onReveal(path, TreeEntryKind.File);
            search.onClose();
            onOpenPage(path);
          }}
          onOpenFolder={(path, folderTitle) => {
            search.onClose();
            nav.onOpenFolder({ kind: "folder", path, title: folderTitle });
          }}
        />
      ) : null}
    </>
  );
}
