import * as vscode from "vscode";
import { referencedImages, sanitizeImageName } from "@slash-md/core/images";
import { posixBasename, posixDirname, posixJoin, posixNormalize, relativeHref } from "@slash-md/core/paths";
import { workspaceRelativeDocPath } from "./workspacePath";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Folder that may host pasted images (`{docDir}/images/`). */
export function imageLocalResourceRoots(document: vscode.TextDocument): vscode.Uri[] {
  const dir = vscode.Uri.joinPath(document.uri, "..");
  return [dir];
}

export async function buildImageMap(opts: {
  webview: vscode.Webview;
  markdown: string;
  document: vscode.TextDocument;
}): Promise<Record<string, string>> {
  const docPath = docPathFor(opts.document);
  const map: Record<string, string> = {};

  for (const { src } of referencedImages(opts.markdown, docPath)) {
    const file = resolveBesideFile(opts.document.uri, src);
    if (!file || !(await fileExists(file))) {
      continue;
    }
    const uri = opts.webview.asWebviewUri(file).toString();
    map[src] = uri;
    map[src.replace(/^\.\//, "")] = uri;
    map[posixNormalize(src)] = uri;
  }
  return map;
}

export async function saveUploadedImage(opts: {
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

  const docPath = docPathFor(opts.document);
  const folder = vscode.Uri.joinPath(opts.document.uri, "..");
  const filename = sanitizeImageName(opts.name);
  const repoPath = await allocateBesidePath(folder, posixDirname(docPath), filename);
  const file = vscode.Uri.joinPath(folder, "images", posixBasename(repoPath));

  await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(file, ".."));
  await vscode.workspace.fs.writeFile(file, raw);

  return {
    src: relativeHref(docPath, repoPath),
    webviewUri: opts.webview.asWebviewUri(file).toString(),
  };
}

export async function resolveImageSrc(opts: {
  webview: vscode.Webview;
  document: vscode.TextDocument;
  src: string;
}): Promise<string | undefined> {
  const map = await buildImageMap({
    webview: opts.webview,
    markdown: `![](${opts.src})`,
    document: opts.document,
  });
  return map[opts.src] ?? map[opts.src.replace(/^\.\//, "")];
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

function docPathFor(document: vscode.TextDocument): string {
  return workspaceRelativeDocPath(document.uri) ?? posixBasename(document.uri.path);
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
