import { useTranslation } from "react-i18next";
import { IconPanel } from "../../../../../components/icons";
import { shortcutLabel } from "../../../../../components/ShortcutKbd";
import { PaneCloseButton } from "../../PaneCloseButton";
import { WorkspaceSwitch } from "../../WorkspaceSwitch";
import { RailBrand } from "./RailBrand";

type Props = {
  title: string;
  subtitle?: string;
  onChangeFolder: () => void;
  onCloseWorkspace: () => void;
  onConfig: () => void;
  onCloseRail: () => void;
};

export function RailHeader({
  title,
  subtitle,
  onChangeFolder,
  onCloseWorkspace,
  onConfig,
  onCloseRail,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-1 px-1 pt-1">
      <RailBrand />
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <WorkspaceSwitch
            title={title}
            subtitle={subtitle}
            onChangeFolder={onChangeFolder}
            onCloseWorkspace={onCloseWorkspace}
            onConfig={onConfig}
          />
        </div>
        <PaneCloseButton
          label={t("home.rail.close")}
          keys={shortcutLabel.toggleRail()}
          onPress={onCloseRail}
        >
          <IconPanel />
        </PaneCloseButton>
      </div>
    </div>
  );
}
