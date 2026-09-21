import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { NavKind, type CreateIntent } from "../../../../../../enums";
import { EditorBlank } from "../../../../../EditorBlank";
import { Empty } from "../../../../../Empty";
import { useHome } from "../../../../context";
import { EditorStage } from "./components/EditorStage";
import { Loading } from "../Loading";
import { ChatPane } from "../../../../../../../agent-chat/components/ChatPane";

type Props = {
  needsInit: boolean;
  loading: boolean;
  hasPage: boolean;
  section: string | undefined;
  createIntent: CreateIntent;
  busy: boolean;
  showProcessGuide?: boolean;
  onInit: () => void;
  onCreatePage: (input: { title: string; templateId: string; section?: string }) => void;
  onRequestPublication?: () => void;
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
  section,
  createIntent,
  busy,
  showProcessGuide = false,
  onInit,
  onCreatePage,
  onRequestPublication,
  children,
}: Props) {
  const { t } = useTranslation();
  const { conflicts, nav } = useHome();

  if (nav.view.kind === NavKind.AgentChat) {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-1 pb-1">
        <ChatPane />
      </div>
    );
  }

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

  if (loading) {
    return <Loading />;
  }

  if (conflicts.merging || hasPage) {
    return (
      <EditorStage hasPage={hasPage} merging={conflicts.merging}>
        {children}
      </EditorStage>
    );
  }

  return (
    <EditorBlank
      section={section}
      createIntent={createIntent}
      busy={busy}
      showProcessGuide={showProcessGuide}
      onCreate={onCreatePage}
      onNewPublication={onRequestPublication}
    />
  );
}
