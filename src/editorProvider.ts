import * as vscode from "vscode";
import { handleOpenUrl, handlePublish, handleReview } from "./barActions";
import { draftBarState } from "./barState";
import { getDraftMeta, patchDraftMeta } from "./draftMeta";
import { trackEditor } from "./editorLive";
import { editorHtml } from "./editorHtml";
import { joinFrontmatter, setFrontmatterField, splitFrontmatter } from "./frontmatter";
import { ContentRepo } from "./github/contentRepo";
import { getContentConfig } from "./github/config";
import { buildImageMap, imagesRoot, resolveImageSrc, saveUploadedImage } from "./imageHost";
import { displayTitle, HostToWebview } from "./messaging";
import { normalizeMarkdown } from "./markdown";
import { FrontmatterKey, Workflow } from "./protocol";
import { LibraryViews } from "./libraryViews";
import { markdownHash } from "./hash";
import type { RepoMode } from "./slashmdConfig";
import { attachThreadPolling } from "./threadsHost";
import { handleThreadCreate, handleThreadReply, handleThreadResolve } from "./threadActions";

const SAVE_DEBOUNCE_MS = 300;
/** UI may edit title + cover; owner/status/updated are stamped by the host. */
const FRONTMATTER_KEYS = new Set<FrontmatterKey>(["title", "cover", "coverPosition"]);

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
    await vscode.workspace.fs.createDirectory(imagesRoot(this.context));
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri, imagesRoot(this.context)],
    };

    const workflow = resolveWorkflow(document.uri);
    const repoMode: RepoMode = getContentConfig()?.mode ?? "workspace";
    const filename = document.uri.path.split("/").pop() ?? "draft";
    const meta = workflow === "workspace" ? getDraftMeta(this.context, document.uri) : {};
    const full = document.getText();
    const { body, fields } = splitFrontmatter(full);
    const status =
      workflow === "workspace"
        ? draftBarState(meta, full, { mode: repoMode })
        : { kind: "draft" as const, label: "", publishEnabled: false, prUrl: undefined };
    const displayPath =
      workflow === "workspace" ? (meta.remotePath ?? filename) : workspaceDisplayPath(document.uri);
    const init: Extract<HostToWebview, { type: "init" }> = {
      type: "init",
      title: displayTitle(full, filename),
      path: displayPath,
      savedAt: meta.savedAt ?? null,
      kind: status.kind,
      label: status.label,
      publishEnabled: workflow === "workspace" && status.publishEnabled,
      prUrl: workflow === "workspace" ? status.prUrl : undefined,
      workflow,
      repoMode: workflow === "workspace" ? repoMode : undefined,
    };
    const repos = new ContentRepo(this.context);
    const imageMap = await buildImageMap({
      context: this.context,
      webview: webviewPanel.webview,
      markdown: full,
      remotePath: meta.remotePath,
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

    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    let persisting = false;
    let latestText = full;
    let appliedExternalHash = markdownHash(full);
    const tracking = trackEditor(document.uri, webviewPanel.webview);

    const persistSoon = () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
      saveTimer = setTimeout(() => {
        void (async () => {
          await persistExact(document, latestText, (value) => {
            persisting = value;
          });
          appliedExternalHash = markdownHash(latestText);
          const at = new Date().toISOString();
          if (workflow === "workspace") {
            const nextStatus = draftBarState(getDraftMeta(this.context, document.uri), latestText, {
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
              title: displayTitle(latestText, filename),
            } satisfies HostToWebview);
            await webviewPanel.webview.postMessage({
              type: "status",
              kind: nextStatus.kind,
              label: nextStatus.label,
              publishEnabled: nextStatus.publishEnabled,
              prUrl: nextStatus.prUrl,
              path: getDraftMeta(this.context, document.uri).remotePath ?? filename,
              workflow,
              repoMode: getContentConfig()?.mode ?? "workspace",
            } satisfies HostToWebview);
          } else {
            await webviewPanel.webview.postMessage({
              type: "saved",
              at,
              title: displayTitle(latestText, filename),
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

    let reviewing = false;
    const threads = attachThreadPolling({
      context: this.context,
      document,
      webview: webviewPanel.webview,
      panel: webviewPanel,
      workflow,
      repos,
    });

    const fromWebview = webviewPanel.webview.onDidReceiveMessage(async (message: {
      type?: string;
      text?: string;
      url?: string;
      field?: string;
      value?: string;
      id?: string;
      name?: string;
      data?: string;
      src?: string;
      threadId?: string;
      body?: string;
      resolved?: boolean;
      selectedText?: string;
    }) => {
      if (message.type === "threadsRefresh") {
        await threads.refresh();
        return;
      }
      if (message.type === "threadReply" && typeof message.threadId === "string" && typeof message.body === "string") {
        await handleThreadReply(this.context, document, webviewPanel.webview, repos, message.threadId, message.body);
        return;
      }
      if (message.type === "threadResolve" && typeof message.threadId === "string" && typeof message.resolved === "boolean") {
        await handleThreadResolve(
          this.context,
          document,
          webviewPanel.webview,
          repos,
          message.threadId,
          message.resolved,
        );
        return;
      }
      if (message.type === "threadCreate" && typeof message.selectedText === "string") {
        if (saveTimer) {
          clearTimeout(saveTimer);
          saveTimer = undefined;
        }
        await persistExact(document, latestText, (value) => {
          persisting = value;
        });
        await handleThreadCreate(
          this.context,
          document,
          webviewPanel.webview,
          repos,
          latestText,
          message.selectedText,
        );
        return;
      }
      if (message.type === "edit" && typeof message.text === "string") {
        const { raw } = splitFrontmatter(latestText);
        latestText = joinFrontmatter(raw, stripBlobImages(message.text));
        persistSoon();
        return;
      }
      if (
        message.type === "frontmatter" &&
        typeof message.field === "string" &&
        FRONTMATTER_KEYS.has(message.field as FrontmatterKey) &&
        typeof message.value === "string"
      ) {
        latestText = setFrontmatterField(latestText, message.field as FrontmatterKey, message.value);
        persistSoon();
        return;
      }
      if (message.type === "uploadImage" && typeof message.id === "string" && typeof message.data === "string") {
        try {
          const saved = await saveUploadedImage({
            context: this.context,
            webview: webviewPanel.webview,
            document,
            name: message.name ?? "image.png",
            data: message.data,
          });
          await webviewPanel.webview.postMessage({
            type: "imageUploaded",
            id: message.id,
            src: saved.src,
            webviewUri: saved.webviewUri,
          } satisfies HostToWebview);
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          await vscode.window.showErrorMessage(`Could not save image: ${reason}`);
          await webviewPanel.webview.postMessage({
            type: "imageUploaded",
            id: message.id,
            src: "",
            webviewUri: "",
          } satisfies HostToWebview);
        }
        return;
      }
      if (message.type === "resolveImage" && typeof message.id === "string" && typeof message.src === "string") {
        const webviewUri = await resolveImageSrc({
          context: this.context,
          webview: webviewPanel.webview,
          document,
          src: message.src,
          repos,
        });
        await webviewPanel.webview.postMessage({
          type: "imageResolved",
          id: message.id,
          src: message.src,
          webviewUri,
        } satisfies HostToWebview);
        return;
      }
      if (message.type === "review" || message.type === "publish") {
        if (workflow === "editor") {
          return;
        }
        if (reviewing) {
          return;
        }
        reviewing = true;
        try {
          if (saveTimer) {
            clearTimeout(saveTimer);
            saveTimer = undefined;
          }
          if (typeof message.text === "string") {
            const { raw } = splitFrontmatter(latestText);
            latestText = joinFrontmatter(raw, stripBlobImages(message.text));
          }
          await persistExact(document, latestText, (value) => {
            persisting = value;
          });
          if (message.type === "review") {
            await handleReview(this.context, document, webviewPanel.webview, latestText);
            await threads.refresh();
          } else {
            await handlePublish(this.context, document, webviewPanel.webview, latestText);
            await threads.refresh();
          }
          this.library?.refreshLabels();
        } finally {
          reviewing = false;
        }
        return;
      }
      if (message.type === "openUrl" && typeof message.url === "string") {
        await handleOpenUrl(message.url);
      }
    });

    const fromDoc = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.toString() !== document.uri.toString()) {
        return;
      }
      if (persisting) {
        return;
      }
      const next = event.document.getText();
      const nextHash = markdownHash(next);
      // Only push into the webview when the on-disk/external body actually changed.
      if (nextHash === appliedExternalHash || next === latestText || normalizeMarkdown(next) === normalizeMarkdown(latestText)) {
        latestText = next;
        return;
      }
      appliedExternalHash = nextHash;
      latestText = next;
      const split = splitFrontmatter(next);
      void webviewPanel.webview.postMessage({ type: "setText", text: split.body } satisfies HostToWebview);
      void webviewPanel.webview.postMessage({ type: "frontmatter", fields: split.fields } satisfies HostToWebview);
      if (workflow === "workspace") {
        this.library?.refreshLabels();
      }
    });

    webviewPanel.onDidDispose(() => {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
      threads.dispose();
      tracking.dispose();
      fromWebview.dispose();
      fromDoc.dispose();
      void persistExact(document, latestText, (value) => {
        persisting = value;
      });
    });
  }
}

export function resolveWorkflow(uri: vscode.Uri): Workflow {
  return uri.path.endsWith(".slash.md") ? "workspace" : "editor";
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
): Promise<void> {
  const onDisk = Buffer.from(await vscode.workspace.fs.readFile(document.uri)).toString("utf8");
  if (onDisk === text || normalizeMarkdown(onDisk) === normalizeMarkdown(text)) {
    return;
  }

  setPersisting(true);
  try {
    await vscode.workspace.fs.writeFile(document.uri, Buffer.from(text, "utf8"));
  } finally {
    setTimeout(() => setPersisting(false), 400);
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
