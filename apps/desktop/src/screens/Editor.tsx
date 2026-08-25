import { useCallback, useEffect, useRef, useState } from "react";
import { splitFrontmatter } from "@slash-md/core/frontmatter";
import { normalizePageIcon } from "@slash-md/core/pageIcon";
import { reviewThreadTarget } from "@slash-md/core/threadGate";
import { normalizeMarkdown } from "@slash-md/core/markdown";
import type { AuthInfo, FrontmatterFields, PagePayload, ReviewThread } from "../../shared/api";
import { CrepeCanvas } from "../components/CrepeCanvas";
import { HeroChrome } from "../components/HeroChrome";
import { IconChat, IconChevron, IconHistory, IconMore, IconPage } from "../components/icons";
import { Modal } from "../components/Modal";
import { ReviewModal } from "../components/ReviewModal";
import { ThreadPopover } from "../components/ThreadPopover";

const api = () => window.slashmd;

type Props = {
  page: PagePayload;
  busy: boolean;
  focusThreadId?: string | null;
  trail?: string;
  auth: AuthInfo;
  onError: (message: string | null) => void;
  onPage: (page: PagePayload) => void;
  run: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
};

export function EditorScreen({
  page,
  busy,
  focusThreadId,
  trail,
  auth,
  onError,
  onPage,
  run,
}: Props) {
  const [title, setTitle] = useState(page.frontmatter.title);
  const titleRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const [threads, setThreads] = useState<ReviewThread[]>([]);
  const [orphans, setOrphans] = useState<ReviewThread[]>([]);
  const [openThread, setOpenThread] = useState<ReviewThread | null>(null);
  const [canWrite, setCanWrite] = useState(false);
  const [prUrl, setPrUrl] = useState<string | null>(page.prUrl);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [commentDraft, setCommentDraft] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewable, setReviewable] = useState(page.reviewable);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const markdownRef = useRef(page.markdown);
  const saveTimer = useRef<number | undefined>(undefined);
  const commentsOn = Boolean(reviewThreadTarget({ markdown: page.markdown, fileRemotePath: page.path }));
  const lifecycle = pageLifecycle(page);
  const icon = normalizePageIcon(page.frontmatter.icon);
  const hasCover = Boolean(page.frontmatter.cover.trim());
  const crumbs = crumbParts(trail, title);

  const refreshThreads = useCallback(async () => {
    const loaded = await api().loadThreads(page.path);
    setThreads(loaded.threads);
    setCanWrite(loaded.canWrite);
    setPrUrl(loaded.prUrl || page.prUrl);
    return loaded.threads;
  }, [page.path, page.prUrl]);

  useEffect(() => {
    const classes = [
      "workflow-workspace",
      page.pageKind === "wiki" ? "page-wiki" : "page-editor",
      page.repoMode === "personal" ? "repo-personal" : "repo-workspace",
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
    setTitle(page.frontmatter.title);
    if (titleRef.current && titleRef.current.textContent !== page.frontmatter.title) {
      titleRef.current.textContent = page.frontmatter.title;
    }
    void api()
      .resolveImages(page.path, page.markdown)
      .then(setImageMap)
      .catch(() => setImageMap({}));
    void refreshThreads().then((list) => {
      if (!focusThreadId) {
        return;
      }
      const match = list.find((thread) => thread.id === focusThreadId);
      if (match) {
        setOpenThread(match);
      }
    });
  }, [page.path, page.markdown, page.frontmatter.title, refreshThreads, focusThreadId]);

  useEffect(() => {
    if (!moreOpen) {
      return;
    }
    const onPointer = (ev: PointerEvent) => {
      if (moreRef.current && !moreRef.current.contains(ev.target as Node)) {
        setMoreOpen(false);
      }
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setMoreOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  function scheduleSave(markdown: string) {
    markdownRef.current = markdown;
    setStatus("saving");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void flushSave(markdown);
    }, 300);
  }

  async function flushSave(markdown = markdownRef.current): Promise<void> {
    window.clearTimeout(saveTimer.current);
    try {
      const result = await api().savePage(page.path, normalizeMarkdown(markdown));
      void result.savedAt;
      setStatus("saved");
      if (page.frontmatter.status.trim().toLowerCase() !== "published") {
        setReviewable(true);
      }
    } catch (err: unknown) {
      setStatus("error");
      onError(err instanceof Error ? err.message : String(err));
    }
  }

  async function commitTitle() {
    const next = title.trim();
    await patchFields({ title: next });
  }

  async function patchFields(patch: Partial<FrontmatterFields>) {
    const result = await run(() => api().patchFrontmatter(page.path, patch));
    if (!result) {
      return;
    }
    const { fields } = splitFrontmatter(result.markdown);
    onPage({ ...page, markdown: result.markdown, frontmatter: { ...page.frontmatter, ...fields } });
  }

  async function openReviewModal() {
    await flushSave();
    const tree = await api().homeTree();
    const selected = tree.selected.includes(page.path) ? tree.selected : [...tree.selected, page.path];
    await api().setDraftSelection(selected);
    setReviewOpen(true);
  }

  const openPr = prUrl || page.prUrl;

  return (
    <div className="editor-shell">
      <header className="bar">
        <nav className="crumbs" aria-label="Ruta">
          {crumbs.map((crumb, index) => (
            <span key={`${crumb}-${index}`} className="crumb-wrap">
              {index > 0 ? (
                <span className="crumb-sep" aria-hidden>
                  <IconChevron size={14} />
                </span>
              ) : null}
              <span className={index === crumbs.length - 1 ? "crumb is-current" : "crumb"}>
                {index === crumbs.length - 1 ? (
                  <>
                    <IconPage size={16} />
                    {crumb}
                  </>
                ) : (
                  crumb
                )}
              </span>
            </span>
          ))}
        </nav>
        <div className="bar-actions">
          <span className={status === "error" ? "bar-status is-error" : "bar-status"}>
            {status === "saving" ? "Guardando…" : status === "error" ? "Error" : "Guardado"}
          </span>
          <div className="bar-group">
            <button
              type="button"
              className="icon-btn"
              title={openPr ? "Historial (abrir PR)" : "Sin historial de PR"}
              disabled={!openPr}
              onClick={() => {
                if (openPr) {
                  void api().openUrl(openPr);
                }
              }}
            >
              <IconHistory />
            </button>
            <button
              type="button"
              className="icon-btn"
              title="Comentarios"
              disabled={threads.length === 0}
              onClick={() => {
                const first = threads[0];
                if (first) {
                  setOpenThread(first);
                }
              }}
            >
              <IconChat />
            </button>
          </div>
          <div className="bar-more" ref={moreRef}>
            <button
              type="button"
              className="icon-btn"
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              aria-label="Más acciones"
              onClick={() => setMoreOpen((current) => !current)}
            >
              <IconMore />
            </button>
            {moreOpen ? (
              <div className="account-menu is-workspace" role="menu">
                {page.repoMode === "personal" ? (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={busy}
                    onClick={async () => {
                      setMoreOpen(false);
                      await flushSave();
                      const result = await run(() => api().publishPersonal(page.path));
                      if (result) {
                        await api().openUrl(result.url);
                        onPage(await api().openPage(page.path));
                      }
                    }}
                  >
                    Publish
                  </button>
                ) : page.pageKind === "wiki" ? (
                  <>
                    {lifecycle.kind === "in_review" && openPr ? (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMoreOpen(false);
                          void api().openUrl(openPr);
                        }}
                      >
                        Abrir PR
                      </button>
                    ) : null}
                    {reviewable ? (
                      <button
                        type="button"
                        role="menuitem"
                        disabled={busy}
                        onClick={() => {
                          setMoreOpen(false);
                          void openReviewModal();
                        }}
                      >
                        {lifecycle.kind === "in_review" ? "Actualizar revisión" : "Mandar a revisión"}
                      </button>
                    ) : null}
                  </>
                ) : (
                  <p className="account-mode">Sin acciones extra</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </header>
      {lifecycle.kind === "in_review" && openPr ? (
        <div className="review-context" role="status">
          <p className="review-context-text">
            Esta página está en revisión. Los comentarios del PR se pintan en el canvas; el merge se hace desde Home.
          </p>
          <div className="review-context-actions">
            <button type="button" className="review-context-btn" onClick={() => void api().openUrl(openPr)}>
              Abrir PR
            </button>
          </div>
        </div>
      ) : null}
      <div
        className={["page", "mac-scrollbar", hasCover ? "has-cover" : "", icon ? "has-icon" : ""].filter(Boolean).join(" ")}
        id="page"
      >
        <HeroChrome
          fields={page.frontmatter}
          imageMap={imageMap}
          onPatch={patchFields}
          onUploadCover={async (file) => {
            const bytes = new Uint8Array(await file.arrayBuffer());
            const uploaded = await api().uploadImage(page.path, file.name, bytes);
            setImageMap((prev) => ({ ...prev, [uploaded.src]: uploaded.dataUrl }));
            return uploaded.src;
          }}
        >
          <div className="hero">
            <div
              id="hero-title"
              ref={titleRef}
              className={title.trim() ? "hero-title" : "hero-title is-empty"}
              contentEditable
              role="textbox"
              aria-label="Title"
              data-placeholder="Untitled"
              suppressContentEditableWarning
              onInput={(ev) => setTitle(ev.currentTarget.textContent ?? "")}
              onBlur={() => void commitTitle()}
            />
            <div className="hero-meta">
              <span className="pill">{lifecycle.label}</span>
              {auth?.login ? (
                <span className="avatar avatar-sm" title={`@${auth.login}`}>
                  {auth.login.slice(0, 1).toUpperCase()}
                </span>
              ) : null}
            </div>
          </div>
          <CrepeCanvas
            docPath={page.path}
            markdown={page.markdown}
            commentsEnabled={commentsOn}
            threads={threads}
            imageMap={imageMap}
            onMarkdown={(markdown) => {
              const { fields } = splitFrontmatter(markdown);
              scheduleSave(markdown);
              if (fields.title !== page.frontmatter.title) {
                setTitle(fields.title);
              }
            }}
            onUpload={async (file) => {
              const bytes = new Uint8Array(await file.arrayBuffer());
              const uploaded = await api().uploadImage(page.path, file.name, bytes);
              setImageMap((prev) => ({ ...prev, [uploaded.src]: uploaded.dataUrl }));
              return uploaded.src;
            }}
            onOpenThread={setOpenThread}
            onOrphans={setOrphans}
            onCommentSelection={setCommentDraft}
          />
        </HeroChrome>
      </div>
      {orphans.length > 0 ? (
        <aside className="thread-rail" aria-label="Off-canvas review comments">
          <div className="thread-rail-head">
            <div className="thread-rail-title">Off canvas</div>
            <div className="thread-rail-count">{orphans.length}</div>
          </div>
          {orphans.map((thread) => (
            <button key={thread.id} type="button" className="thread-rail-item" onClick={() => setOpenThread(thread)}>
              {thread.comments[0]?.author ?? "review"}
            </button>
          ))}
        </aside>
      ) : null}
      {openThread ? (
        <ThreadPopover
          thread={openThread}
          canWrite={canWrite}
          onClose={() => setOpenThread(null)}
          onReply={async (body) => {
            await run(() => api().threadReply(page.path, openThread.id, body));
            await refreshThreads();
          }}
          onResolve={async (resolved) => {
            await run(() => api().threadResolve(page.path, openThread.id, resolved));
            await refreshThreads();
            setOpenThread(null);
          }}
          onOpenGithub={() => void api().openUrl(openThread.url || openPr || "")}
        />
      ) : null}
      {commentDraft ? (
        <Modal title="Comentar selección" onClose={() => setCommentDraft(null)}>
          <blockquote className="thread-popover-snippet">{commentDraft}</blockquote>
          <textarea rows={4} value={commentBody} onChange={(ev) => setCommentBody(ev.target.value)} placeholder="Tu comentario" />
          <div className="hang-actions">
            <button type="button" className="btn ghost" onClick={() => setCommentDraft(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn fill"
              disabled={!commentBody.trim()}
              onClick={async () => {
                await run(() => api().threadCreate(page.path, commentDraft, commentBody));
                setCommentDraft(null);
                setCommentBody("");
                await refreshThreads();
              }}
            >
              Comentar
            </button>
          </div>
        </Modal>
      ) : null}
      {reviewOpen ? (
        <ReviewModal
          note="Esta página entra al lote. Si ya había otras seleccionadas en Home, viajan juntas en el mismo PR."
          onClose={() => setReviewOpen(false)}
          onSend={async (reviewers) => {
            const result = await run(() => api().reviewBatch(reviewers));
            if (!result) {
              return;
            }
            setReviewOpen(false);
            onPage(await api().openPage(page.path));
            if (result.created) {
              await api().openUrl(result.prUrl);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function crumbParts(trail: string | undefined, title: string): string[] {
  const parts = (trail ?? "")
    .split(" / ")
    .map((part) => part.trim())
    .filter(Boolean);
  return [...parts, title || "Untitled"];
}

function pageLifecycle(page: PagePayload): { kind: string; label: string } {
  const status = page.frontmatter.status.trim().toLowerCase();
  if (status === "in_review") {
    return { kind: "in_review", label: "En revisión" };
  }
  if (status === "published") {
    return { kind: "published", label: "Publicado" };
  }
  return { kind: "draft", label: "Borrador" };
}
