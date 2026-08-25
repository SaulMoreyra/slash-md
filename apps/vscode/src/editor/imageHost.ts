import * as vscode from "vscode";
import { getDraftMeta } from "../sidecar/draftMeta";
import { ContentConfig, getContentConfig } from "../github/config";
import { ContentRepo } from "../github/contentRepo";
import { ImageStore } from "../sidecar/imageStore";
import { defaultDocPath, referencedImages, sanitizeImageName, uniqueImageRepoPath } from "@slash-md/core/images";
import { imageRepoPath, posixBasename, posixDirname, posixJoin, posixNormalize, relativeHref } from "@slash-md/core/paths";
import { docsContentRemotePath, docsLibraryRoot, relativePosix } from "../workspace/docsWorkspace";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function imagesRoot(context: vscode.ExtensionContext): vscode.Uri {
  return new ImageStore(context).root();
}

/** Webview roots that may host image bytes (sidecar cache + workspace images folders). */
export async function imageLocalResourceRoots(
  context: vscode.ExtensionContext,
  document: vscode.TextDocument,
): Promise<vscode.Uri[]> {
  const roots: vscode.Uri[] = [imagesRoot(context)];
  const config = getContentConfig();
  if (config) {
    const library = await docsLibraryRoot(config);
    if (library) {
      const folder = workspaceImagesDir(library, config.contentPath);
      roots.push(folder);
    }
  }
  const beside = besideDocImagesDir(document.uri);
  if (beside && !roots.some((r) => r.toString() === beside.toString())) {
    roots.push(beside);
  }
  return roots;
}

export async function buildImageMap(opts: {
  context: vscode.ExtensionContext;
  webview: vscode.Webview;
  markdown: string;
  document?: vscode.TextDocument;
  remotePath?: string;
  repos?: ContentRepo;
}): Promise<Record<string, string>> {
  const config = getContentConfig();
  const contentPath = config?.contentPath ?? "";
  const docPath = await resolveDocPath({
    context: opts.context,
    document: opts.document,
    contentPath,
    remotePath: opts.remotePath,
  });
  const store = new ImageStore(opts.context);
  const library = config ? await docsLibraryRoot(config) : undefined;
  const map: Record<string, string> = {};

  for (const { src, repoPath } of referencedImages(opts.markdown, docPath)) {
    const resolved = await resolveImageBytes({
      context: opts.context,
      document: opts.document,
      repoPath,
      src,
      config,
      library,
      store,
      repos: opts.repos,
    });
    if (!resolved) {
      continue;
    }
    const uri = opts.webview.asWebviewUri(resolved.file).toString();
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
  wikiPath?: string;
}): Promise<{ src: string; webviewUri: string }> {
  const raw = Buffer.from(opts.data, "base64");
  if (raw.byteLength === 0) {
    throw new Error("Image is empty.");
  }
  if (raw.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Image exceeds 8 MB.");
  }

  const config = getContentConfig();
  const contentPath = config?.contentPath ?? "";
  const meta = getDraftMeta(opts.context, opts.document.uri);
  const wikiPath =
    opts.wikiPath ??
    (config ? await docsContentRemotePath(opts.document.uri, config) : undefined);
  const workspacePath = workspaceRelativeDocPath(opts.document.uri);
  const docPath = defaultDocPath(
    contentPath,
    wikiPath ?? meta.remotePath ?? workspacePath ?? posixBasename(opts.document.uri.path),
  );
  const filename = sanitizeImageName(opts.name);
  const target = await pickUploadTarget({
    context: opts.context,
    document: opts.document,
    config,
    wikiPath: wikiPath ?? meta.remotePath,
    contentPath,
    filename,
    workspacePath,
  });

  await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(target.file, ".."));
  await vscode.workspace.fs.writeFile(target.file, raw);

  return {
    src: relativeHref(docPath, target.repoPath),
    webviewUri: opts.webview.asWebviewUri(target.file).toString(),
  };
}

