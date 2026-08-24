import * as vscode from "vscode";
import { handleOpenUrl, handlePublish, handleReview } from "./barActions";
import { draftBarState } from "./barState";
import { getDraftMeta, patchDraftMeta } from "../sidecar/draftMeta";
import { trackEditor } from "./editorLive";
import { editorHtml } from "./editorHtml";
import { joinFrontmatter, setFrontmatterField, splitFrontmatter } from "../domain/frontmatter";
import { ContentRepo } from "../github/contentRepo";
import { getContentConfig } from "../github/config";
import { docsContentRemotePath } from "../workspace/docsWorkspace";
import { buildImageMap, imageLocalResourceRoots, resolveImageSrc, saveUploadedImage } from "./imageHost";
import { displayTitle, heroTitleFromMarkdown, HostToWebview } from "../domain/messaging";
import { normalizeMarkdown } from "../domain/markdown";
import { FrontmatterKey, PageKind, Workflow } from "../domain/protocol";
import { LibraryViews } from "../library/libraryViews";
import { markdownHash } from "../domain/hash";
import type { RepoMode } from "../config/slashmdConfig";
import { attachThreadPolling } from "./threadsHost";
import { handleThreadCreate, handleThreadReply, handleThreadResolve } from "./threadActions";
import { pushFileEditors } from "./fileEditorsHost";
import { openHomeForWikiPublish, openHomeForWikiReview } from "./wikiHomeActions";
import { routeEditorMessage } from "./editorMessageRouter";
import type { EditorSessionDeps, EditorSessionState } from "./editorSessionDeps";

const SAVE_DEBOUNCE_MS = 300;
/** UI may edit title + icon + cover; owner/status/updated are stamped by the host. */
const FRONTMATTER_KEYS = new Set<FrontmatterKey>(["title", "icon", "cover", "coverPosition"]);

