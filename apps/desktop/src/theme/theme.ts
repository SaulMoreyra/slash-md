import type { AppTheme } from "../../shared/api";
import { ThemeSource } from "./enums";

export type { AppTheme };

export function getThemeSnapshot(): AppTheme {
  const fromDom = document.documentElement.dataset.theme;
  if (fromDom === "light" || fromDom === "dark") {
    return fromDom;
  }
  const initial = window.__SLASHMD_INITIAL_THEME__;
  if (initial === "light" || initial === "dark") {
    return initial;
  }
  if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "dark";
}

export function applyTheme(theme: AppTheme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.dataset.theme = theme;
  document.body.classList.toggle("vscode-dark", theme === "dark");
  document.body.classList.toggle("vscode-light", theme === "light");
}

export function resolveThemeSource(): ThemeSource {
  if (window.__SLASHMD_INITIAL_THEME__ === "light" || window.__SLASHMD_INITIAL_THEME__ === "dark") {
    return ThemeSource.User;
  }
  return ThemeSource.Os;
}
