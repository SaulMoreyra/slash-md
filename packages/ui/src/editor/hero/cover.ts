import type { FrontmatterFields, HostToWebview, WebviewToHost } from "@slash-md/core/protocol";
import { buildCoverSwatches, isCoverMenuTarget, toggleCoverMenu } from "./coverMenu";
import {
  DEFAULT_POSITION,
  POSITION_DEBOUNCE_MS,
  coverColorHex,
  isCoverColor,
  parsePosition,
  clamp,
} from "./coverModel";

export { isCoverColor, coverColorHex } from "./coverModel";

type CoverDeps = {
  vscode: { postMessage(message: WebviewToHost): void };
  imageMap: Record<string, string>;
  uploadImage: (file: File) => Promise<string>;
  resolveImage: (src: string) => string | Promise<string>;
};

export function mountCover(
  deps: CoverDeps,
  initial: FrontmatterFields,
): { apply(fields: FrontmatterFields): void; onHostMessage(msg: HostToWebview): void } {
  const coverEl = document.getElementById("cover")!;
  const coverImg = document.getElementById("cover-img") as HTMLImageElement;
  const pageEl = document.getElementById("page")!;
  const addBtn = document.getElementById("cover-add") as HTMLButtonElement;
  const changeBtn = document.getElementById("cover-change") as HTMLButtonElement;
  const repositionBtn = document.getElementById("cover-reposition") as HTMLButtonElement;
  const removeBtn = document.getElementById("cover-remove") as HTMLButtonElement;
  const fileInput = document.getElementById("cover-file") as HTMLInputElement;
  const menuEl = document.getElementById("cover-menu")!;
  const uploadBtn = document.getElementById("cover-upload") as HTMLButtonElement;
  const swatchesEl = document.getElementById("cover-swatches")!;

  const menuEls = { menuEl, pageEl, addBtn, changeBtn, swatchesEl };

  let coverSrc = "";
  let position = DEFAULT_POSITION;
  let repositioning = false;
  let positionTimer: ReturnType<typeof setTimeout> | undefined;
  let dragStartY = 0;
  let dragStartPos = DEFAULT_POSITION;
  let menuOpen = false;

  buildCoverSwatches(swatchesEl, selectColor);
  apply(initial);

  addBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    setMenuOpen(!menuOpen, addBtn);
  });
  changeBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    setMenuOpen(!menuOpen, changeBtn);
  });
  uploadBtn.addEventListener("click", () => {
    closeMenu();
    fileInput.click();
  });
  removeBtn.addEventListener("click", () => {
    closeMenu();
    clearCover();
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) {
      return;
    }
    void deps.uploadImage(file).then(
      (src) => {
        const mapped = deps.imageMap[src] ?? deps.imageMap[src.replace(/^\.\//, "")];
        const nextPos = position || DEFAULT_POSITION;
        setCover(src, nextPos, mapped);
        deps.vscode.postMessage({ type: "frontmatter", field: "cover", value: src });
        deps.vscode.postMessage({
          type: "frontmatter",
          field: "coverPosition",
          value: String(nextPos),
        });
      },
      (err: Error) => {
        console.error("cover upload failed", err);
      },
    );
  });

  repositionBtn.addEventListener("click", () => {
    if (!coverSrc || isCoverColor(coverSrc)) {
      return;
    }
    repositioning = !repositioning;
    coverEl.classList.toggle("is-repositioning", repositioning);
    repositionBtn.textContent = repositioning ? "Done" : "Reposition";
    coverImg.style.cursor = repositioning ? "ns-resize" : "";
  });

  const onPointerMove = (ev: PointerEvent) => {
    if (!repositioning || isCoverColor(coverSrc)) {
      return;
    }
    const height = coverEl.getBoundingClientRect().height || 1;
    const delta = ((ev.clientY - dragStartY) / height) * 100;
    position = clamp(dragStartPos - delta, 0, 100);
    applyPosition(position);
    schedulePositionSave(position);
  };

  const onPointerUp = () => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  };

  coverImg.addEventListener("pointerdown", (ev) => {
    if (!repositioning || isCoverColor(coverSrc)) {
      return;
    }
    ev.preventDefault();
    dragStartY = ev.clientY;
    dragStartPos = position;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  });

  document.addEventListener("pointerdown", (ev) => {
    if (!menuOpen) {
      return;
    }
    if (isCoverMenuTarget(menuEls, ev.target as Node | null)) {
      return;
    }
    closeMenu();
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && menuOpen) {
      closeMenu();
    }
  });

  function onHostMessage(msg: HostToWebview): void {
    if (msg.type === "imageMap") {
      Object.assign(deps.imageMap, msg.map);
      if (coverSrc && !isCoverColor(coverSrc)) {
        void refreshSrc(coverSrc);
      }
      return;
    }
    if (msg.type === "imageUploaded" && msg.src) {
      deps.imageMap[msg.src] = msg.webviewUri;
      return;
    }
    if (msg.type === "imageResolved" && msg.src && msg.webviewUri) {
      deps.imageMap[msg.src] = msg.webviewUri;
      if (msg.src === coverSrc || msg.src.replace(/^\.\//, "") === coverSrc.replace(/^\.\//, "")) {
        coverImg.src = msg.webviewUri;
      }
    }
  }

  function selectColor(hex: string): void {
    const value = `color:${hex}`;
    closeMenu();
    setCover(value, DEFAULT_POSITION);
    deps.vscode.postMessage({ type: "frontmatter", field: "cover", value });
    deps.vscode.postMessage({ type: "frontmatter", field: "coverPosition", value: "" });
  }

  function clearCover(): void {
    setCover("", DEFAULT_POSITION);
    deps.vscode.postMessage({ type: "frontmatter", field: "cover", value: "" });
    deps.vscode.postMessage({ type: "frontmatter", field: "coverPosition", value: "" });
  }

  function setMenuOpen(open: boolean, anchor: HTMLElement): void {
    menuOpen = open;
    toggleCoverMenu(menuEls, open, anchor);
  }

  function closeMenu(): void {
    if (!menuOpen) {
      return;
    }
    setMenuOpen(false, addBtn);
  }

  function apply(fields: FrontmatterFields): void {
    const next = (fields.cover ?? "").trim();
    const nextPos = parsePosition(fields.coverPosition);
    if (next === coverSrc && nextPos === position) {
      pageEl.classList.toggle("has-cover", Boolean(next));
      syncChrome(next);
      return;
    }
    position = nextPos;
    if (!next) {
      setCover("", DEFAULT_POSITION);
      return;
    }
    if (isCoverColor(next)) {
      setCover(next, DEFAULT_POSITION);
      return;
    }
    void refreshSrc(next).then((uri) => {
      setCover(next, nextPos, uri);
    });
  }

  async function refreshSrc(src: string): Promise<string | undefined> {
    if (/^(https?:|data:|blob:|vscode-webview:)/i.test(src)) {
      return src;
    }
    const mapped = deps.imageMap[src] ?? deps.imageMap[src.replace(/^\.\//, "")];
    if (mapped) {
      return mapped;
    }
    const resolved = await Promise.resolve(deps.resolveImage(src));
    return resolved || undefined;
  }

  function setCover(src: string, pos: number, webviewUri?: string): void {
    coverSrc = src;
    position = src && !isCoverColor(src) ? pos : DEFAULT_POSITION;
    pageEl.classList.toggle("has-cover", Boolean(src));
    syncChrome(src);

    if (!src) {
      coverEl.hidden = true;
      coverImg.hidden = true;
      coverImg.removeAttribute("src");
      coverEl.style.background = "";
      coverEl.classList.remove("is-color", "is-repositioning");
      repositioning = false;
      repositionBtn.textContent = "Reposition";
      coverImg.style.cursor = "";
      return;
    }

    coverEl.hidden = false;
    const color = coverColorHex(src);
    if (color) {
      coverEl.classList.add("is-color");
      coverEl.classList.remove("is-repositioning");
      coverEl.style.background = color;
      coverImg.hidden = true;
      coverImg.removeAttribute("src");
      repositioning = false;
      repositionBtn.textContent = "Reposition";
      return;
    }

    coverEl.classList.remove("is-color");
    coverEl.style.background = "";
    coverImg.hidden = false;
    if (webviewUri) {
      coverImg.src = webviewUri;
    } else if (/^(https?:|data:|blob:|vscode-webview:)/i.test(src)) {
      coverImg.src = src;
    }
    applyPosition(position);
  }

  function syncChrome(src: string): void {
    const isColor = isCoverColor(src);
    repositionBtn.hidden = !src || isColor;
  }

  function applyPosition(pos: number): void {
    coverImg.style.objectPosition = `50% ${pos}%`;
  }

  function schedulePositionSave(pos: number): void {
    if (positionTimer) {
      clearTimeout(positionTimer);
    }
    positionTimer = setTimeout(() => {
      deps.vscode.postMessage({
        type: "frontmatter",
        field: "coverPosition",
        value: String(Math.round(pos)),
      });
    }, POSITION_DEBOUNCE_MS);
  }

  return { apply, onHostMessage };
}
