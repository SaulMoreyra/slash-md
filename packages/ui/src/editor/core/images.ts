import type { HostToWebview } from "@slash-md/core/protocol";
import type { EditorContext } from "../context";

async function fileToBase64(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (const byte of buf) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function uploadImage(ctx: EditorContext, file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    ctx.state.pendingImages.set(id, { resolve, reject });
    void fileToBase64(file).then((data) => {
      ctx.post({
        type: "uploadImage",
        id,
        name: file.name || "image.png",
        mime: file.type || "image/png",
        data,
      });
    }, reject);
    window.setTimeout(() => {
      if (ctx.state.pendingImages.delete(id)) {
        reject(new Error("timeout"));
      }
    }, 20_000);
  });
}

export function proxyImage(ctx: EditorContext, url: string): string | Promise<string> {
  if (/^(https?:|data:|blob:|vscode-webview:)/i.test(url)) {
    return url;
  }
  const { imageMap } = ctx.state;
  const mapped = imageMap[url] ?? imageMap[url.replace(/^\.\//, "")];
  if (mapped) {
    return mapped;
  }
  const id = `resolve-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return new Promise((resolve) => {
    ctx.state.pendingImages.set(id, {
      resolve: (src) => resolve(src || url),
      reject: () => resolve(url),
    });
    ctx.post({ type: "resolveImage", id, src: url });
    window.setTimeout(() => {
      if (ctx.state.pendingImages.delete(id)) {
        resolve(url);
      }
    }, 8_000);
  });
}

export function handleImageMessage(ctx: EditorContext, msg: HostToWebview): boolean {
  if (msg.type === "imageUploaded") {
    const pending = ctx.state.pendingImages.get(msg.id);
    ctx.state.pendingImages.delete(msg.id);
    if (!msg.src) {
      pending?.reject(new Error("upload failed"));
      return true;
    }
    ctx.state.imageMap[msg.src] = msg.webviewUri;
    pending?.resolve(msg.src);
    return true;
  }
  if (msg.type === "imageResolved") {
    const pending = ctx.state.pendingImages.get(msg.id);
    ctx.state.pendingImages.delete(msg.id);
    if (msg.webviewUri) {
      ctx.state.imageMap[msg.src] = msg.webviewUri;
      pending?.resolve(msg.webviewUri);
    } else {
      pending?.resolve(msg.src);
    }
    return true;
  }
  if (msg.type === "imageMap") {
    Object.assign(ctx.state.imageMap, msg.map);
    return true;
  }
  return false;
}