export class SlashMdEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = "slash-md.editor";

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly library?: LibraryViews,
  ) {}

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    const workflow = await resolveWorkflow(document.uri);
    const pageKind = await resolvePageKind(document.uri);
    const contentConfig = getContentConfig();
    const repoMode: RepoMode = contentConfig?.mode ?? "workspace";
    const filename = document.uri.path.split("/").pop() ?? "draft";
    const meta = workflow === "workspace" ? getDraftMeta(this.context, document.uri) : {};
    const full = document.getText();
    const { body, fields } = splitFrontmatter(full);
    const status =
      workflow === "workspace"
        ? draftBarState(meta, full, { mode: repoMode })
        : { kind: "draft" as const, label: "", publishEnabled: false, prUrl: undefined };
    const wikiPath =
      workflow === "workspace" && contentConfig
        ? await docsContentRemotePath(document.uri, contentConfig)
        : undefined;
    const displayPath =
      workflow === "workspace"
        ? (meta.remotePath ?? wikiPath ?? filename)
        : workspaceDisplayPath(document.uri);
    const imageRoots = await imageLocalResourceRoots(this.context, document);
    await vscode.workspace.fs.createDirectory(imageRoots[0]!);
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri, ...imageRoots],
    };
    const init: Extract<HostToWebview, { type: "init" }> = {
      type: "init",
      title: heroTitleFromMarkdown(full) || displayTitle(full, filename),
      path: displayPath,
      savedAt: meta.savedAt ?? null,
      kind: status.kind,
      label: status.label,
      publishEnabled: workflow === "workspace" && pageKind !== "wiki" && status.publishEnabled,
      prUrl: workflow === "workspace" ? status.prUrl : undefined,
      workflow,
      repoMode: workflow === "workspace" ? repoMode : undefined,
      pageKind,
    };
    const repos = new ContentRepo(this.context);
    const imageMap = await buildImageMap({
      context: this.context,
      webview: webviewPanel.webview,
      markdown: full,
      document,
      remotePath: wikiPath ?? meta.remotePath,
      repos,
    });

    webviewPanel.webview.html = editorHtml({
      nonce: getNonce(),
      cspSource: webviewPanel.webview.cspSource,
      title: init.title,
      path: init.path,
      text: body,
      frontmatter: fields,
      imageMap,
      init,
      jsUri: webviewPanel.webview
        .asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview.js"))
        .toString(),
      cssUri: webviewPanel.webview
        .asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview.css"))
        .toString(),
    });

    const state: EditorSessionState = {
      latestText: full,
      saveTimer: undefined,
      reviewing: false,
      persisting: false,
    };
    let appliedExternalHash = markdownHash(full);
    /** Hash of the last bytes we wrote — ignore matching onDidChangeTextDocument echoes. */
    let lastSelfWriteHash = appliedExternalHash;
    const tracking = trackEditor(document.uri, webviewPanel.webview);

    const setPersisting = (value: boolean) => {
      state.persisting = value;
    };

    const persistSoon = () => {
      if (state.saveTimer) {
        clearTimeout(state.saveTimer);
      }
      state.saveTimer = setTimeout(() => {
        void (async () => {
          const writtenHash = await persistExact(document, state.latestText, setPersisting);
          if (writtenHash) {
            lastSelfWriteHash = writtenHash;
          }
          appliedExternalHash = markdownHash(state.latestText);
          const at = new Date().toISOString();
          if (workflow === "workspace") {
            const nextStatus = draftBarState(getDraftMeta(this.context, document.uri), state.latestText, {
              mode: getContentConfig()?.mode ?? "workspace",
            });
            await patchDraftMeta(this.context, document.uri, {
              savedAt: at,
              kind: nextStatus.kind,
              label: nextStatus.label,
            });
            this.library?.refreshLabels();
            await webviewPanel.webview.postMessage({
              type: "saved",
              at,
              title: heroTitleFromMarkdown(state.latestText),
            } satisfies HostToWebview);
            await webviewPanel.webview.postMessage({
              type: "status",
              kind: nextStatus.kind,
              label: nextStatus.label,
              publishEnabled: pageKind !== "wiki" && nextStatus.publishEnabled,
              prUrl: nextStatus.prUrl,
              path: getDraftMeta(this.context, document.uri).remotePath ?? wikiPath ?? filename,
              workflow,
              repoMode: getContentConfig()?.mode ?? "workspace",
              pageKind,
            } satisfies HostToWebview);
          } else {
            await webviewPanel.webview.postMessage({
              type: "saved",
              at,
              title: heroTitleFromMarkdown(state.latestText),
            } satisfies HostToWebview);
            await webviewPanel.webview.postMessage({
              type: "status",
              kind: "draft",
              label: "",
              publishEnabled: false,
              path: workspaceDisplayPath(document.uri),
              workflow,
            } satisfies HostToWebview);
          }
        })();
      }, SAVE_DEBOUNCE_MS);
    };

    const threads = attachThreadPolling({
      context: this.context,
      document,
      webview: webviewPanel.webview,
      panel: webviewPanel,
      workflow,
      repos,
    });
    void pushFileEditors(document, webviewPanel.webview);

    const deps: EditorSessionDeps = {
      state,
      workflow,
      pageKind,
      frontmatterKeys: FRONTMATTER_KEYS,
      applyEdit: (bodyMarkdown) => {
        const { raw } = splitFrontmatter(state.latestText);
        state.latestText = joinFrontmatter(raw, stripBlobImages(bodyMarkdown));
      },
      applyFrontmatter: (field, value) => {
        state.latestText = setFrontmatterField(state.latestText, field, value);
      },
      persistSoon,
      flushSaveTimer: () => {
        if (state.saveTimer) {
          clearTimeout(state.saveTimer);
          state.saveTimer = undefined;
        }
      },
      persistNow: async () => {
        await persistExact(document, state.latestText, setPersisting);
      },
      refreshThreads: () => threads.refresh(),
      threadReply: (threadId, body) =>
        handleThreadReply(this.context, document, webviewPanel.webview, repos, threadId, body),
      threadResolve: (threadId, resolved) =>
        handleThreadResolve(this.context, document, webviewPanel.webview, repos, threadId, resolved),
      threadCreate: (selectedText) =>
        handleThreadCreate(this.context, document, webviewPanel.webview, repos, state.latestText, selectedText),
      uploadImage: async (msg) => {
        try {
          const saved = await saveUploadedImage({
            context: this.context,
            webview: webviewPanel.webview,
            document,
            name: msg.name ?? "image.png",
            data: msg.data,
            wikiPath,
          });
          await webviewPanel.webview.postMessage({
            type: "imageUploaded",
            id: msg.id,
            src: saved.src,
            webviewUri: saved.webviewUri,
          } satisfies HostToWebview);
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          await vscode.window.showErrorMessage(`Could not save image: ${reason}`);
          await webviewPanel.webview.postMessage({
            type: "imageUploaded",
            id: msg.id,
            src: "",
            webviewUri: "",
          } satisfies HostToWebview);
        }
      },
      resolveImage: async (msg) => {
        const webviewUri = await resolveImageSrc({
          context: this.context,
          webview: webviewPanel.webview,
          document,
          src: msg.src,
          repos,
          wikiPath,
        });
        await webviewPanel.webview.postMessage({
          type: "imageResolved",
          id: msg.id,
          src: msg.src,
          webviewUri,
        } satisfies HostToWebview);
      },
      reviewOrPublish: async (kind) => {
        const config = getContentConfig();
        if (pageKind === "wiki" && config?.mode === "workspace") {
          if (kind === "review") {
            await openHomeForWikiReview(this.context, document, config);
          } else {
            await openHomeForWikiPublish(this.context);
          }
          return;
        }
        if (kind === "review") {
          await handleReview(this.context, document, webviewPanel.webview, state.latestText);
        } else {
          await handlePublish(this.context, document, webviewPanel.webview, state.latestText);
        }
        await threads.refresh();
        await pushFileEditors(document, webviewPanel.webview);
      },
      openUrl: (url) => handleOpenUrl(url),
      refreshLabels: () => {
        this.library?.refreshLabels();
      },
    };

    const fromWebview = webviewPanel.webview.onDidReceiveMessage(async (message) => {
      await routeEditorMessage(deps, message);
    });

    const fromDoc = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.toString() !== document.uri.toString()) {
        return;
      }
      const next = event.document.getText();
      const nextHash = markdownHash(next);
      if (state.persisting || nextHash === lastSelfWriteHash || nextHash === appliedExternalHash) {
        state.latestText = next;
        appliedExternalHash = nextHash;
        return;
      }
      const nextBody = normalizeMarkdown(splitFrontmatter(next).body);
      const latestBody = normalizeMarkdown(splitFrontmatter(state.latestText).body);
      if (nextBody === latestBody) {
        state.latestText = next;
        appliedExternalHash = nextHash;
        lastSelfWriteHash = nextHash;
        return;
      }
      appliedExternalHash = nextHash;
      state.latestText = next;
      const split = splitFrontmatter(next);
      void webviewPanel.webview.postMessage({ type: "setText", text: split.body } satisfies HostToWebview);
      void webviewPanel.webview.postMessage({ type: "frontmatter", fields: split.fields } satisfies HostToWebview);
      if (workflow === "workspace") {
        this.library?.refreshLabels();
      }
    });

    webviewPanel.onDidDispose(() => {
      if (state.saveTimer) {
        clearTimeout(state.saveTimer);
      }
      threads.dispose();
      tracking.dispose();
      fromWebview.dispose();
      fromDoc.dispose();
      void persistExact(document, state.latestText, setPersisting);
    });
  }
}

