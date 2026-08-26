import { ScrollShadow } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { useHomeOptional } from "../../../home/components/Home/context";
import { useEditor } from "../Editor/context";

export function WikiPeek() {
  const { t } = useTranslation();
  const home = useHomeOptional();
  const { page } = useEditor();
  const selected = home?.conflicts.selected;
  const resolving = Boolean(home?.conflicts.editing) && selected?.path === page.path;
  const markdown = selected?.theirsMarkdown?.trim();

  if (!resolving) {
    return null;
  }

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-l border-separator bg-background">
      <p className="px-3 py-2 text-[11px] font-medium text-muted">{t("editor.conflicts.wikiPeek")}</p>
      <ScrollShadow className="min-h-0 flex-1 px-3 pb-3 [--scroll-shadow-scrollbar-size:0px]">
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted">
          {markdown || t("home.conflicts.incomingEmpty")}
        </p>
      </ScrollShadow>
    </aside>
  );
}
