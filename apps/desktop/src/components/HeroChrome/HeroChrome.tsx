import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { FrontmatterFields } from "../../../shared/api";
import { CoverMenu } from "./components/CoverMenu";
import { IconPicker } from "./components/IconPicker";
import { useHeroChromeController } from "./hooks/useHeroChromeController";

export type HeroChromeProps = {
  fields: FrontmatterFields;
  imageMap: Record<string, string>;
  onPatch: (patch: Partial<FrontmatterFields>) => Promise<void>;
  onUploadCover: (file: File) => Promise<string>;
  children: React.ReactNode;
};

export function HeroChrome({ fields, imageMap, onPatch, onUploadCover, children }: HeroChromeProps) {
  const { t } = useTranslation();
  const {
    icon,
    color,
    coverSrc,
    position,
    coverMenu,
    picker,
    fileRef,
    hasIcon,
    hasCover,
    onOpenCoverMenu,
    onCloseCoverMenu,
    onOpenPicker,
    onClosePicker,
    onRemoveCover,
    onSelectColor,
    onRequestUpload,
    onSelectIcon,
    onCoverFileChange,
  } = useHeroChromeController({ fields, imageMap, onPatch, onUploadCover });

  return (
    <>
      {hasCover ? (
        <CoverBanner
          color={color}
          coverSrc={coverSrc}
          position={position}
          onOpenCoverMenu={onOpenCoverMenu}
          onRemoveCover={onRemoveCover}
        />
      ) : null}
      <div className="page-inner">
        <div className="page-chrome">
          {!hasIcon ? (
            <Button size="sm" variant="ghost" className="cover-add" onPress={onOpenPicker}>
              {t("hero.addIcon")}
            </Button>
          ) : null}
          {!hasCover ? (
            <div className="cover-add-wrap">
              <Button size="sm" variant="ghost" className="cover-add" onPress={onOpenCoverMenu}>
                {t("hero.addCover")}
              </Button>
            </div>
          ) : null}
        </div>
        {coverMenu ? (
          <CoverMenu onClose={onCloseCoverMenu} onColor={onSelectColor} onUpload={onRequestUpload} />
        ) : null}
        {hasIcon ? (
          <div className="hero-icon-wrap">
            <Button variant="ghost" className="hero-icon" aria-label={t("hero.pageIcon")} onPress={onOpenPicker}>
              {icon}
            </Button>
          </div>
        ) : null}
        {picker ? <IconPicker current={icon} onSelect={onSelectIcon} onClose={onClosePicker} /> : null}
        {children}
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(ev) => void onCoverFileChange(ev)} />
    </>
  );
}

function CoverBanner({
  color,
  coverSrc,
  position,
  onOpenCoverMenu,
  onRemoveCover,
}: {
  color: string | undefined;
  coverSrc: string;
  position: number;
  onOpenCoverMenu: () => void;
  onRemoveCover: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className={color ? "cover is-color" : "cover"} style={color ? { background: color } : undefined}>
      {!color && coverSrc ? (
        <img
          className="cover-img"
          alt=""
          draggable={false}
          src={coverSrc}
          style={{ objectPosition: `50% ${position}%` }}
        />
      ) : null}
      <div className="cover-toolbar">
        <Button size="sm" variant="secondary" className="cover-btn" onPress={onOpenCoverMenu}>
          {t("hero.change")}
        </Button>
        <Button size="sm" variant="secondary" className="cover-btn" onPress={onRemoveCover}>
          {t("hero.remove")}
        </Button>
      </div>
    </div>
  );
}
