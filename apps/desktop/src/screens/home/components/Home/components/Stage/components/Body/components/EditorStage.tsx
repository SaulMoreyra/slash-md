import type { ReactNode } from "react";
import { TabBar } from "../../../../../../TabBar";
import { useHome } from "../../../../../context";
import { Conflict } from "../../Conflict";

type Props = {
  hasPage: boolean;
  merging: boolean;
  children: ReactNode;
};

export function EditorStage({ hasPage, merging, children }: Props) {
  const { tabs } = useHome();
  return (
    <>
      <TabBar
        tabs={tabs.items}
        activeKey={tabs.activeKey}
        onActivateTab={tabs.onActivateTab}
        onCloseTab={tabs.onCloseTab}
      />
      <EditorStageBody hasPage={hasPage} merging={merging}>
        {children}
      </EditorStageBody>
    </>
  );
}

function EditorStageBody({
  hasPage,
  merging,
  children,
}: Props) {
  if (merging) {
    return <Conflict hasPage={hasPage}>{children}</Conflict>;
  }
  return children;
}
