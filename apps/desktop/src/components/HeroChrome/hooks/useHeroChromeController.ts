import { useRef, useState } from "react";
import { normalizePageIcon } from "@slash-md/core/pageIcon";
import type { FrontmatterFields } from "../../../../shared/api";
import { coverColorHex, parsePosition } from "@slash-md/ui/editor/hero/coverModel";

type Params = {
  fields: FrontmatterFields;
  imageMap: Record<string, string>;
  canWrite: boolean;
  onPatch: (patch: Partial<FrontmatterFields>) => Promise<void>;
  onUploadCover: (file: File) => Promise<string>;
};

export function useHeroChromeController({ fields, imageMap, canWrite, onPatch, onUploadCover }: Params) {
  const icon = normalizePageIcon(fields.icon);
  const cover = fields.cover.trim();
  const color = coverColorHex(cover);
  const coverSrc = !cover || color ? "" : imageMap[cover] ?? imageMap[cover.replace(/^\.\//, "")] ?? cover;
  const position = parsePosition(fields.coverPosition);
  const [coverMenu, setCoverMenu] = useState(false);
  const [picker, setPicker] = useState(false);
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hasIcon = Boolean(icon);
  const hasCover = Boolean(cover);

  return {
    icon,
    cover,
    color,
    coverSrc,
    position,
    coverMenu,
    picker,
    pickerAnchor,
    fileRef,
    hasIcon,
    hasCover,
    showCoverToolbar: canWrite && hasCover,
    showAddIcon: canWrite && !hasIcon,
    showAddCover: canWrite && !hasCover,
    iconEditable: canWrite && hasIcon,
    onOpenCoverMenu: () => setCoverMenu((open) => !open),
    onCloseCoverMenu: () => setCoverMenu(false),
    onOpenPicker: (anchor: HTMLElement | null) => {
      setPickerAnchor(anchor);
      setPicker(true);
    },
    onClosePicker: () => setPicker(false),
    onRemoveCover: () => void onPatch({ cover: "", coverPosition: "" }),
    onSelectColor: (hex: string) => {
      void onPatch({ cover: `color:${hex}`, coverPosition: "" });
      setCoverMenu(false);
    },
    onRequestUpload: () => {
      setCoverMenu(false);
      fileRef.current?.click();
    },
    onSelectIcon: (next: string) => {
      void onPatch({ icon: next });
      setPicker(false);
    },
    onCoverFileChange: async (ev: React.ChangeEvent<HTMLInputElement>) => {
      const file = ev.target.files?.[0];
      ev.target.value = "";
      if (!file) {
        return;
      }
      const src = await onUploadCover(file);
      await onPatch({ cover: src, coverPosition: "50" });
    },
  };
}
