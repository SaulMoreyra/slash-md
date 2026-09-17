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
  const { tabs, conflicts } = useHome();
  const overlay = merging && !conflicts.editing;
  return (
    <>
      <TabBar
        tabs={tabs.items}
        activeKey={tabs.activeKey}
        onActivateTab={tabs.onActivateTab}
        onCloseTab={tabs.onCloseTab}
      />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className={overlay ? "hidden" : "flex min-h-0 flex-1 flex-col"}>{children}</div>
        {overlay ? (
          <div className="absolute inset-0 flex min-h-0 flex-col">
            <Conflict hasPage={hasPage}>{children}</Conflict>
          </div>
        ) : null}
      </div>
    </>
  );
}