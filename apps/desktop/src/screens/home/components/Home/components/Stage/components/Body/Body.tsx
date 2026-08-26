import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { CreateIntent } from "../../../../../../enums";
import { EditorBlank } from "../../../../../EditorBlank";
import { Empty } from "../../../../../Empty";
import { SectionCanvas } from "../../../../../SectionCanvas";
import { useHome } from "../../../../context";
import { Conflict } from "../Conflict";
import { Loading } from "../Loading";

type Props = {
  needsInit: boolean;
  loading: boolean;
  hasPage: boolean;
  openingCover: boolean;
  showSectionCanvas: boolean;
  folderTitle: string | undefined;
  section: string | undefined;
  createIntent: CreateIntent;
  busy: boolean;
  onInit: () => void;
  onCreatePage: (input: { title: string; templateId: string; section?: string }) => void;
  onWriteCover: () => void;
  onNewPage: () => void;
  children: ReactNode;
};

export function Body(props: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col animate-fade-in motion-reduce:animate-none">
      <BodyInner {...props} />
    </div>
  );
}

function BodyInner({
  needsInit,
  loading,
  hasPage,
  openingCover,
  showSectionCanvas,
  folderTitle,
  section,
  createIntent,
  busy,
  onInit,
  onCreatePage,
  onWriteCover,
  onNewPage,
  children,
}: Props) {
  const { t } = useTranslation();
  const { conflicts } = useHome();

  if (needsInit) {
    return (
      <Empty
        title={t("home.connectTitle")}
        body={t("home.connectBody")}
        action={t("home.init")}
        onClick={onInit}
      />
    );
  }

  if (loading || openingCover) {
    return <Loading />;
  }

  if (conflicts.merging) {
    return <Conflict hasPage={hasPage}>{children}</Conflict>;
  }

  if (hasPage) {
    return children;
  }

  if (showSectionCanvas) {
    return (
      <SectionCanvas
        title={folderTitle ?? section ?? ""}
        createIntent={createIntent}
        onWriteCover={onWriteCover}
        onNewPage={onNewPage}
      />
    );
  }

  return (
    <EditorBlank section={section} createIntent={createIntent} busy={busy} onCreate={onCreatePage} />
  );
}
