const STORAGE_KEY = "slashmd-theme";

export type AppTheme = "light" | "dark";

type Listener = () => void;

const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getStoredTheme(): AppTheme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function getThemeSnapshot(): AppTheme {
  const fromDom = document.documentElement.dataset.theme;
  if (fromDom === "light" || fromDom === "dark") {
    return fromDom;
  }
  return getStoredTheme() ?? "dark";
}

export function applyTheme(theme: AppTheme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.dataset.theme = theme;
  document.body.classList.toggle("vscode-dark", theme === "dark");
  document.body.classList.toggle("vscode-light", theme === "light");
  notify();
}

/** Persist and apply. OS theme updates are ignored after the user chooses. */
export function setTheme(theme: AppTheme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore quota / private mode */
  }
  applyTheme(theme);
}

export function resolveTheme(fallback: AppTheme): AppTheme {
  return getStoredTheme() ?? fallback;
}

export function subscribeTheme(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
