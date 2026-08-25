import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import type { LocalDraft } from "@slash-md/core/homeTypes";
import type { HomeTreeNode, HomeTreePayload, SlashmdFile, WorkspaceInfo } from "../../shared/api";
import { findFolder, flattenLibrary, rankLibraryHits, revealTrail } from "@slash-md/ui/home/utils/tree";
import { relativeTime, shortDraftPath } from "@slash-md/ui/home/utils/format";
import {
  IconDrafts,
  IconFolder,
  IconInbox,
  IconMerge,
  IconPage,
  IconPlus,
  IconReviews,
  IconSearch,
  IconUnfold,
} from "../components/icons";
import { Modal } from "../components/Modal";
import { ReviewModal } from "../components/ReviewModal";
import { SearchPalette } from "../components/SearchPalette";
import { Tree } from "../components/Tree";

const api = () => window.slashmd;

type Props = {
  workspace: WorkspaceInfo;
  tree: HomeTreePayload | null;
  pagePath: string | null;
  busy: boolean;
  error: string | null;
  children: ReactNode;
  onRefresh: () => Promise<void>;
  onError: (message: string | null) => void;
  onOpenPage: (path: string, threadId?: string) => void;
  onChangeFolder: () => void;
  run: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
};

type ModalKind = "none" | "new" | "folder" | "init" | "config" | "signin" | "review";
type NavView =
  | { kind: "drafts" }
  | { kind: "inbox" }
  | { kind: "reviews" }
  | { kind: "library" }
  | { kind: "folder"; path: string; title: string };

