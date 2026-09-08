export type ReaderTheme = "light" | "dark";

const THEME_KEY = "slash-md-theme";

export function currentTheme(): ReaderTheme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function applyReaderTheme(theme: ReaderTheme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.dataset.theme = theme;
}

function savedTheme(): ReaderTheme | null {
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    return saved === "light" || saved === "dark" ? saved : null;
  } catch {
    return null;
  }
}

/** Follow the OS while the user has not picked a theme explicitly. */
export function bindSystemTheme(): void {
  if (typeof window.matchMedia !== "function") {
    return;
  }
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", (event) => {
    if (savedTheme()) {
      return;
    }
    applyReaderTheme(event.matches ? "dark" : "light");
    paintThemeToggle();
  });
}

export function toggleTheme(): void {
  const next: ReaderTheme = currentTheme() === "dark" ? "light" : "dark";
  applyReaderTheme(next);
  try {
    window.localStorage.setItem(THEME_KEY, next);
  } catch {
    // Private browsing etc. — theme still applies for the session.
  }
  paintThemeToggle();
}

export function paintThemeToggle(): void {
  const button = document.querySelector<HTMLButtonElement>("[data-toggle-theme]");
  if (!button) {
    return;
  }
  const dark = currentTheme() === "dark";
  button.textContent = dark ? "☀︎" : "☾";
  button.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  button.title = dark ? "Switch to light theme" : "Switch to dark theme";
}
