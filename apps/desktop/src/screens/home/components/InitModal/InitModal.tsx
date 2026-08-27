import { Button, Modal as HeroModal } from "@heroui/react";
import { HardDrive, GitBranch, GitPullRequest, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SlashmdFile, WorkspaceInfo } from "../../../../../shared/api";
import { InitModalVariant, RepoMode } from "../../enums";
import { ModeCard } from "./components/ModeCard";
import { useInitModalController } from "./hooks/useInitModalController";

const fieldClass =
  "w-full rounded-xl border-0 bg-default/50 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted/50 focus:bg-default/70 focus:ring-2 focus:ring-accent/40";

type Props = {
  workspace: WorkspaceInfo;
  variant?: InitModalVariant;
  onClose: () => void;
  onSave: (config: SlashmdFile) => void;
};

export function InitModal({ workspace, variant = InitModalVariant.Init, onClose, onSave }: Props) {
  const { t } = useTranslation();
  const c = useInitModalController({ workspace, onSave });
  const heading =
    variant === InitModalVariant.Settings ? t("home.modals.init.titleSettings") : t("home.modals.init.title");

  return (
    <HeroModal.Backdrop
      isOpen
      isDismissable
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <HeroModal.Container size="lg">
        <HeroModal.Dialog className="bg-surface">
          <HeroModal.CloseTrigger />
          <HeroModal.Header className="sr-only">
            <HeroModal.Heading>{heading}</HeroModal.Heading>
          </HeroModal.Header>
          <HeroModal.Body className="flex flex-col gap-8 px-8 py-10">
            <div>
              <p className="text-3xl font-semibold tracking-tight text-foreground">{heading}</p>
              <p className="mt-2 text-sm text-muted">{t("home.modals.init.lede")}</p>
            </div>

            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
                {t("home.modals.init.mode")}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <ModeCard
                  selected={c.mode === RepoMode.Local}
                  icon={<HardDrive size={20} strokeWidth={1.75} />}
                  title={t("home.modals.init.modeLocalTitle")}
                  body={t("home.modals.init.modeLocalBody")}
                  onSelect={() => c.onModeChange(RepoMode.Local)}
                />
                <ModeCard
                  selected={c.mode === RepoMode.Workspace}
                  icon={<GitPullRequest size={20} strokeWidth={1.75} />}
                  title={t("home.modals.init.modeWorkspaceTitle")}
                  body={t("home.modals.init.modeWorkspaceBody")}
                  onSelect={() => c.onModeChange(RepoMode.Workspace)}
                />
                <ModeCard
                  selected={c.mode === RepoMode.Personal}
                  icon={<User size={20} strokeWidth={1.75} />}
                  title={t("home.modals.init.modePersonalTitle")}
                  body={t("home.modals.init.modePersonalBody")}
                  onSelect={() => c.onModeChange(RepoMode.Personal)}
                />
              </div>
            </div>

            {c.needsRepo ? (
              <div>
                <input
                  className="w-full bg-transparent text-2xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted/40"
                  value={c.repo}
                  placeholder={t("home.modals.init.repoPlaceholder")}
                  aria-label={t("home.modals.init.repo")}
                  autoFocus
                  onChange={(ev) => c.onRepoChange(ev.target.value)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter") {
                      ev.preventDefault();
                      c.onSubmit();
                    }
                  }}
                />
                <p className="mt-2 text-sm text-muted">{t("home.modals.init.repoHint")}</p>
                {c.repoInvalid ? (
                  <p className="mt-1 text-sm text-danger">{t("home.modals.init.repoInvalid")}</p>
                ) : null}
              </div>
            ) : null}

            <div className={["grid gap-4", c.needsRepo ? "sm:grid-cols-2" : ""].join(" ")}>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">{t("home.modals.init.contentPath")}</span>
                <input
                  className={fieldClass}
                  value={c.contentPath}
                  placeholder={t("home.modals.init.contentPathPlaceholder")}
                  aria-label={t("home.modals.init.contentPath")}
                  autoFocus={!c.needsRepo}
                  onChange={(ev) => c.onContentPathChange(ev.target.value)}
                />
                <span className="text-xs text-muted">{t("home.modals.init.contentPathHint")}</span>
              </label>
              {c.needsRepo ? (
                <label className="flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
                    <GitBranch size={12} strokeWidth={2} aria-hidden />
                    {t("home.modals.init.defaultBranch")}
                  </span>
                  <input
                    className={fieldClass}
                    value={c.defaultBranch}
                    placeholder="main"
                    aria-label={t("home.modals.init.defaultBranch")}
                    onChange={(ev) => c.onDefaultBranchChange(ev.target.value)}
                  />
                </label>
              ) : null}
            </div>

            {c.needsRepo ? (
              <label className="flex flex-col gap-1.5">
                <span className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={c.siteEnabled}
                    aria-label={t("home.modals.init.siteTitle")}
                    onChange={(ev) => c.onSiteEnabledChange(ev.target.checked)}
                  />
                  {t("home.modals.init.siteTitle")}
                </span>
                <span className="text-xs text-muted">{t("home.modals.init.siteBody")}</span>
                <span className="text-xs text-muted">{t("home.modals.init.siteHint")}</span>
              </label>
            ) : null}

            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onPress={onClose}>
                {t("common.cancel")}
              </Button>
              <Button variant="primary" isDisabled={!c.canSave} onPress={c.onSubmit}>
                {variant === InitModalVariant.Settings ? t("home.modals.init.saveSettings") : t("home.modals.init.save")}
              </Button>
            </div>
          </HeroModal.Body>
        </HeroModal.Dialog>
      </HeroModal.Container>
    </HeroModal.Backdrop>
  );
}
