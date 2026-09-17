import { Avatar, Chip } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { CrepeCanvas } from "../../../../../components/CrepeCanvas";
import { HeroChrome } from "../../../../../components/HeroChrome";
import { PageProperties } from "../../PageProperties";
import { FindInPagePanel } from "../../FindInPagePanel";
import { useEditor } from "../context";

export function Canvas() {
  const { t } = useTranslation();
  const { page, auth, editor, threads, comments, find } = useEditor();
  const canWrite = editor.canWrite;
  const pageClass = [
    "page",
    "mac-scrollbar",
    "min-h-0 flex-1 overflow-auto",
    editor.hasCover ? "has-cover" : "",
    editor.icon ? "has-icon" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={pageClass} id="page">
      {find.open ? (
        <FindInPagePanel
          open={find.open}
          query={find.query}
          active={find.active}
          total={find.total}
          inputRef={find.inputRef}
          onQueryChange={find.onQueryChange}
          onNext={find.onNext}
          onPrev={find.onPrev}
          onClose={find.onClose}
        />
      ) : null}
      <HeroChrome
        fields={page.frontmatter}
        imageMap={editor.imageMap}
        canWrite={canWrite}
        onPatch={editor.onFrontmatterPatch}
        onUploadCover={canWrite ? editor.onCoverUpload : async () => ""}
      >
        <div className="hero">
          <div
            id="hero-title"
            ref={editor.titleRef}
            className={editor.title.trim() ? "hero-title" : "hero-title is-empty"}
            contentEditable={canWrite}
            role="textbox"
            aria-label={t("editor.titleAria")}
            data-placeholder={t("common.untitled")}
            suppressContentEditableWarning
            onInput={(ev) => editor.onTitleChange(ev.currentTarget.textContent ?? "")}
            onBlur={() => void editor.onTitleCommit()}
          />
          <div className="hero-meta">
            <Chip size="sm" variant="soft" className="pill">
              <Chip.Label>{t(`editor.lifecycle.${editor.lifecycle.kind}`)}</Chip.Label>
            </Chip>
            {auth?.login ? (
              <Avatar size="sm" color="default" title={`@${auth.login}`}>
                <Avatar.Fallback>{auth.login.slice(0, 1).toUpperCase()}</Avatar.Fallback>
              </Avatar>
            ) : null}
            <PageProperties
              fields={page.frontmatter}
              canWrite={canWrite}
              onFrontmatterPatch={editor.onFrontmatterPatch}
            />
          </div>
        </div>
        <CrepeCanvas
          docPath={page.path}
          markdown={editor.bodyMarkdown}
          commentsEnabled={editor.commentsOn}
          editable={canWrite}
          threads={threads.threads}
          imageMap={editor.imageMap}
          onMarkdown={editor.onBodyMarkdownChange}
          onUpload={editor.onImageUpload}
          onOpenThread={threads.onThreadOpen}
          onOrphans={threads.onOrphansChange}
          onCommentSelection={comments.onCommentDraftStart}
          onSearchReady={find.onSearchReady}
          reloadKey={editor.reloadEpoch}
        />
      </HeroChrome>
    </div>
  );
}
