import * as vscode from "vscode";
import { getDraftMeta } from "./draftMeta";
import { getContentConfig } from "./github/config";
import { ContentRepo } from "./github/contentRepo";
import { ImageStore } from "./imageStore";
import { defaultDocPath, referencedImages, sanitizeImageName, uniqueImageRepoPath } from "./images";
import { posixNormalize, relativeHref } from "./paths";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function imagesRoot(context: vscode.ExtensionContext): vscode.Uri {
  return new ImageStore(context).root();
}

export async function buildImageMap(opts: {
  context: vscode.ExtensionContext;
  webview: vscode.Webview;
  markdown: string;
  remotePath?: string;
  repos?: ContentRepo;
}): Promise<Record<string, string>> {
  const config = getContentConfig();
  const contentPath = config?.contentPath ?? "docs";
  const docPath = defaultDocPath(contentPath, opts.remotePath);
  const store = new ImageStore(opts.context);
  const map: Record<string, string> = {};

  for (const { src, repoPath } of referencedImages(opts.markdown, docPath)) {
    let bytes = await store.read(repoPath);
    if (!bytes && opts.repos && config) {
      try {
        bytes = await opts.repos.readBlob(config, repoPath);
        await store.save(repoPath, bytes);
      } catch {
        bytes = undefined;
      }
    }
    if (!bytes) {
      continue;
    }
    const uri = opts.webview.asWebviewUri(store.file(repoPath)).toString();
    map[src] = uri;
    map[src.replace(/^\.\//, "")] = uri;
    map[posixNormalize(src)] = uri;
  }
  return map;
}

export async function saveUploadedImage(opts: {
  context: vscode.ExtensionContext;
  webview: vscode.Webview;
  document: vscode.TextDocument;
  name: string;
  data: string;
}): Promise<{ src: string; webviewUri: string }> {
  const raw = Buffer.from(opts.data, "base64");
  if (raw.byteLength === 0) {
    throw new Error("Image is empty.");
  }
  if (raw.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Image exceeds 8 MB.");
  }
  const config = getContentConfig();
  const contentPath = config?.contentPath ?? "docs";
  const meta = getDraftMeta(opts.context, opts.document.uri);
  const docPath = defaultDocPath(contentPath, meta.remotePath);
  const store = new ImageStore(opts.context);
  const taken = new Set<string>();
  let repoPath = uniqueImageRepoPath(contentPath, sanitizeImageName(opts.name), taken);
  let n = 2;
  while (await store.read(repoPath)) {
    taken.add(repoPath);
    repoPath = uniqueImageRepoPath(contentPath, `${n}-${sanitizeImageName(opts.name)}`, taken);
    n += 1;
  }
  const uri = await store.save(repoPath, raw);
  return {
    src: relativeHref(docPath, repoPath),
    webviewUri: opts.webview.asWebviewUri(uri).toString(),
  };
}

export async function resolveImageSrc(opts: {
  context: vscode.ExtensionContext;
  webview: vscode.Webview;
  document: vscode.TextDocument;
  src: string;
  repos?: ContentRepo;
}): Promise<string | undefined> {
  const map = await buildImageMap({
    context: opts.context,
    webview: opts.webview,
    markdown: `![](${opts.src})`,
    remotePath: getDraftMeta(opts.context, opts.document.uri).remotePath,
    repos: opts.repos,
  });
  return map[opts.src] ?? map[opts.src.replace(/^\.\//, "")];
}