export async function resolvePageKind(uri: vscode.Uri): Promise<PageKind> {
  if (uri.path.endsWith(".slash.md")) {
    return "sidecar";
  }
  if (!uri.path.endsWith(".md")) {
    return "editor";
  }
  const config = getContentConfig();
  if (!config) {
    return "editor";
  }
  const remotePath = await docsContentRemotePath(uri, config);
  return remotePath ? "wiki" : "editor";
}

export async function resolveWorkflow(uri: vscode.Uri): Promise<Workflow> {
  if (uri.path.endsWith(".slash.md")) {
    return "workspace";
  }
  if (!uri.path.endsWith(".md")) {
    return "editor";
  }
  const config = getContentConfig();
  if (!config) {
    return "editor";
  }
  const remotePath = await docsContentRemotePath(uri, config);
  return remotePath ? "workspace" : "editor";
}

export function workspaceDisplayPath(uri: vscode.Uri): string {
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (folder) {
    return vscode.workspace.asRelativePath(uri, false);
  }
  return uri.fsPath || uri.path;
}

async function persistExact(
  document: vscode.TextDocument,
  text: string,
  setPersisting: (value: boolean) => void,
): Promise<string | undefined> {
  const hash = markdownHash(text);
  const onDisk = Buffer.from(await vscode.workspace.fs.readFile(document.uri)).toString("utf8");
  if (onDisk === text || normalizeMarkdown(onDisk) === normalizeMarkdown(text)) {
    return hash;
  }

  setPersisting(true);
  try {
    await vscode.workspace.fs.writeFile(document.uri, Buffer.from(text, "utf8"));
    return hash;
  } finally {
    setTimeout(() => setPersisting(false), 800);
  }
}

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

function stripBlobImages(markdown: string): string {
  return markdown.replace(/!\[[^\]]*\]\(\s*blob:[^)]+\)/g, "");
}
