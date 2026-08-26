import { useEffect } from "react";
import { Button, ColorSwatch } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { COVER_COLORS } from "@slash-md/ui/editor/hero/coverModel";

type Props = {
  onClose: () => void;
  onColor: (hex: string) => void;
  onUpload: () => void;
};

export function CoverMenu({ onClose, onColor, onUpload }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    const onDoc = (ev: MouseEvent) => {
      if (!(ev.target instanceof Node)) {
        return;
      }
      const menu = document.getElementById("cover-menu");
      if (menu && !menu.contains(ev.target)) {
        onClose();
      }
    };
    window.addEventListener("mousedown", onDoc);
    return () => window.removeEventListener("mousedown", onDoc);
  }, [onClose]);

  return (
    <div id="cover-menu" className="cover-menu cover-menu-floating" role="dialog" aria-label={t("hero.cover")}>
      <Button variant="secondary" className="cover-menu-upload" fullWidth onPress={onUpload}>
        {t("hero.uploadImage")}
      </Button>
      <p className="cover-menu-label">{t("hero.color")}</p>
      <CoverSwatchList onColor={onColor} />
    </div>
  );
}

function CoverSwatchList({ onColor }: { onColor: (hex: string) => void }) {
  return (
    <div className="cover-swatches">
      {COVER_COLORS.map((swatch) => (
        <button
          key={swatch.hex}
          type="button"
          className="cover-swatch"
          title={swatch.label}
          aria-label={swatch.label}
          onClick={() => onColor(swatch.hex)}
        >
          <ColorSwatch color={swatch.hex} size="sm" aria-label={swatch.label} />
        </button>
      ))}
    </div>
  );
}
