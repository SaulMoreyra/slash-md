import { Dropdown } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconMore } from "../../../../../../components/icons";
import { PublicationMenuAction } from "../../../../enums";

export type PublicationMenuProps = {
  title: string;
  branch: string;
  prUrl?: string;
  busy?: boolean;
  onLeave?: () => void;
  onOpenGithub?: () => void;
  onCopyBranch?: () => void;
  onDiscard?: () => void;
};

export function PublicationMenu({
  title,
  branch,
  prUrl,
  busy = false,
  onLeave,
  onOpenGithub,
  onCopyBranch,
  onDiscard,
}: PublicationMenuProps) {
  const { t } = useTranslation();
  const menuLabel = t("home.publication.menuAria", { title });
  const copyLabel = t("home.publication.copyBranch");

  return (
    <div
      className="shrink-0"
      onPointerDown={(ev) => ev.stopPropagation()}
      onClick={(ev) => ev.stopPropagation()}
    >
      <Dropdown>
        <Dropdown.Trigger
          aria-label={menuLabel}
          isDisabled={busy}
          className="flex size-7 items-center justify-center rounded-md text-muted hover:bg-default/60 hover:text-foreground"
        >
          <IconMore />
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom end">
          <Dropdown.Menu
            aria-label={menuLabel}
            onAction={(key) => {
              if (key === PublicationMenuAction.Leave) {
                onLeave?.();
              }
              if (key === PublicationMenuAction.OpenGithub) {
                onOpenGithub?.();
              }
              if (key === PublicationMenuAction.CopyBranch) {
                onCopyBranch?.();
              }
              if (key === PublicationMenuAction.Discard) {
                onDiscard?.();
              }
            }}
          >
            {onLeave ? (
              <Dropdown.Item id={PublicationMenuAction.Leave} textValue={t("home.publication.leave")}>
                {t("home.publication.leave")}
              </Dropdown.Item>
            ) : null}
            {prUrl && onOpenGithub ? (
              <Dropdown.Item
                id={PublicationMenuAction.OpenGithub}
                textValue={t("home.publication.viewOnGithub")}
              >
                {t("home.publication.viewOnGithub")}
              </Dropdown.Item>
            ) : null}
            {onCopyBranch ? (
              <Dropdown.Item id={PublicationMenuAction.CopyBranch} textValue={`${copyLabel}: ${branch}`}>
                {copyLabel}
              </Dropdown.Item>
            ) : null}
            {onDiscard ? (
              <Dropdown.Item
                id={PublicationMenuAction.Discard}
                textValue={t("home.publication.discard")}
                className="text-danger"
              >
                {t("home.publication.discard")}
              </Dropdown.Item>
            ) : null}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
}
