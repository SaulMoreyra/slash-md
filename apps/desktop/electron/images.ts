import fs from "node:fs/promises";
import path from "node:path";
import { referencedImages, sanitizeImageName, uniqueImageRepoPath } from "@slash-md/core/images";
import { imageMarkdownSrc, posixNormalize } from "@slash-md/core/paths";
import { fileExists, getContentConfig, readText, repoFile, writeText } from "./config";
import { getWorkspaceRoot } from "./session";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function requireRoot(): string {
  const root = getWorkspaceRoot();
  if (!root) {
    throw new Error("Abre una carpeta de docs primero.");
  }
  return root;
}

export async function uploadImage(
  pagePath: string,
  name: string,
  bytes: Uint8Array,
): Promise<{ src: string; dataUrl: string }> {
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Image is larger than 8 MB.");
  }
  const root = requireRoot();
  const config = await getContentConfig(root);
  const contentPath = config?.contentPath ?? "";
  const taken = new Set<string>();
  const markdown = await readText(repoFile(root, pagePath)).catch(() => "");
  for (const image of referencedImages(markdown, pagePath)) {
    taken.add(image.repoPath);
  }
  const repoPath = uniqueImageRepoPath(contentPath, sanitizeImageName(name), taken);
  const abs = repoFile(root, repoPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  const buffer = toBuffer(bytes);
  await fs.writeFile(abs, buffer);
  const src = imageMarkdownSrc(pagePath, contentPath, sanitizeImageName(path.posix.basename(repoPath)));
  return { src, dataUrl: dataUrlFor(name, buffer) };
}

export async function resolveImages(pagePath: string, markdown: string): Promise<Record<string, string>> {
  const root = requireRoot();
  const map: Record<string, string> = {};
  for (const { src, repoPath } of referencedImages(markdown, pagePath)) {
    const abs = repoFile(root, posixNormalize(repoPath));
    if (!(await fileExists(abs))) {
      continue;
    }
    const bytes = new Uint8Array(await fs.readFile(abs));
    const url = dataUrlFor(repoPath, bytes);
    map[src] = url;
    map[src.replace(/^\.\//, "")] = url;
    map[posixNormalize(src)] = url;
  }
  return map;
}

function toBuffer(bytes: Uint8Array): Buffer {
  if (Buffer.isBuffer(bytes)) {
    return bytes;
  }
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function dataUrlFor(name: string, bytes: Uint8Array): string {
  const ext = name.split(".").pop()?.toLowerCase();
  const mime =
    ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "gif"
        ? "image/gif"
        : ext === "webp"
          ? "image/webp"
          : ext === "svg"
            ? "image/svg+xml"
            : "image/png";
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
}

export { writeText };
