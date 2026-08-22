import type { CrepeBuilder } from "@milkdown/crepe/builder";
import type { HostToWebview, ReviewThread, WebviewBoot, WebviewToHost } from "../src/protocol";
import { mountBar, type VsCodeApi } from "./bar";
import { mountComments, type CommentsHandle } from "./comments";
import { mountCover } from "./cover";
import { createSlashCrepe, setCrepeMarkdown } from "./crepe";
import { mountFrontmatter } from "./frontmatter";
import { normalizeMarkdown } from "../src/markdown";
import { mountThreadChrome } from "./threadChrome";
import "./theme.css";

declare function acquireVsCodeApi(): VsCodeApi;

const SAVE_DEBOUNCE_MS = 300;
const boot = (window as unknown as Window & { __SLASH_MD__: WebviewBoot }).__SLASH_MD__;
const vscode = acquireVsCodeApi();
let crepe: CrepeBuilder | undefined;
let comments: CommentsHandle | undefined;
let applyingExternal = false;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let lastSent = normalizeMarkdown(boot.text);
const imageMap: Record<string, string> = { ...(boot.imageMap ?? {}) };
const pendingImages = new Map<string, { resolve: (src: string) => void; reject: (err: Error) => void }>();
let latestThreads: ReviewThread[] = [];
let canWriteThreads = false;

const bar = mountBar(vscode, boot.init, () => {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = undefined;
  }
  if (!crepe) {
    return undefined;
  }
  const markdown = crepe.getMarkdown();
  lastSent = normalizeMarkdown(markdown);
  bar.persist(markdown);
  return markdown;
});
mountFrontmatter(vscode, boot.frontmatter);
mountCover(
  {
    vscode,
    imageMap,
    uploadImage,
    resolveImage: proxyImage,
  },
  boot.frontmatter,
);
const chrome = mountThreadChrome(vscode);
const canvas = document.getElementById("canvas");

if (!canvas) {
  throw new Error("slash-md: missing #canvas");
}

const wantComments =
  boot.init.workflow === "workspace" && (boot.init.repoMode ?? "workspace") === "workspace";

void start();

async function start(): Promise<void> {
  crepe = await createSlashCrepe({
    root: canvas!,
    markdown: boot.text,
    onUpload: uploadImage,
    proxyDomURL: proxyImage,
    comments: wantComments,
    onCommentSelection: wantComments
      ? (selectedText) => {
          if (!canWriteThreads) {
            return;
          }
          vscode.postMessage({
            type: "threadCreate",
            selectedText,
          } satisfies WebviewToHost);
        }
      : undefined,
    onMarkdown: (markdown) => {
      if (applyingExternal) {
        return;
      }
      if (normalizeMarkdown(markdown) === lastSent) {
        return;
      }
      scheduleSave(markdown);
      if (comments && latestThreads.length > 0) {
        comments.apply(latestThreads);
      }
    },
  });
  if (wantComments) {
    comments = mountComments(crepe.editor, {
      onOpenThread: (thread) => chrome.showThread(thread),
      onOrphans: (orphans) => chrome.setOrphans(orphans),
    });
  }
  bar.persist(crepe.getMarkdown());
  if (wantComments) {
    vscode.postMessage({ type: "threadsRefresh" } satisfies WebviewToHost);
  }
}

function scheduleSave(markdown: string): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    lastSent = normalizeMarkdown(markdown);
    bar.persist(markdown);
    vscode.postMessage({ type: "edit", text: markdown });
  }, SAVE_DEBOUNCE_MS);
}

function uploadImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    pendingImages.set(id, { resolve, reject });
    void fileToBase64(file).then((data) => {
      vscode.postMessage({
        type: "uploadImage",
        id,
        name: file.name || "image.png",
        mime: file.type || "image/png",
        data,
      } satisfies WebviewToHost);
    }, reject);
    window.setTimeout(() => {
      if (pendingImages.delete(id)) {
        reject(new Error("timeout"));
      }
    }, 20_000);
  });
}

function proxyImage(url: string): string | Promise<string> {
  if (/^(https?:|data:|blob:|vscode-webview:)/i.test(url)) {
    return url;
  }
  const mapped = imageMap[url] ?? imageMap[url.replace(/^\.\//, "")];
  if (mapped) {
    return mapped;
  }
  const id = `resolve-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return new Promise((resolve) => {
    pendingImages.set(id, {
      resolve: (src) => resolve(src || url),
      reject: () => resolve(url),
    });
    vscode.postMessage({ type: "resolveImage", id, src: url } satisfies WebviewToHost);
    window.setTimeout(() => {
      if (pendingImages.delete(id)) {
        resolve(url);
      }
    }, 8_000);
  });
}

async function fileToBase64(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (const byte of buf) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

window.addEventListener("message", (event: MessageEvent<HostToWebview>) => {
  const msg = event.data;
  if (!msg || !msg.type) {
    return;
  }
  if (msg.type === "setText" && crepe) {
    if (normalizeMarkdown(msg.text) === normalizeMarkdown(crepe.getMarkdown())) {
      return;
    }
    applyingExternal = true;
    try {
      setCrepeMarkdown(crepe, msg.text);
      lastSent = normalizeMarkdown(msg.text);
      bar.persist(msg.text);
    } finally {
      applyingExternal = false;
    }
    if (comments && latestThreads.length > 0) {
      comments.apply(latestThreads);
    }
    return;
  }
  if (msg.type === "threads") {
    latestThreads = msg.threads ?? [];
    canWriteThreads = Boolean(msg.canWrite);
    chrome.setCanWrite(canWriteThreads);
    if (comments) {
      comments.apply(latestThreads);
    } else {
      chrome.setOrphans([]);
    }
    return;
  }
  if (msg.type === "imageUploaded") {
    const pending = pendingImages.get(msg.id);
    pendingImages.delete(msg.id);
    if (!msg.src) {
      pending?.reject(new Error("upload failed"));
      return;
    }
    imageMap[msg.src] = msg.webviewUri;
    pending?.resolve(msg.src);
    return;
  }
  if (msg.type === "imageResolved") {
    const pending = pendingImages.get(msg.id);
    pendingImages.delete(msg.id);
    if (msg.webviewUri) {
      imageMap[msg.src] = msg.webviewUri;
      pending?.resolve(msg.webviewUri);
    } else {
      pending?.resolve(msg.src);
    }
    return;
  }
  if (msg.type === "imageMap") {
    Object.assign(imageMap, msg.map);
  }
});

window.addEventListener("pagehide", shutdown);
window.addEventListener("unload", shutdown);

function shutdown(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = undefined;
  }
  comments?.destroy();
  comments = undefined;
  chrome.destroy();
  if (crepe) {
    void crepe.destroy();
    crepe = undefined;
  }
}
