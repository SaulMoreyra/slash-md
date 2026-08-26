import { useEffect, useRef, useState } from "react";
import { joinFrontmatter, splitFrontmatter } from "@slash-md/core/frontmatter";
import { normalizePageIcon } from "@slash-md/core/pageIcon";
import { normalizeMarkdown } from "@slash-md/core/markdown";
import { useTranslation } from "react-i18next";
import type { FrontmatterFields, PagePayload } from "../../../../shared/api";
import { BodyClass, FrontmatterStatus, PageKind, RepoMode, SaveStatus } from "../enums";
import { crumbParts, pageLifecycle } from "../utils";

const api = () => window.slashmd;

type Params = {
  page: PagePayload;
  trail?: string;
  canWrite: boolean;
  onError: (message: string | null) => void;
  onPage: (page: PagePayload) => void;
  run: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
};

export function useFormatter({ page, trail, canWrite, onError, onPage, run }: Params) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(page.frontmatter.title);
  const titleRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<SaveStatus>(SaveStatus.Saved);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [reviewable, setReviewable] = useState(page.reviewable);
  const markdownRef = useRef(page.markdown);
  const frontmatterRawRef = useRef(splitFrontmatter(page.markdown).raw);
  const saveTimer = useRef<number | undefined>(undefined);
  const bodyMarkdown = splitFrontmatter(page.markdown).body;
  const lifecycle = pageLifecycle(page);
  const icon = normalizePageIcon(page.frontmatter.icon);
  const hasCover = Boolean(page.frontmatter.cover.trim());
  const crumbs = crumbParts(trail, title, t("common.untitled"));

  useEffect(() => {
    const classes = [
      BodyClass.WorkflowWorkspace,
      page.pageKind === PageKind.Wiki ? BodyClass.PageWiki : BodyClass.PageEditor,
      page.repoMode === RepoMode.Personal ? BodyClass.RepoPersonal : BodyClass.RepoWorkspace,
    ];
    document.body.classList.add(...classes);
    return () => {
      document.body.classList.remove(...classes);
    };
  }, [page.pageKind, page.repoMode]);

  useEffect(() => {
    setReviewable(page.reviewable);
  }, [page.path, page.reviewable]);

  useEffect(() => {
    markdownRef.current = page.markdown;
    frontmatterRawRef.current = splitFrontmatter(page.markdown).raw;
    setTitle(page.frontmatter.title);
    if (titleRef.current && titleRef.current.textContent !== page.frontmatter.title) {
      titleRef.current.textContent = page.frontmatter.title;
    }
    void api()
      .resolveImages(page.path, page.markdown)
      .then(setImageMap)
      .catch(() => setImageMap({}));
  }, [page.path, page.markdown, page.frontmatter.title]);

  function scheduleSave(markdown: string) {
    if (!canWrite) return;
    markdownRef.current = markdown;
    setStatus(SaveStatus.Saving);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void onFlushSave(markdown);
    }, 300);
  }

  async function onFlushSave(markdown = markdownRef.current): Promise<void> {
    if (!canWrite) return;
    window.clearTimeout(saveTimer.current);
    try {
      const result = await api().savePage(page.path, normalizeMarkdown(markdown));
      void result.savedAt;
      setStatus(SaveStatus.Saved);
      if (page.frontmatter.status.trim().toLowerCase() !== FrontmatterStatus.Published) {
        setReviewable(true);
      }
    } catch (err: unknown) {
      setStatus(SaveStatus.Error);
      onError(err instanceof Error ? err.message : String(err));
    }
  }

  function onBodyMarkdownChange(body: string) {
    if (!canWrite) return;
    const full = joinFrontmatter(frontmatterRawRef.current, body);
    scheduleSave(full);
  }

  function onTitleChange(value: string) {
    setTitle(value);
  }

  async function onTitleCommit() {
    const next = title.trim();
    await onFrontmatterPatch({ title: next });
  }

  async function onFrontmatterPatch(patch: Partial<FrontmatterFields>) {
    if (!canWrite) return;
    const result = await run(() => api().patchFrontmatter(page.path, patch));
    if (!result) {
      return;
    }
    const { fields, raw } = splitFrontmatter(result.markdown);
    frontmatterRawRef.current = raw;
    markdownRef.current = result.markdown;
    onPage({ ...page, markdown: result.markdown, frontmatter: { ...page.frontmatter, ...fields } });
  }

  async function uploadImage(file: File): Promise<string> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const uploaded = await api().uploadImage(page.path, file.name, bytes);
    setImageMap((prev) => ({ ...prev, [uploaded.src]: uploaded.dataUrl }));
    return uploaded.src;
  }

  return {
    title,
    titleRef,
    status,
    imageMap,
    reviewable,
    lifecycle,
    icon,
    hasCover,
    crumbs,
    bodyMarkdown,
    canWrite,
    onTitleChange,
    onTitleCommit,
    onBodyMarkdownChange,
    onFlushSave,
    onFrontmatterPatch,
    onCoverUpload: uploadImage,
    onImageUpload: uploadImage,
    getMarkdown: () => markdownRef.current,
  };
}

export type FormatterApi = ReturnType<typeof useFormatter>;