export async function resolveImageSrc(opts: {
  context: vscode.ExtensionContext;
  webview: vscode.Webview;
  document: vscode.TextDocument;
  src: string;
  repos?: ContentRepo;
  wikiPath?: string;
}): Promise<string | undefined> {
  const config = getContentConfig();
  const wikiPath =
    opts.wikiPath ??
    (config ? await docsContentRemotePath(opts.document.uri, config) : undefined);
  const meta = getDraftMeta(opts.context, opts.document.uri);
  const map = await buildImageMap({
    context: opts.context,
    webview: opts.webview,
    markdown: `![](${opts.src})`,
    document: opts.document,
    remotePath: wikiPath ?? meta.remotePath,
    repos: opts.repos,
  });
  return map[opts.src] ?? map[opts.src.replace(/^\.\//, "")];
}

/** Read image bytes for review: workspace disk first, then ImageStore. */
export async function readImageBytesForReview(
  context: vscode.ExtensionContext,
  repoPath: string,
  libraryRoot?: vscode.Uri,
): Promise<Uint8Array | undefined> {
  if (libraryRoot) {
    const disk = await readWorkspaceFile(libraryRoot, repoPath);
    if (disk) {
      return disk;
    }
  }
  return new ImageStore(context).read(repoPath);
}

type UploadTarget = { file: vscode.Uri; repoPath: string };

async function pickUploadTarget(opts: {
  context: vscode.ExtensionContext;
  document: vscode.TextDocument;
  config: ContentConfig | undefined;
  wikiPath: string | undefined;
  contentPath: string;
  filename: string;
  workspacePath?: string;
}): Promise<UploadTarget> {
  const isSidecarDraft = opts.document.uri.path.endsWith(".slash.md");

  // Legacy sidecar drafts keep using ImageStore.
  if (isSidecarDraft && !opts.wikiPath) {
    const store = new ImageStore(opts.context);
    const repoPath = await allocateSidecarPath(store, opts.contentPath, opts.filename);
    return { file: store.file(repoPath), repoPath };
  }

  // Wiki page under contentPath → shared {contentPath}/images/.
  if (opts.config && opts.wikiPath) {
    const library = await docsLibraryRoot(opts.config);
    if (library) {
      const repoPath = await allocateDiskPath(library, opts.contentPath, opts.filename);
      return { file: workspaceFile(library, repoPath), repoPath };
    }
  }

  // Loose .md (editor workflow) → {dirname}/images/.
  const docPosix = opts.workspacePath ?? posixBasename(opts.document.uri.path);
  const folder = vscode.Uri.joinPath(opts.document.uri, "..");
  const repoPath = await allocateBesidePath(folder, posixDirname(docPosix), opts.filename);
  return { file: workspaceFile(folder, posixJoin("images", posixBasename(repoPath))), repoPath };
}

async function allocateSidecarPath(store: ImageStore, contentPath: string, filename: string): Promise<string> {
  const taken = new Set<string>();
  let repoPath = uniqueImageRepoPath(contentPath, filename, taken);
  let n = 2;
  while (await store.read(repoPath)) {
    taken.add(repoPath);
    repoPath = uniqueImageRepoPath(contentPath, `${stemWithN(filename, n)}`, taken);
    n += 1;
  }
  return repoPath;
}

async function allocateDiskPath(root: vscode.Uri, contentPath: string, filename: string): Promise<string> {
  const taken = new Set<string>();
  let repoPath = uniqueImageRepoPath(contentPath, filename, taken);
  let n = 2;
  while (await fileExists(workspaceFile(root, repoPath))) {
    taken.add(repoPath);
    repoPath = uniqueImageRepoPath(contentPath, stemWithN(filename, n), taken);
    n += 1;
  }
  return repoPath;
}

async function allocateBesidePath(docDir: vscode.Uri, docDirPosix: string, filename: string): Promise<string> {
  const safe = sanitizeImageName(filename);
  const imagesDirPosix = docDirPosix ? posixJoin(docDirPosix, "images") : "images";
  let candidate = posixJoin(imagesDirPosix, safe);
  let n = 2;
  while (await fileExists(vscode.Uri.joinPath(docDir, "images", posixBasename(candidate)))) {
    candidate = posixJoin(imagesDirPosix, stemWithN(safe, n));
    n += 1;
  }
  return candidate;
}

async function resolveDocPath(opts: {
  context: vscode.ExtensionContext;
  document?: vscode.TextDocument;
  contentPath: string;
  remotePath?: string;
}): Promise<string> {
  if (opts.remotePath) {
    return opts.remotePath;
  }
  if (opts.document) {
    const config = getContentConfig();
    const wiki = config ? await docsContentRemotePath(opts.document.uri, config) : undefined;
    if (wiki) {
      return wiki;
    }
    const meta = getDraftMeta(opts.context, opts.document.uri);
    if (meta.remotePath) {
      return meta.remotePath;
    }
    const relative = workspaceRelativeDocPath(opts.document.uri);
    if (relative) {
      return relative;
    }
  }
  return defaultDocPath(opts.contentPath, undefined);
}

async function resolveImageBytes(opts: {
  context: vscode.ExtensionContext;
  document?: vscode.TextDocument;
  repoPath: string;
  src: string;
  config: ContentConfig | undefined;
  library: vscode.Uri | undefined;
  store: ImageStore;
  repos?: ContentRepo;
}): Promise<{ file: vscode.Uri } | undefined> {
  // 1. Workspace disk (library or beside the open document).
  if (opts.library) {
    const file = workspaceFile(opts.library, opts.repoPath);
    if (await fileExists(file)) {
      return { file };
    }
  }
  if (opts.document) {
    const beside = resolveBesideFile(opts.document.uri, opts.src);
    if (beside && (await fileExists(beside))) {
      return { file: beside };
    }
  }

  // 2. ImageStore (cache / legacy uploads).
  const cached = await opts.store.read(opts.repoPath);
  if (cached) {
    return { file: opts.store.file(opts.repoPath) };
  }

  // 3. GitHub blob → cache in ImageStore.
  if (opts.repos && opts.config) {
    try {
      const bytes = await opts.repos.readBlob(opts.config, opts.repoPath);
      await opts.store.save(opts.repoPath, bytes);
      return { file: opts.store.file(opts.repoPath) };
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function workspaceImagesDir(library: vscode.Uri, contentPath: string): vscode.Uri {
  const repoPath = imageRepoPath(contentPath, "_");
  return vscode.Uri.joinPath(library, ...posixDirname(repoPath).split("/").filter(Boolean));
}

function besideDocImagesDir(uri: vscode.Uri): vscode.Uri | undefined {
  if (uri.scheme !== "file" && uri.scheme !== "vscode-remote") {
    return undefined;
  }
  return vscode.Uri.joinPath(uri, "..", "images");
}

function resolveBesideFile(docUri: vscode.Uri, src: string): vscode.Uri | undefined {
  const pathOnly = src.split("#")[0]?.split("?")[0] ?? "";
  if (!pathOnly || pathOnly.includes("://") || pathOnly.startsWith("/") || pathOnly.startsWith("blob:")) {
    return undefined;
  }
  const segments = pathOnly.split("/").filter((part) => part && part !== ".");
  if (segments.length === 0) {
    return undefined;
  }
  return vscode.Uri.joinPath(docUri, "..", ...segments);
}

function workspaceRelativeDocPath(uri: vscode.Uri): string | undefined {
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (!folder) {
    return undefined;
  }
  return relativePosix(folder.uri, uri);
}

function workspaceFile(root: vscode.Uri, repoPath: string): vscode.Uri {
  return vscode.Uri.joinPath(root, ...posixNormalize(repoPath).split("/").filter(Boolean));
}

async function readWorkspaceFile(root: vscode.Uri, repoPath: string): Promise<Uint8Array | undefined> {
  try {
    return await vscode.workspace.fs.readFile(workspaceFile(root, repoPath));
  } catch {
    return undefined;
  }
}

async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    return (stat.type & vscode.FileType.File) !== 0;
  } catch {
    return false;
  }
}

function stemWithN(filename: string, n: number): string {
  const safe = sanitizeImageName(filename);
  const dot = safe.lastIndexOf(".");
  const stem = dot > 0 ? safe.slice(0, dot) : safe;
  const ext = dot > 0 ? safe.slice(dot) : ".png";
  return `${stem}-${n}${ext}`;
}
