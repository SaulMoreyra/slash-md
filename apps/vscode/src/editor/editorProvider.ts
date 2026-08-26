import * as vscode from "vscode";
import { joinFrontmatter, setFrontmatterField, splitFrontmatter } from "@slash-md/core/frontmatter";
import { markdownHash } from "@slash-md/core/hash";
import { normalizeMarkdown } from "@slash-md/core/markdown";
import { displayTitle, heroTitleFromMarkdown, HostToWebview } from "@slash-md/core/messaging";
import { FrontmatterKey } from "@slash-md/core/protocol";
import { editorHtml } from "./editorHtml";
import { routeEditorMessage } from "./editorMessageRouter";
import type { EditorSessionDeps, EditorSessionState } from "./editorSessionDeps";
import { pushFileEditors } from "./fileEditorsHost";
import { buildImageMap, imageLocalResourceRoots, resolveImageSrc, saveUploadedImage } from "./imageHost";
import { workspaceDisplayPath } from "./workspacePath";

const SAVE_DEBOUNCE_MS = 300;
const FRONTMATTER_KEYS = new Set<FrontmatterKey>(["title", "icon", "cover", "coverPosition"]);

export class SlashMdEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = "slash-md.editor";

  constructor(private readonly context: vscode.ExtensionContext) {}

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    const filename = document.uri.path.split("/").pop() ?? "draft";
    const full = document.getText();
    const { body, fields } = splitFrontmatter(full);
    const displayPath = workspaceDisplayPath(document.uri);
    const imageRoots = imageLocalResourceRoots(document);
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri, ...imageRoots],
    };
    const init: Extract<HostToWebview, { type: "init" }> = {
      type: "init",
      title: heroTitleFromMarkdown(full) || displayTitle(full, filename),
      path: displayPath,
      savedAt: await fileMtime(document.uri),
      kind: "draft",
      label: "",
      publishEnabled: false,
      workflow: "editor",
      pageKind: "editor",
    };
    const imageMap = await buildImageMap({
      webview: webviewPanel.webview,
      markdown: full,
      document,
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
      persisting: false,
    };
    let appliedExternalHash = markdownHash(full);
    let lastSelfWriteHash = appliedExternalHash;

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
            workflow: "editor",
            pageKind: "editor",
          } satisfies HostToWebview);
        })();
      }, SAVE_DEBOUNCE_MS);
    };

    void pushFileEditors(document, webviewPanel.webview);

    const deps: EditorSessionDeps = {
      state,
      frontmatterKeys: FRONTMATTER_KEYS,
      applyEdit: (bodyMarkdown) => {
        const { raw } = splitFrontmatter(state.latestText);
        state.latestText = joinFrontmatter(raw, stripBlobImages(bodyMarkdown));
      },
      applyFrontmatter: (field, value) => {
        state.latestText = setFrontmatterField(state.latestText, field, value);
      },
      persistSoon,
      uploadImage: async (msg) => {
        try {
          const saved = await saveUploadedImage({
            webview: webviewPanel.webview,
            document,
            name: msg.name ?? "image.png",
            data: msg.data,
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
          webview: webviewPanel.webview,
          document,
          src: msg.src,
        });
        await webviewPanel.webview.postMessage({
          type: "imageResolved",
          id: msg.id,
          src: msg.src,
          webviewUri,
        } satisfies HostToWebview);
      },
      openUrl: (url) => handleOpenUrl(url),
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
    });

    webviewPanel.onDidDispose(() => {
      if (state.saveTimer) {
        clearTimeout(state.saveTimer);
      }
      fromWebview.dispose();
      fromDoc.dispose();
      void persistExact(document, state.latestText, setPersisting);
    });
  }
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

async function handleOpenUrl(url: string): Promise<void> {
  let parsed: vscode.Uri;
  try {
    parsed = vscode.Uri.parse(url);
  } catch {
    return;
  }
  if (parsed.scheme !== "https") {
    return;
  }
  await vscode.env.openExternal(parsed);
}

async function fileMtime(uri: vscode.Uri): Promise<string | null> {
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    return new Date(stat.mtime).toISOString();
  } catch {
    return null;
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
