import { useRef } from "react";
import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { FrontmatterFields } from "../../../shared/api";
import { IconImage, IconTrash } from "../icons";
import { CoverMenu } from "./components/CoverMenu";
import { IconPicker } from "./components/IconPicker";
import { useHeroChromeController } from "./hooks/useHeroChromeController";

export type HeroChromeProps = {
  fields: FrontmatterFields;
  imageMap: Record<string, string>;
  canWrite?: boolean;
  onPatch: (patch: Partial<FrontmatterFields>) => Promise<void>;
  onUploadCover: (file: File) => Promise<string>;
  children: React.ReactNode;
};

export function HeroChrome({
  fields,
  imageMap,
  canWrite = true,
  onPatch,
  onUploadCover,
  children,
}: HeroChromeProps) {
  const { t } = useTranslation();
  const {
    icon,
    color,
    coverSrc,
    position,
    coverMenu,
    picker,
    pickerAnchor,
    fileRef,
    hasIcon,
    hasCover,
    showCoverToolbar,
    showAddIcon,
    showAddCover,
    iconEditable,
    onOpenCoverMenu,
    onCloseCoverMenu,
    onOpenPicker,
    onClosePicker,
    onRemoveCover,
    onSelectColor,
    onRequestUpload,
    onSelectIcon,
    onCoverFileChange,
  } = useHeroChromeController({ fields, imageMap, canWrite, onPatch, onUploadCover });
  const addIconRef = useRef<HTMLButtonElement>(null);
  const heroIconRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      {hasCover ? (
        <CoverBanner color={color} coverSrc={coverSrc} position={position}>
          {showCoverToolbar ? (
            <CoverToolbar onChange={onOpenCoverMenu} onRemove={onRemoveCover} />
          ) : null}
        </CoverBanner>
      ) : null}
      <div className="page-inner">
        <div className="page-chrome">
          {showAddIcon ? (
            <Button size="sm" variant="ghost" className="cover-add" ref={addIconRef} onPress={() => onOpenPicker(addIconRef.current)}>
              {t("hero.addIcon")}
            </Button>
          ) : null}
          {showAddCover ? (
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
            {iconEditable ? (
              <Button variant="ghost" className="hero-icon" ref={heroIconRef} aria-label={t("hero.pageIcon")} onPress={() => onOpenPicker(heroIconRef.current)}>
                {icon}
              </Button>
            ) : (
              <span className="hero-icon">{icon}</span>
            )}
          </div>
        ) : null}
        {picker ? <IconPicker current={icon} anchor={pickerAnchor} onSelect={onSelectIcon} onClose={onClosePicker} /> : null}
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
  children,
}: {
  color: string | undefined;
  coverSrc: string;
  position: number;
  children?: React.ReactNode;
}) {
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
      {children}
    </div>
  );
}

function CoverToolbar({ onChange, onRemove }: { onChange: () => void; onRemove: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="cover-toolbar">
      <Button
        isIconOnly
        size="sm"
        variant="secondary"
        className="cover-btn"
        aria-label={t("hero.change")}
        onPress={onChange}
      >
        <IconImage />
      </Button>
      <Button
        isIconOnly
        size="sm"
        variant="secondary"
        className="cover-btn"
        aria-label={t("hero.remove")}
        onPress={onRemove}
      >
        <IconTrash />
      </Button>
    </div>
  );
}
