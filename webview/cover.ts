import type { FrontmatterFields, HostToWebview, WebviewToHost } from "../src/protocol";

const POSITION_DEBOUNCE_MS = 200;
const DEFAULT_POSITION = 50;

/** Solid covers stored as `color:#RRGGBB` in frontmatter.cover. */
const COVER_COLORS: { hex: string; label: string }[] = [
  { hex: "#E3E2E0", label: "Gray" },
  { hex: "#F1E3D4", label: "Brown" },
  { hex: "#F6E0C6", label: "Orange" },
  { hex: "#F9E4A8", label: "Yellow" },
  { hex: "#DDEDEA", label: "Green" },
  { hex: "#D3E5EF", label: "Blue" },
  { hex: "#E8DEEE", label: "Purple" },
  { hex: "#F5E0E9", label: "Pink" },
  { hex: "#FFE2DD", label: "Red" },
  { hex: "#37352F", label: "Dark" },
];

type CoverDeps = {
  vscode: { postMessage(message: WebviewToHost): void };
  imageMap: Record<string, string>;
  uploadImage: (file: File) => Promise<string>;
  resolveImage: (src: string) => string | Promise<string>;
};

export function isCoverColor(value: string): boolean {
  return /^color:#[0-9a-fA-F]{3,8}$/.test(value.trim());
}

export function coverColorHex(value: string): string | undefined {
  if (!isCoverColor(value)) {
    return undefined;
  }
  return value.trim().slice("color:".length);
}

export function mountCover(
  deps: CoverDeps,
  initial: FrontmatterFields,
): { apply(fields: FrontmatterFields): void } {
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

  let coverSrc = "";
  let position = DEFAULT_POSITION;
  let repositioning = false;
  let positionTimer: ReturnType<typeof setTimeout> | undefined;
  let dragStartY = 0;
  let dragStartPos = DEFAULT_POSITION;
  let menuOpen = false;

  buildSwatches();
  apply(initial);

  addBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    toggleMenu(!menuOpen, addBtn);
  });
  changeBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    toggleMenu(!menuOpen, changeBtn);
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
    const target = ev.target as Node | null;
    if (menuEl.contains(target) || addBtn.contains(target) || changeBtn.contains(target)) {
      return;
    }
    closeMenu();
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && menuOpen) {
      closeMenu();
    }
  });

  window.addEventListener("message", (event: MessageEvent<HostToWebview>) => {
    if (event.data?.type === "frontmatter") {
      apply(event.data.fields);
    }
    if (event.data?.type === "imageMap") {
      Object.assign(deps.imageMap, event.data.map);
      if (coverSrc && !isCoverColor(coverSrc)) {
        void refreshSrc(coverSrc);
      }
    }
    if (event.data?.type === "imageUploaded" && event.data.src) {
      deps.imageMap[event.data.src] = event.data.webviewUri;
    }
    if (event.data?.type === "imageResolved" && event.data.src && event.data.webviewUri) {
      deps.imageMap[event.data.src] = event.data.webviewUri;
      if (event.data.src === coverSrc || event.data.src.replace(/^\.\//, "") === coverSrc.replace(/^\.\//, "")) {
        coverImg.src = event.data.webviewUri;
      }
    }
  });

  function buildSwatches(): void {
    swatchesEl.replaceChildren();
    for (const swatch of COVER_COLORS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cover-swatch";
      btn.title = swatch.label;
      btn.setAttribute("aria-label", swatch.label);
      btn.style.background = swatch.hex;
      btn.addEventListener("click", () => {
        selectColor(swatch.hex);
      });
      swatchesEl.appendChild(btn);
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

  function toggleMenu(open: boolean, anchor: HTMLElement): void {
    menuOpen = open;
    menuEl.hidden = !open;
    addBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if (!open) {
      const wrap = addBtn.closest(".cover-add-wrap");
      if (wrap && menuEl.parentElement !== wrap) {
        wrap.appendChild(menuEl);
      }
      menuEl.classList.remove("cover-menu-floating");
      menuEl.style.top = "";
      menuEl.style.left = "";
      return;
    }
    if (anchor === changeBtn) {
      pageEl.appendChild(menuEl);
      menuEl.classList.add("cover-menu-floating");
      const rect = changeBtn.getBoundingClientRect();
      const pageRect = pageEl.getBoundingClientRect();
      menuEl.style.top = `${rect.bottom - pageRect.top + pageEl.scrollTop + 6}px`;
      menuEl.style.left = `${Math.max(8, rect.right - pageRect.left - 220)}px`;
    } else {
      const wrap = addBtn.closest(".cover-add-wrap");
      if (wrap) {
        wrap.appendChild(menuEl);
      }
      menuEl.classList.remove("cover-menu-floating");
      menuEl.style.top = "";
      menuEl.style.left = "";
    }
  }

  function closeMenu(): void {
    if (!menuOpen) {
      return;
    }
    toggleMenu(false, addBtn);
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

  return { apply };
}

function parsePosition(value: string | undefined): number {
  const n = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(n)) {
    return DEFAULT_POSITION;
  }
  return clamp(n, 0, 100);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