export function HomeScreen({
  workspace,
  tree,
  pagePath,
  busy,
  error,
  children,
  onRefresh,
  onError,
  onOpenPage,
  onChangeFolder,
  run,
}: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [modal, setModal] = useState<ModalKind>("none");
  const [nav, setNav] = useState<NavView>({ kind: "drafts" });
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const payload = tree;
  const personal = workspace.config?.mode === "personal";
  const roots = payload?.roots ?? [];
  const folder = nav.kind === "folder" && payload ? findFolder(payload.roots, nav.path) : undefined;
  const section = nav.kind === "folder" ? nav.path : undefined;
  const searchHits = useMemo(
    () => rankLibraryHits(flattenLibrary(roots), searchQuery),
    [roots, searchQuery],
  );
  const trails = useMemo(() => {
    const map = new Map<string, string>();
    for (const hit of flattenLibrary(roots)) {
      map.set(hit.path, hit.trail);
    }
    return map;
  }, [roots]);
  const searchKeys = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl+K";
  const title = workspaceTitle(payload, workspace.root);
  const treeSelected = pagePath ?? (nav.kind === "folder" ? nav.path : undefined);

  function reveal(path: string, kind: "file" | "folder") {
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const item of revealTrail(path, kind)) {
        next.add(item);
      }
      return next;
    });
  }

  function toggleFolder(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  useEffect(() => {
    if (nav.kind !== "folder" || !payload || payload.needsInit) {
      return;
    }
    if (!findFolder(payload.roots, nav.path)) {
      setNav({ kind: "library" });
    }
  }, [payload, nav]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (modal !== "none") {
        return;
      }
      const target = ev.target;
      const inField =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      const metaK = (ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "k" && !ev.altKey && !ev.shiftKey;
      const slash = ev.key === "/" && !inField && !ev.metaKey && !ev.ctrlKey && !ev.altKey;
      if (metaK) {
        ev.preventDefault();
        if (searchOpen) {
          setSearchOpen(false);
          setSearchQuery("");
        } else {
          setSearchOpen(true);
        }
        return;
      }
      if (slash && !searchOpen) {
        ev.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, searchOpen]);

  return (
    <div className="shell">
      <a className="skip-link" href="#home-stage">
        Saltar al contenido
      </a>
      <aside className="rail" aria-label="Biblioteca">
        <div className="rail-top">
          <WorkspaceSwitch
            title={title}
            onLibrary={() => setNav({ kind: "library" })}
            onChangeFolder={onChangeFolder}
            onConfig={() => setModal(payload?.needsInit ? "init" : "config")}
          />
          <button
            type="button"
            className="rail-find"
            disabled={Boolean(payload?.needsInit)}
            aria-keyshortcuts="Meta+K Control+K"
            onClick={() => {
              setSearchQuery("");
              setSearchOpen(true);
            }}
          >
            <span className="rail-find-copy">
              <IconSearch />
              <span>Buscar…</span>
            </span>
            <kbd className="rail-kbd">{searchKeys}</kbd>
          </button>
        </div>
        <div className="rail-scroll mac-scrollbar">
          <section className="nav-section">
            <h3 className="nav-label">Mi trabajo</h3>
            <nav className="nav-list" aria-label="Mi trabajo">
              <button
                type="button"
                className={nav.kind === "inbox" ? "nav-item is-current" : "nav-item"}
                onClick={() => setNav({ kind: "inbox" })}
              >
                <span className="tree-glyph">
                  <IconInbox />
                </span>
                <span>Inbox</span>
                {payload && payload.inbox.length > 0 ? (
                  <span className="nav-badge">{payload.inbox.length}</span>
                ) : null}
              </button>
              <button
                type="button"
                className={nav.kind === "drafts" ? "nav-item is-current" : "nav-item"}
                onClick={() => setNav({ kind: "drafts" })}
              >
                <span className="tree-glyph">
                  <IconDrafts />
                </span>
                <span>Borradores</span>
              </button>
              {personal ? null : (
                <button
                  type="button"
                  className={nav.kind === "reviews" ? "nav-item is-current" : "nav-item"}
                  onClick={() => setNav({ kind: "reviews" })}
                >
                  <span className="tree-glyph">
                    <IconReviews />
                  </span>
                  <span>En revisión</span>
                </button>
              )}
            </nav>
          </section>
          <section className="nav-section">
            <h3 className="nav-label">Workspace</h3>
            {payload?.needsInit ? (
              <p className="rail-hint">Inicia el workspace para ver páginas.</p>
            ) : (
              <Tree
                nodes={roots}
                selected={treeSelected}
                expanded={expanded}
                onFile={(path) => {
                  reveal(path, "file");
                  onOpenPage(path);
                }}
                onFolder={(node) => {
                  reveal(node.path, "folder");
                  setNav({ kind: "folder", path: node.path, title: node.title });
                }}
                onToggle={toggleFolder}
              />
            )}
          </section>
        </div>
        <div className="rail-foot">
          {payload?.needsInit ? (
            <button type="button" className="btn ghost rail-new" disabled={busy} onClick={() => setModal("init")}>
              <IconPlus />
              Iniciar
            </button>
          ) : (
            <button type="button" className="btn ghost rail-new" disabled={busy} onClick={() => setModal("new")}>
              <IconPlus />
              Nueva página
            </button>
          )}
          <AccountMenu
            workspace={workspace}
            personal={personal}
            busy={busy}
            needsInit={Boolean(payload?.needsInit)}
            onSignIn={() => setModal("signin")}
            onSignOut={async () => {
              await run(() => api().signOut());
              await onRefresh();
            }}
            onConfig={() => setModal(payload?.needsInit ? "init" : "config")}
            onFolder={() => setModal("folder")}
            onRefresh={() => void onRefresh()}
            onChangeFolder={onChangeFolder}
          />
        </div>
      </aside>
      <section className="pane" aria-label="Lista de trabajo">
        <WorkPane
          nav={nav}
          payload={payload}
          personal={personal}
          busy={busy}
          pagePath={pagePath}
          trails={trails}
          folder={folder}
          run={run}
          onRefresh={onRefresh}
          onError={onError}
          onOpenPage={onOpenPage}
          onOpenFolder={(node) => {
            reveal(node.path, "folder");
            setNav({ kind: "folder", path: node.path, title: node.title });
          }}
          onReview={() => setModal("review")}
          onSignIn={() => setModal("signin")}
          onNewPage={() => setModal("new")}
        />
      </section>
      <main id="home-stage" className="canvas-col" tabIndex={-1} aria-busy={busy}>
        {error ? (
          <p className="banner error" role="alert">
            {error}
          </p>
        ) : null}
        {payload?.needsInit ? (
          <Empty
            title="Conecta tu biblioteca"
            body="Iniciar escribe .slashmd.json y deja este folder listo para escribir."
            action="Iniciar"
            onClick={() => setModal("init")}
          />
        ) : !payload ? (
          <div className="editor-blank">
            <p className="muted">Cargando biblioteca…</p>
          </div>
        ) : (
          children
        )}
      </main>
      {modal === "new" ? (
        <NewPageModal
          section={section}
          onClose={() => setModal("none")}
          onCreate={async (input) => {
            const created = await run(() => api().newPage(input));
            if (created) {
              setModal("none");
              await onRefresh();
              onOpenPage(created.path);
            }
          }}
        />
      ) : null}
      {modal === "folder" ? (
        <FolderModal
          parent={section}
          onClose={() => setModal("none")}
          onCreate={async (name) => {
            await run(() => api().newFolder({ name, parent: section }));
            setModal("none");
            await onRefresh();
          }}
        />
      ) : null}
      {modal === "init" ? (
        <InitModal
          workspace={workspace}
          onClose={() => setModal("none")}
          onSave={async (config) => {
            await run(() => api().initWorkspace(config));
            setModal("none");
            await onRefresh();
          }}
        />
      ) : null}
      {modal === "config" ? (
        <InitModal
          workspace={workspace}
          onClose={() => setModal("none")}
          onSave={async (config) => {
            await run(() => api().saveConfig(config));
            setModal("none");
            await onRefresh();
          }}
        />
      ) : null}
      {modal === "signin" ? (
        <SignInModal
          onClose={() => setModal("none")}
          onSave={async (token) => {
            await run(() => api().signIn(token));
            setModal("none");
            await onRefresh();
          }}
        />
      ) : null}
      {modal === "review" ? (
        <ReviewModal
          onClose={() => setModal("none")}
          onSend={async (reviewers) => {
            const result = await run(() => api().reviewBatch(reviewers));
            if (result) {
              setModal("none");
              await onRefresh();
              if (result.created) {
                await api().openUrl(result.prUrl);
              }
            }
          }}
        />
      ) : null}
      {searchOpen && !payload?.needsInit ? (
        <SearchPalette
          query={searchQuery}
          hits={searchHits}
          onQuery={setSearchQuery}
          onClose={() => {
            setSearchOpen(false);
            setSearchQuery("");
          }}
          onOpenFile={(path) => {
            reveal(path, "file");
            setSearchOpen(false);
            setSearchQuery("");
            onOpenPage(path);
          }}
          onOpenFolder={(path, folderTitle) => {
            reveal(path, "folder");
            setSearchOpen(false);
            setSearchQuery("");
            setNav({ kind: "folder", path, title: folderTitle });
          }}
        />
      ) : null}
    </div>
  );
}

function workspaceTitle(payload: HomeTreePayload | null, root: string | null): string {
  const repo = payload?.repo;
  if (repo?.includes("/")) {
    return repo.slice(repo.indexOf("/") + 1);
  }
  if (repo) {
    return repo;
  }
  if (root) {
    return root.split("/").filter(Boolean).pop() ?? "Biblioteca";
  }
  return "Biblioteca";
}

function initials(name: string): string {
  const parts = name.split(/[\s/_-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "SM";
}

function Empty({
  title,
  body,
  action,
  onClick,
}: {
  title: string;
  body: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="empty">
      <h1>{title}</h1>
      <p className="lede">{body}</p>
      <button type="button" className="btn fill" onClick={onClick}>
        {action}
      </button>
    </div>
  );
}

function WorkPane({
  nav,
  payload,
  personal,
  busy,
  pagePath,
  trails,
  folder,
  run,
  onRefresh,
  onError,
  onOpenPage,
  onOpenFolder,
  onReview,
  onSignIn,
  onNewPage,
}: {
  nav: NavView;
  payload: HomeTreePayload | null;
  personal: boolean;
  busy: boolean;
  pagePath: string | null;
  trails: Map<string, string>;
  folder?: HomeTreeNode;
  run: Props["run"];
  onRefresh: () => Promise<void>;
  onError: (message: string | null) => void;
  onOpenPage: (path: string, threadId?: string) => void;
  onOpenFolder: (node: HomeTreeNode) => void;
  onReview: () => void;
  onSignIn: () => void;
  onNewPage: () => void;
}) {
  if (!payload) {
    return (
      <>
        <header className="pane-head">
          <h2>Biblioteca</h2>
        </header>
        <div className="pane-body">
          <p className="pane-empty">Cargando…</p>
        </div>
      </>
    );
  }

  if (payload.needsInit) {
    return (
      <>
        <header className="pane-head">
          <h2>Workspace</h2>
        </header>
        <div className="pane-body">
          <p className="pane-empty">Inicia el workspace para listar páginas.</p>
        </div>
      </>
    );
  }

  if (nav.kind === "inbox") {
    return <InboxPane payload={payload} onOpenPage={onOpenPage} />;
  }
  if (nav.kind === "reviews") {
    return (
      <ReviewsPane
        payload={payload}
        busy={busy}
        pagePath={pagePath}
        trails={trails}
        run={run}
        onRefresh={onRefresh}
        onError={onError}
        onOpenPage={onOpenPage}
        onSignIn={onSignIn}
      />
    );
  }
  if (nav.kind === "folder") {
    const nodes = folder?.children ?? [];
    return (
      <>
        <header className="pane-head">
          <h2>{folder?.title ?? nav.title}</h2>
        </header>
        <div className="pane-body mac-scrollbar">
          {nodes.length === 0 ? (
            <button type="button" className="btn ghost" onClick={onNewPage}>
              Nueva página
            </button>
          ) : (
            <NodeList nodes={nodes} onOpenPage={onOpenPage} onOpenFolder={onOpenFolder} />
          )}
        </div>
      </>
    );
  }
  if (nav.kind === "library") {
    return (
      <>
        <header className="pane-head">
          <h2>Biblioteca</h2>
        </header>
        <div className="pane-body mac-scrollbar">
          {payload.roots.length === 0 ? (
            <button type="button" className="btn ghost" onClick={onNewPage}>
              Nueva página
            </button>
          ) : (
            <NodeList nodes={payload.roots} onOpenPage={onOpenPage} onOpenFolder={onOpenFolder} />
          )}
        </div>
      </>
    );
  }

  return (
    <DraftPane
      payload={payload}
      personal={personal}
      busy={busy}
      pagePath={pagePath}
      trails={trails}
      run={run}
      onRefresh={onRefresh}
      onOpenPage={onOpenPage}
      onReview={onReview}
    />
  );
}

function DraftPane({
  payload,
  personal,
  busy,
  pagePath,
  trails,
  run,
  onRefresh,
  onOpenPage,
  onReview,
}: {
  payload: HomeTreePayload;
  personal: boolean;
  busy: boolean;
  pagePath: string | null;
  trails: Map<string, string>;
  run: Props["run"];
  onRefresh: () => Promise<void>;
  onOpenPage: (path: string) => void;
  onReview: () => void;
}) {
  const selected = new Set(payload.selected);
  const count = payload.drafts.filter((draft) => selected.has(draft.path)).length;
  return (
    <>
      <header className="pane-head">
        <div className="pane-head-row">
          <h2>{personal ? "Cambios locales" : "Borradores"}</h2>
        </div>
        {payload.drafts.length > 0 ? (
          <div className="pane-chip">
            <span className="dot-live" aria-hidden="true" />
            <span>
              {payload.drafts.length} página{payload.drafts.length === 1 ? "" : "s"} modificada
              {payload.drafts.length === 1 ? "" : "s"}
            </span>
          </div>
        ) : null}
      </header>
      <div className="pane-body mac-scrollbar">
        {payload.drafts.length === 0 ? (
          <p className="pane-empty">No hay cambios locales.</p>
        ) : (
          payload.drafts.map((draft) => (
            <DraftCard
              key={draft.path}
              draft={draft}
              trail={trails.get(draft.path) || shortDraftPath(draft.path, payload.contentPath)}
              checked={selected.has(draft.path)}
              open={pagePath === draft.path}
              selectable={!personal}
              onOpen={() => onOpenPage(draft.path)}
              onToggle={async () => {
                const next = selected.has(draft.path)
                  ? payload.selected.filter((item) => item !== draft.path)
                  : [...payload.selected, draft.path];
                await run(() => api().setDraftSelection(next));
                await onRefresh();
              }}
            />
          ))
        )}
      </div>
      {personal ? (
        <div className="pane-foot">
          <p className="muted">Publish vive en el editor de cada página.</p>
        </div>
      ) : (
        <div className="pane-foot">
          <button type="button" className="btn fill cta-send" disabled={busy || count === 0} onClick={onReview}>
            <IconMerge />
            Mandar {count} {count === 1 ? "seleccionada" : "seleccionadas"} a revisión
          </button>
        </div>
      )}
    </>
  );
}

function DraftCard({
  draft,
  trail,
  checked,
  open,
  selectable,
  onOpen,
  onToggle,
}: {
  draft: LocalDraft;
  trail: string;
  checked: boolean;
  open: boolean;
  selectable: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const chip = badgeChip(draft.badge);
  const dim = selectable && !checked;
  const className = ["draft-card", open ? "is-open" : "", dim ? "is-dim" : ""].filter(Boolean).join(" ");
  return (
    <div className={className}>
      <div className="draft-card-row">
        {selectable ? (
          <input
            type="checkbox"
            className="draft-check"
            checked={checked}
            aria-label={`Incluir ${draft.title} en el lote`}
            onChange={() => void onToggle()}
          />
        ) : null}
        <button type="button" className="draft-copy" onClick={onOpen}>
          <span className="draft-title-row">
            <span className="draft-title">{fileLabel(draft.title, draft.path)}</span>
            <span className={`chip ${chip.className}`}>{chip.letter}</span>
          </span>
          {trail ? <span className="draft-trail">{formatTrail(trail)}</span> : null}
        </button>
      </div>
    </div>
  );
}

function formatTrail(trail: string): string {
  return trail.replaceAll(" / ", " › ");
}

function fileLabel(title: string, path: string): string {
  if (title.toLowerCase().endsWith(".md")) {
    return title;
  }
  const base = path.split("/").pop() ?? title;
  return base.toLowerCase().endsWith(".md") ? base : `${title}.md`;
}

function badgeChip(badge: LocalDraft["badge"]): { letter: string; className: string } {
  if (badge === "modificado") {
    return { letter: "M", className: "chip-m" };
  }
  if (badge === "in review") {
    return { letter: "R", className: "chip-r" };
  }
  return { letter: "D", className: "chip-d" };
}

function InboxPane({
  payload,
  onOpenPage,
}: {
  payload: HomeTreePayload;
  onOpenPage: (path: string, threadId?: string) => void;
}) {
  return (
    <>
      <header className="pane-head">
        <h2>Inbox</h2>
        {payload.inbox.length > 0 ? (
          <div className="pane-chip">
            <span className="dot-live" aria-hidden="true" />
            <span>
              {payload.inbox.length} comentario{payload.inbox.length === 1 ? "" : "s"}
            </span>
          </div>
        ) : null}
      </header>
      <div className="pane-body mac-scrollbar">
        {payload.inboxError ? (
          <p className="error" role="alert">
            {payload.inboxError}
          </p>
        ) : null}
        {payload.inbox.length === 0 && !payload.inboxError ? (
          <p className="pane-empty">No hay comentarios pendientes.</p>
        ) : (
          payload.inbox.map((item) => (
            <button
              key={`${item.prNumber}-${item.threadId}`}
              type="button"
              className="inbox-card"
              onClick={() => onOpenPage(item.path, item.threadId)}
            >
              <span className="inbox-meta">
                {item.author} · {relativeTime(item.createdAt)} · #{item.prNumber}
              </span>
              <span>{item.excerpt || item.path}</span>
            </button>
          ))
        )}
      </div>
    </>
  );
}

function ReviewsPane({
  payload,
  busy,
  pagePath,
  trails,
  run,
  onRefresh,
  onError,
  onOpenPage,
  onSignIn,
}: {
  payload: HomeTreePayload;
  busy: boolean;
  pagePath: string | null;
  trails: Map<string, string>;
  run: Props["run"];
  onRefresh: () => Promise<void>;
  onError: (message: string | null) => void;
  onOpenPage: (path: string) => void;
  onSignIn: () => void;
}) {
  const reviewing = payload.drafts.filter((draft) => draft.badge === "in review");
  return (
    <>
      <header className="pane-head">
        <h2>En revisión</h2>
      </header>
      <div className="pane-body mac-scrollbar">
        {payload.needsAuth ? (
          <div className="callout">
            <p>Sin sesión de GitHub no llega el estado del PR.</p>
            <button type="button" className="btn ghost" onClick={onSignIn}>
              Iniciar sesión
            </button>
          </div>
        ) : null}
        {payload.loteReview ? (
          <PrStrip payload={payload} busy={busy} run={run} onRefresh={onRefresh} onError={onError} />
        ) : null}
        {!payload.loteReview && payload.canPublishBatch ? (
          <div className="callout">
            <p>Hay páginas en revisión. Publica el lote cuando el PR esté listo.</p>
          </div>
        ) : null}
        {reviewing.length === 0 && !payload.loteReview ? (
          <p className="pane-empty">No hay revisiones en curso.</p>
        ) : (
          reviewing.map((draft) => (
            <DraftCard
              key={draft.path}
              draft={draft}
              trail={trails.get(draft.path) || shortDraftPath(draft.path, payload.contentPath)}
              checked
              open={pagePath === draft.path}
              selectable={false}
              onOpen={() => onOpenPage(draft.path)}
              onToggle={() => undefined}
            />
          ))
        )}
      </div>
      {payload.canPublishBatch ? (
        <div className="pane-foot">
          <button
            type="button"
            className="btn fill cta-send"
            disabled={busy}
            onClick={async () => {
              onError(null);
              await run(() => api().publishBatch(payload.loteReview?.prNumber));
              await onRefresh();
            }}
          >
            Aprobar y publicar
          </button>
        </div>
      ) : null}
    </>
  );
}

function NodeList({
  nodes,
  onOpenPage,
  onOpenFolder,
}: {
  nodes: HomeTreeNode[];
  onOpenPage: (path: string) => void;
  onOpenFolder: (node: HomeTreeNode) => void;
}) {
  return (
    <ul className="page-list">
      {nodes.map((node) => (
        <li key={node.path}>
          {node.kind === "folder" ? (
            <button type="button" className="page-row" onClick={() => onOpenFolder(node)}>
              <span className="tree-glyph">
                <IconFolder />
              </span>
              <span>{node.title}</span>
            </button>
          ) : (
            <button type="button" className="page-row" onClick={() => onOpenPage(node.path)}>
              <span className="tree-glyph">
                <IconPage />
              </span>
              <span>{node.title}</span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function PrStrip({
  payload,
  busy,
  run,
  onRefresh,
  onError,
}: {
  payload: HomeTreePayload;
  busy: boolean;
  run: Props["run"];
  onRefresh: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const review = payload.loteReview!;
  const parts = [
    review.approvals > 0
      ? `${review.approvals} aprobación${review.approvals === 1 ? "" : "es"}`
      : "esperando aprobación",
    review.checksOk === true ? "checks OK" : review.checksOk === false ? "checks failing" : "checks pending",
  ];
  return (
    <section className="callout" aria-label="En revisión">
      <div className="pr-strip-copy">
        <p className="pr-strip-kicker">En revisión · #{review.prNumber}</p>
        <p className="pr-strip-status">{parts.join(" · ")}</p>
      </div>
      <div className="hang-actions">
        <button type="button" className="btn ghost" onClick={() => void api().openUrl(review.prUrl)}>
          Abrir PR
        </button>
        {review.state === "open" && payload.canPublishBatch ? (
          <button
            type="button"
            className="btn fill"
            disabled={busy}
            onClick={async () => {
              onError(null);
              await run(() => api().publishBatch(review.prNumber));
              await onRefresh();
            }}
          >
            Aprobar y publicar
          </button>
        ) : null}
      </div>
    </section>
  );
}

function WorkspaceSwitch({
  title,
  onLibrary,
  onChangeFolder,
  onConfig,
}: {
  title: string;
  onLibrary: () => void;
  onChangeFolder: () => void;
  onConfig: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useDismiss(open, rootRef, () => setOpen(false));

  return (
    <div className="workspace-wrap" ref={rootRef}>
      <button
        type="button"
        className="workspace-switch"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="workspace-switch-copy">
          <span className="workspace-mark">{initials(title)}</span>
          <span className="workspace-name">{title}</span>
        </span>
        <span className="tree-glyph">
          <IconUnfold />
        </span>
      </button>
      {open ? (
        <div className="account-menu is-workspace" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLibrary();
            }}
          >
            Biblioteca
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onConfig();
            }}
          >
            Configuración
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onChangeFolder();
            }}
          >
            Cambiar carpeta
          </button>
        </div>
      ) : null}
    </div>
  );
}

function AccountMenu({
  workspace,
  personal,
  busy,
  needsInit,
  onSignIn,
  onSignOut,
  onConfig,
  onFolder,
  onRefresh,
  onChangeFolder,
}: {
  workspace: WorkspaceInfo;
  personal: boolean;
  busy: boolean;
  needsInit: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onConfig: () => void;
  onFolder: () => void;
  onRefresh: () => void;
  onChangeFolder: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const login = workspace.auth?.login;

  useDismiss(open, rootRef, () => setOpen(false));

  return (
    <div ref={rootRef}>
      <button
        type="button"
        className="profile-row"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="account-menu"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="avatar" aria-hidden>
          {login ? login.slice(0, 1).toUpperCase() : "?"}
        </span>
        <span className="profile-copy">
          <span className="profile-name">{login ? `@${login}` : "Sin sesión"}</span>
          <span className="profile-meta">{personal ? "personal" : "workspace"}</span>
        </span>
      </button>
      {open ? (
        <div className="account-menu" id="account-menu" role="menu">
          <p className="account-mode">
            {login ? `@${login}` : "Sin sesión"} · {personal ? "personal" : "workspace"}
          </p>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onFolder();
            }}
          >
            Nueva carpeta
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onConfig();
            }}
          >
            {needsInit ? "Iniciar workspace" : "Configuración"}
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={() => {
              setOpen(false);
              onRefresh();
            }}
          >
            Actualizar
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onChangeFolder();
            }}
          >
            Cambiar carpeta
          </button>
          {workspace.auth ? (
            <button
              type="button"
              role="menuitem"
              className="is-danger"
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
            >
              Cerrar sesión
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSignIn();
              }}
            >
              Iniciar sesión
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function useDismiss(open: boolean, rootRef: RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointer = (ev: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(ev.target as Node)) {
        onClose();
      }
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, rootRef, onClose]);
}

function NewPageModal({
  section,
  onClose,
  onCreate,
}: {
  section?: string;
  onClose: () => void;
  onCreate: (input: { title: string; templateId: string; section?: string }) => void;
}) {
  const [title, setTitle] = useState("Untitled");
  const [templateId, setTemplateId] = useState("blank");
  const [templates, setTemplates] = useState<{ id: string; label: string }[]>([{ id: "blank", label: "Blank" }]);
  useEffect(() => {
    void api()
      .listTemplates()
      .then((list) => {
        if (list.length > 0) {
          setTemplates(list);
          setTemplateId(list[0]!.id);
        }
      });
  }, []);
  return (
    <Modal title="Nueva página" onClose={onClose}>
      <label>
        Título
        <input value={title} onChange={(ev) => setTitle(ev.target.value)} />
      </label>
      <label>
        Plantilla
        <select value={templateId} onChange={(ev) => setTemplateId(ev.target.value)}>
          {templates.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      {section ? <p className="muted">Carpeta: {section}</p> : null}
      <div className="hang-actions">
        <button type="button" className="btn ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn fill" onClick={() => onCreate({ title, templateId, section })}>
          Crear
        </button>
      </div>
    </Modal>
  );
}

function FolderModal({
  parent,
  onClose,
  onCreate,
}: {
  parent?: string;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");
  return (
    <Modal title="Nueva carpeta" onClose={onClose}>
      <label>
        Nombre
        <input value={name} onChange={(ev) => setName(ev.target.value)} placeholder="product" />
      </label>
      {parent ? <p className="muted">Dentro de {parent}</p> : null}
      <div className="hang-actions">
        <button type="button" className="btn ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn fill" disabled={!name.trim()} onClick={() => onCreate(name)}>
          Crear
        </button>
      </div>
    </Modal>
  );
}

function InitModal({
  workspace,
  onClose,
  onSave,
}: {
  workspace: WorkspaceInfo;
  onClose: () => void;
  onSave: (config: SlashmdFile) => void;
}) {
  const [repo, setRepo] = useState(workspace.slashmd.repo ?? "");
  const [contentPath, setContentPath] = useState(workspace.slashmd.contentPath ?? "docs");
  const [defaultBranch, setDefaultBranch] = useState(workspace.slashmd.defaultBranch ?? "main");
  const [mode, setMode] = useState<"workspace" | "personal">(workspace.slashmd.mode ?? "workspace");
  useEffect(() => {
    void api()
      .detectGit()
      .then((git) => {
        setRepo((current) => current || git.repo || "");
        if (!workspace.slashmd.defaultBranch) {
          setDefaultBranch(git.branch);
        }
        if (!workspace.slashmd.contentPath) {
          setContentPath(git.hasDocsDir ? "docs" : ".");
        }
      });
  }, [workspace.slashmd.contentPath, workspace.slashmd.defaultBranch]);
  return (
    <Modal title="Init" onClose={onClose}>
      <label>
        Repo (owner/name)
        <input value={repo} onChange={(ev) => setRepo(ev.target.value)} placeholder="acme/docs" />
      </label>
      <label>
        contentPath
        <input value={contentPath} onChange={(ev) => setContentPath(ev.target.value)} />
      </label>
      <label>
        defaultBranch
        <input value={defaultBranch} onChange={(ev) => setDefaultBranch(ev.target.value)} />
      </label>
      <label>
        Modo
        <select value={mode} onChange={(ev) => setMode(ev.target.value === "personal" ? "personal" : "workspace")}>
          <option value="workspace">Workspace (Review → PR)</option>
          <option value="personal">Personal (Publish directo)</option>
        </select>
      </label>
      <div className="hang-actions">
        <button type="button" className="btn ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn fill" onClick={() => onSave({ repo, contentPath, defaultBranch, mode })}>
          Guardar .slashmd.json
        </button>
      </div>
    </Modal>
  );
}

function SignInModal({ onClose, onSave }: { onClose: () => void; onSave: (token?: string) => void }) {
  const [token, setToken] = useState("");
  return (
    <Modal title="GitHub" onClose={onClose}>
      <p className="lede">Usa `gh auth login` o pega un token con alcance repo.</p>
      <label>
        Token (opcional)
        <input type="password" value={token} onChange={(ev) => setToken(ev.target.value)} placeholder="ghp_…" />
      </label>
      <div className="hang-actions">
        <button type="button" className="btn ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn fill" onClick={() => onSave(token.trim() || undefined)}>
          Conectar
        </button>
      </div>
    </Modal>
  );
}

export function EditorBlank() {
  return (
    <div className="editor-blank">
      <p className="muted">Selecciona una página para editarla.</p>
    </div>
  );
}
