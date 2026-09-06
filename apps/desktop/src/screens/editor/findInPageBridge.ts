let openFind: (() => void) | null = null;
let closeFind: (() => void) | null = null;

export function registerFindInPageOpener(fn: () => void): () => void {
  openFind = fn;
  return () => {
    if (openFind === fn) {
      openFind = null;
    }
  };
}

export function registerFindInPageCloser(fn: () => void): () => void {
  closeFind = fn;
  return () => {
    if (closeFind === fn) {
      closeFind = null;
    }
  };
}

export function requestOpenFindInPage(): void {
  openFind?.();
}

export function requestCloseFindInPage(): void {
  closeFind?.();
}
